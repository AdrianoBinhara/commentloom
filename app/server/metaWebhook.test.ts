import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { assertCanActivate, resetForReapproval } from "./automationGuards";
import { isDuplicateEventError } from "./db";
import { processClaimedOnce } from "./idempotency";
import { decryptToken, encryptToken, isValidMetaSignature, verifyWebhookToken } from "./meta";
import { commentMatchesKeyword, extractCommentEvents, extractConfirmationEvents, privateReplyPolicyBlockReason } from "./metaWebhook";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Meta webhook controls", () => {
  it("accepts only a valid HMAC SHA-256 signature", () => {
    process.env.META_INSTAGRAM_APP_SECRET = "integration-secret";
    const body = Buffer.from('{"object":"instagram"}');
    const digest = createHmac("sha256", "integration-secret").update(body).digest("hex");

    expect(isValidMetaSignature(body, `sha256=${digest}`)).toBe(true);
    expect(isValidMetaSignature(body, "sha256=0".repeat(32))).toBe(false);
    expect(isValidMetaSignature(body, `sha256=${"z".repeat(64)}`)).toBe(false);
  });

  it("checks webhook verification token without accepting a partial match", () => {
    process.env.META_INSTAGRAM_APP_ID = "123";
    process.env.META_INSTAGRAM_APP_SECRET = "secret";
    process.env.META_WEBHOOK_VERIFY_TOKEN = "long-random-token";

    expect(verifyWebhookToken("long-random-token")).toBe(true);
    expect(verifyWebhookToken("long-random")).toBe(false);
  });

  it("encrypts a stored access token before persistence and restores it only server-side", () => {
    process.env.JWT_SECRET = "test-only-session-secret";
    const encrypted = encryptToken("sensitive-access-token");

    expect(encrypted).not.toContain("sensitive-access-token");
    expect(decryptToken(encrypted)).toBe("sensitive-access-token");
  });

  it("extracts only complete Instagram comment changes", () => {
    const events = extractCommentEvents({
      entry: [
        {
          id: "ig-professional-1",
          changes: [
            { field: "comments", value: { id: "comment-1", text: "Quero o link", from: { id: "commenter-1" }, media: { id: "reel-1", media_product_type: "REELS" } } },
            { field: "mentions", value: { id: "ignored", media: { id: "reel-1" } } },
          ],
        },
      ],
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ eventKey: "comment:comment-1", instagramUserId: "ig-professional-1", reelId: "reel-1", commentText: "Quero o link" });
  });

  it("extracts a valid quick-reply confirmation and ignores unrelated messages", () => {
    const events = extractConfirmationEvents({
      entry: [{
        id: "ig-professional-1",
        messaging: [
          { sender: { id: "commenter-1" }, message: { mid: "mid-confirmed", quick_reply: { payload: "commentloom:confirm:one-time-key" } } },
          { sender: { id: "commenter-2" }, message: { mid: "mid-ignored", quick_reply: { payload: "another-app:confirm:no" } } },
        ],
      }],
    });

    expect(events).toEqual([expect.objectContaining({
      eventKey: "confirmation:mid-confirmed",
      instagramUserId: "ig-professional-1",
      commenterId: "commenter-1",
      confirmationKey: "one-time-key",
    })]);
  });

  it("treats a missing keyword as a match and normalizes a configured keyword", () => {
    expect(commentMatchesKeyword("Qualquer comentário", null)).toBe(true);
    expect(commentMatchesKeyword("EU QUERO o material", "quero")).toBe(true);
    expect(commentMatchesKeyword("Gostei muito", "quero")).toBe(false);
  });

  it("blocks a private reply without a trusted timestamp or after seven days", () => {
    const now = new Date("2026-08-27T12:00:00.000Z");
    const recent = new Date("2026-08-21T12:00:00.000Z");
    const expired = new Date("2026-08-20T11:59:59.000Z");

    expect(privateReplyPolicyBlockReason(undefined, now)).toBe("Comment creation time is unavailable");
    expect(privateReplyPolicyBlockReason(recent, now)).toBeNull();
    expect(privateReplyPolicyBlockReason(expired, now)).toBe("Comment exceeds the seven-day private reply window");
  });

  it("uses a stable comment identity and recognizes duplicate delivery attempts", async () => {
    const payload = { entry: [{ id: "ig-1", changes: [{ field: "comments", value: { id: "same-comment", media: { id: "reel-1" } } }] }] };
    const first = extractCommentEvents(payload)[0];
    const retry = extractCommentEvents(payload)[0];

    expect(first?.eventKey).toBe("comment:same-comment");
    expect(retry?.eventKey).toBe(first?.eventKey);
    expect(isDuplicateEventError(new Error("Duplicate entry for webhook_events_comment_id_unique"))).toBe(true);
    expect(isDuplicateEventError(new Error("Network timeout"))).toBe(false);

    const claimedEventIds = new Set<string>();
    const deliveries: string[] = [];
    const claim = async () => claimedEventIds.has("comment:same-comment") ? null : (claimedEventIds.add("comment:same-comment"), "comment:same-comment");
    const firstResult = await processClaimedOnce(claim, async eventId => { deliveries.push(eventId); });
    const retryResult = await processClaimedOnce(claim, async eventId => { deliveries.push(eventId); });
    expect(firstResult).toEqual({ processed: true });
    expect(retryResult).toEqual({ processed: false });
    expect(deliveries).toEqual(["comment:same-comment"]);
  });

  it("allows activation only after approval, including after an edited flow is reset to draft", () => {
    expect(() => assertCanActivate("approved")).not.toThrow();
    expect(() => assertCanActivate("draft")).toThrow("Automation must be approved before activation");
    expect(resetForReapproval()).toEqual({ reviewStatus: "draft", status: "paused", approvedAt: null });
    expect(() => assertCanActivate(resetForReapproval().reviewStatus)).toThrow("Automation must be approved before activation");
  });
});
