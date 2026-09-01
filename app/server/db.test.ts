import { afterEach, describe, expect, it } from "vitest";
import { deliveryAttempts, webhookEvents } from "../drizzle/schema";
import { recordDeliverySuccess, recordWebhookEvent, setAutomationStatus, setDatabaseForTesting, updateAutomation } from "./db";
import { processPrivateReplyOnce } from "./privateReplyFlow";

type CapturedUpdate = Record<string, unknown> | null;

function mockDatabase(options: { reviewStatus?: "draft" | "approved"; duplicateInsert?: boolean } = {}) {
  let capturedUpdate: CapturedUpdate = null;
  const database = {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [{ id: 9, reviewStatus: options.reviewStatus ?? "draft" }] }),
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => {
        capturedUpdate = values;
        return { where: async () => [{ affectedRows: 1 }] };
      },
    }),
    insert: () => ({
      values: async () => {
        if (options.duplicateInsert) throw new Error("Duplicate entry for webhook_events_comment_id_unique");
        return [{ insertId: 1 }];
      },
    }),
  };
  return { database, getCapturedUpdate: () => capturedUpdate };
}

function webhookDeliveryDatabase() {
  let eventCreated = false;
  const deliveries: Array<{ webhookEventId: number; providerMessageId: string }> = [];
  const event = { id: 42 };
  const database = {
    insert: (table: unknown) => ({
      values: async (values: Record<string, unknown>) => {
        if (table === webhookEvents) {
          if (eventCreated) throw new Error("Duplicate entry for webhook_events_comment_id_unique");
          eventCreated = true;
          return [{ insertId: 42 }];
        }
        if (table === deliveryAttempts) {
          deliveries.push({ webhookEventId: Number(values.webhookEventId), providerMessageId: String(values.providerMessageId) });
          return [{ insertId: 99 }];
        }
        throw new Error("Unexpected table insertion");
      },
    }),
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({ limit: async () => table === webhookEvents && eventCreated ? [event] : [] }),
      }),
    }),
  };
  return { database, deliveries };
}

afterEach(() => setDatabaseForTesting(null));

describe("database-backed automation safeguards", () => {
  it("blocks the actual activation service when the persisted review state is draft", async () => {
    const fake = mockDatabase({ reviewStatus: "draft" });
    setDatabaseForTesting(fake.database as never);

    await expect(setAutomationStatus({ userId: 1, automationId: 9, status: "active" })).rejects.toThrow("Automation must be approved before activation");
  });

  it("resets the persisted automation to draft and paused when the actual update service edits it", async () => {
    const fake = mockDatabase({ reviewStatus: "approved" });
    setDatabaseForTesting(fake.database as never);

    await updateAutomation({ userId: 1, automationId: 9, name: "Atualizado", reelId: "reel-1", reelLabel: "Reel de teste", commentKeyword: "quero", normalizedKeyword: "quero", messageBody: "Aqui está o link", linkUrl: "https://example.com/link" });

    expect(fake.getCapturedUpdate()).toMatchObject({ reviewStatus: "draft", status: "paused", approvedAt: null, name: "Atualizado" });
  });

  it("returns no claim from the actual event recorder when the database rejects a repeated comment", async () => {
    const fake = mockDatabase({ duplicateInsert: true });
    setDatabaseForTesting(fake.database as never);

    const result = await recordWebhookEvent({ eventKey: "comment:repeat", instagramAccountId: 1, commentId: "repeat", reelId: "reel-1", commentText: "Quero", commentCreatedAt: new Date(), rawPayload: {}, signatureVerified: true, processingStatus: "matched", skipReason: null });

    expect(result).toBeNull();
  });

  it("uses real claim and delivery persistence helpers to prevent a second delivery for a repeated comment", async () => {
    const fake = webhookDeliveryDatabase();
    setDatabaseForTesting(fake.database as never);
    const claim = () => recordWebhookEvent({ eventKey: "comment:once", instagramAccountId: 1, commentId: "once", reelId: "reel-1", commentText: "Quero", commentCreatedAt: new Date(), rawPayload: {}, signatureVerified: true, processingStatus: "matched", skipReason: null });
    const first = await processPrivateReplyOnce({
      claim,
      send: async () => ({ message_id: "meta-message-1" }),
      markSent: async (event, result) => recordDeliverySuccess({ webhookEventId: event.id, automationId: 4, providerMessageId: result.message_id }),
      markFailed: async () => undefined,
    });
    const second = await processPrivateReplyOnce({
      claim,
      send: async () => ({ message_id: "meta-message-2" }),
      markSent: async (event, result) => recordDeliverySuccess({ webhookEventId: event.id, automationId: 4, providerMessageId: result.message_id }),
      markFailed: async () => undefined,
    });

    expect(first).toEqual({ status: "sent" });
    expect(second).toEqual({ status: "deduplicated" });
    expect(fake.deliveries).toEqual([{ webhookEventId: 42, providerMessageId: "meta-message-1" }]);
  });
});
