import { randomBytes } from "node:crypto";
import type { Express, Request, Response } from "express";
import { claimConfirmedLink, consumeMetaOAuthState, createMetaOAuthState, createPendingLinkConfirmation, findAccountByInstagramUserId, findEligibleAutomation, getAutomationById, markConfirmedLinkFailed, markPendingConfirmationFailed, recordDeliveryFailure, recordDeliverySuccess, recordWebhookEvent, storeInstagramAccount, updateWebhookEvent } from "./db";
import { createOAuthState, encryptToken, exchangeAuthorizationCode, getAuthorizationUrl, getInstagramCommentDetails, getInstagramProfile, isValidMetaSignature, replyToInstagramComment, sendDirectMessage, sendPrivateReply, subscribeAccountToComments, verifyWebhookToken } from "./meta";
import { commentMatchesKeyword, extractCommentEvents, extractConfirmationEvents, findBlockedWord, privateReplyPolicyBlockReason } from "./metaWebhook";
import { sdk } from "./_core/sdk";
import { processPrivateReplyOnce } from "./privateReplyFlow";

export function requestOrigin(req: Request) {
  const configuredOrigin = process.env.PUBLIC_BASE_URL?.trim();
  if (configuredOrigin) {
    const configuredUrl = new URL(configuredOrigin);
    if (configuredUrl.protocol !== "https:") throw new Error("PUBLIC_BASE_URL must use HTTPS");
    return configuredUrl.origin;
  }
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto === "https" ? "https" : req.protocol;
  return `${protocol}://${req.get("host")}`;
}

export function callbackUrl(req: Request) {
  return `${requestOrigin(req)}/api/meta/oauth/callback`;
}

export function choosePublicReply(options: string[] | null | undefined, fallback: string | null) {
  const candidates = (options?.length ? options : [fallback || ""]).map(value => value.trim()).filter(Boolean);
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)] || null;
}

function redirectWithStatus(res: Response, value: "connected" | "cancelled" | "error") {
  return res.redirect(`/configuracao?meta=${value}`);
}

async function processCommentEvent(event: ReturnType<typeof extractCommentEvents>[number]) {
  const account = await findAccountByInstagramUserId(event.instagramUserId);
  if (!account || account.connectionStatus !== "connected") return;
  const details = event.commentCreatedAt ? null : await getInstagramCommentDetails({ commentId: event.commentId, encryptedAccessToken: account.encryptedAccessToken }).catch(() => null);
  const commentCreatedAt = event.commentCreatedAt ?? details?.createdAt ?? undefined;
  const commentText = event.commentText || details?.commentText || "";
  const commenterId = event.commenterId ?? details?.commenterId ?? undefined;
  const reelId = event.reelId || details?.reelId || "";
  const policyBlockReason = privateReplyPolicyBlockReason(commentCreatedAt);
  const automation = policyBlockReason || !reelId ? null : await findEligibleAutomation(account.id, reelId, commentText);
  const blockedWord = automation ? findBlockedWord(commentText, automation.blockedWords) : null;
  const selectedPublicReply = choosePublicReply(automation?.publicReplyOptions, automation?.publicReplyMessage ?? null);
  const eventRecord = await recordWebhookEvent({
    ...event,
    commentText,
    commenterId,
    reelId,
    instagramAccountId: account.id,
    automationId: automation?.id,
    commentCreatedAt: commentCreatedAt ?? null,
    selectedPublicReply,
    signatureVerified: true,
    processingStatus: automation && commenterId && !blockedWord ? "matched" : "skipped",
    skipReason: policyBlockReason || (blockedWord ? "Comment contains a blocked word" : automation ? "Commenter identity is unavailable" : "No approved active automation matched this comment"),
  });
  if (!eventRecord || policyBlockReason || blockedWord || !automation || !commenterId || !commentMatchesKeyword(commentText, automation.normalizedKeyword)) return;

  const confirmationKey = randomBytes(24).toString("base64url");
  await createPendingLinkConfirmation({ confirmationKey, automationId: automation.id, instagramAccountId: account.id, commentWebhookEventId: eventRecord.id, commenterId });
  if (selectedPublicReply) {
    await replyToInstagramComment({ commentId: event.commentId, encryptedAccessToken: account.encryptedAccessToken, message: selectedPublicReply }).catch((error: unknown) => console.error("[Meta Comment Reply] Public reply failed", error));
  }
  await processPrivateReplyOnce({
    claim: async () => eventRecord,
    send: async () => sendPrivateReply({
      instagramUserId: account.instagramUserId,
      encryptedAccessToken: account.encryptedAccessToken,
      commentId: event.commentId,
      message: automation.promptMessage,
      quickReplies: [{ title: automation.confirmationLabel, payload: `commentloom:confirm:${confirmationKey}` }],
    }),
    markSent: async (webhookEvent, result) => {
      await recordDeliverySuccess({ webhookEventId: webhookEvent.id, automationId: automation.id, providerMessageId: result.message_id });
      await updateWebhookEvent(webhookEvent.id, { processingStatus: "sent", skipReason: "Awaiting link confirmation" });
    },
    markFailed: async (webhookEvent, error) => {
      await markPendingConfirmationFailed(webhookEvent.id);
      await updateWebhookEvent(webhookEvent.id, { processingStatus: "failed", skipReason: error instanceof Error ? error.message.slice(0, 255) : "Meta invitation was not delivered" });
    },
  });
}

async function processConfirmationEvent(event: ReturnType<typeof extractConfirmationEvents>[number]) {
  const account = await findAccountByInstagramUserId(event.instagramUserId);
  if (!account || account.connectionStatus !== "connected") return;
  const received = await recordWebhookEvent({
    eventKey: event.eventKey,
    instagramAccountId: account.id,
    commenterId: event.commenterId,
    rawPayload: event.rawPayload,
    signatureVerified: true,
    processingStatus: "matched",
    skipReason: null,
  });
  if (!received) return;
  const confirmation = await claimConfirmedLink({ confirmationKey: event.confirmationKey, instagramAccountId: account.id, commenterId: event.commenterId });
  if (!confirmation) {
    await updateWebhookEvent(received.id, { processingStatus: "skipped", skipReason: "Confirmation was expired, invalid, or already consumed" });
    return;
  }
  const automation = await getAutomationById(confirmation.automationId, account.id);
  if (!automation || automation.reviewStatus !== "approved" || automation.status !== "active") {
    await updateWebhookEvent(received.id, { processingStatus: "skipped", skipReason: "Automation is no longer approved and active" });
    return;
  }
  await processPrivateReplyOnce({
    claim: async () => received,
    send: async () => sendDirectMessage({
      instagramUserId: account.instagramUserId,
      encryptedAccessToken: account.encryptedAccessToken,
      recipientId: event.commenterId,
      message: `${automation.messageBody}\n\n${automation.linkUrl}`.trim(),
    }),
    markSent: async (webhookEvent, result) => {
      await recordDeliverySuccess({ webhookEventId: webhookEvent.id, automationId: automation.id, providerMessageId: result.message_id });
      await updateWebhookEvent(webhookEvent.id, { processingStatus: "sent", skipReason: null });
    },
    markFailed: async (webhookEvent, error) => {
      const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown Meta delivery error";
      await markConfirmedLinkFailed(confirmation.confirmationKey);
      await recordDeliveryFailure({ webhookEventId: webhookEvent.id, automationId: automation.id, failureCode: "META_SEND_FAILED", failureMessage: message });
      await updateWebhookEvent(webhookEvent.id, { processingStatus: "failed", skipReason: "Confirmed link was not delivered" });
    },
  });
}

export function registerMetaRoutes(app: Express) {
  app.get("/api/meta/oauth/start", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) throw new Error("Managed session required");
      const { plainState, stateHash } = createOAuthState();
      await createMetaOAuthState(user.id, stateHash);
      res.redirect(getAuthorizationUrl(callbackUrl(req), plainState));
    } catch (error) {
      console.error("[Meta OAuth] Unable to start authorization", error);
      redirectWithStatus(res, "error");
    }
  });

  app.get("/api/meta/oauth/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    if (req.query.error || !code || !state) return redirectWithStatus(res, "cancelled");
    try {
      const userId = await consumeMetaOAuthState(state);
      if (!userId) return redirectWithStatus(res, "error");
      const token = await exchangeAuthorizationCode(code, callbackUrl(req));
      const profile = await getInstagramProfile(token.access_token);
      await subscribeAccountToComments(profile.instagramUserId, token.access_token);
      const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;
      await storeInstagramAccount({ userId, ...profile, encryptedAccessToken: encryptToken(token.access_token), tokenExpiresAt: expiresAt, grantedScopes: "instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages" });
      redirectWithStatus(res, "connected");
    } catch (error) {
      console.error("[Meta OAuth] Authorization callback failed", error);
      redirectWithStatus(res, "error");
    }
  });

  app.get("/api/meta/webhook", (req, res) => {
    const mode = typeof req.query["hub.mode"] === "string" ? req.query["hub.mode"] : undefined;
    const token = typeof req.query["hub.verify_token"] === "string" ? req.query["hub.verify_token"] : undefined;
    const challenge = typeof req.query["hub.challenge"] === "string" ? req.query["hub.challenge"] : undefined;
    if (mode === "subscribe" && challenge && verifyWebhookToken(token)) return res.status(200).send(challenge);
    return res.sendStatus(403);
  });

  app.post("/api/meta/webhook", async (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    if (!rawBody.length || !isValidMetaSignature(rawBody, req.get("x-hub-signature-256"))) return res.sendStatus(401);
    let payload: unknown;
    try { payload = JSON.parse(rawBody.toString("utf8")); } catch { return res.sendStatus(400); }
    const events = [...extractCommentEvents(payload), ...extractConfirmationEvents(payload)];
    for (const event of events) {
      const task = "commentId" in event ? processCommentEvent(event) : processConfirmationEvent(event);
      await task.catch(error => console.error("[Meta Webhook] Event processing failed", error));
    }
    return res.sendStatus(200);
  });
}
