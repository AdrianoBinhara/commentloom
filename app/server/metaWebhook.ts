import { createHash } from "node:crypto";

export type InstagramCommentEvent = {
  eventKey: string;
  instagramUserId: string;
  commentId: string;
  commenterId?: string;
  commentText: string;
  commentCreatedAt?: Date;
  reelId: string;
  rawPayload: Record<string, unknown>;
};

export type InstagramConfirmationEvent = {
  eventKey: string;
  instagramUserId: string;
  commenterId: string;
  confirmationKey: string;
  rawPayload: Record<string, unknown>;
};

type WebhookPayload = {
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        id?: string;
        text?: string;
        created_time?: number | string;
        from?: { id?: string };
        media?: { id?: string; media_product_type?: string };
      };
    }>;
    messaging?: Array<{
      sender?: { id?: string };
      message?: { mid?: string; quick_reply?: { payload?: string } };
      postback?: { mid?: string; payload?: string };
    }>;
  }>;
};

export function extractCommentEvents(payload: unknown): InstagramCommentEvent[] {
  const typed = payload as WebhookPayload;
  if (!Array.isArray(typed?.entry)) return [];

  return typed.entry.flatMap(entry =>
    (entry.changes ?? []).flatMap(change => {
      const value = change.value;
      if (change.field !== "comments" || !entry.id || !value?.id || !value.media?.id) return [];
      return [{
        eventKey: `comment:${value.id}`,
        instagramUserId: entry.id,
        commentId: value.id,
        commenterId: value.from?.id,
        commentText: value.text ?? "",
        commentCreatedAt: parseMetaTimestamp(value.created_time),
        reelId: value.media.id,
        rawPayload: entry as unknown as Record<string, unknown>,
      }];
    }),
  );
}

export function extractConfirmationEvents(payload: unknown): InstagramConfirmationEvent[] {
  const typed = payload as WebhookPayload;
  if (!Array.isArray(typed?.entry)) return [];
  return typed.entry.flatMap(entry => (entry.messaging ?? []).flatMap(event => {
    const payloadValue = event.message?.quick_reply?.payload ?? event.postback?.payload;
    const messageId = event.message?.mid ?? event.postback?.mid;
    const commenterId = event.sender?.id;
    if (!entry.id || !commenterId || !messageId || !payloadValue?.startsWith("commentloom:confirm:")) return [];
    const confirmationKey = payloadValue.slice("commentloom:confirm:".length);
    if (!confirmationKey) return [];
    return [{ eventKey: `confirmation:${messageId}`, instagramUserId: entry.id, commenterId, confirmationKey, rawPayload: entry as unknown as Record<string, unknown> }];
  }));
}

function parseMetaTimestamp(value: number | string | undefined) {
  const seconds = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) return undefined;
  return new Date(seconds * 1000);
}

export function commentMatchesKeyword(commentText: string, normalizedKeyword: string | null) {
  if (!normalizedKeyword) return true;
  return commentText.normalize("NFKC").toLocaleLowerCase("pt-BR").includes(normalizedKeyword);
}

export function findBlockedWord(commentText: string, blockedWords: string[] | null | undefined) {
  const normalizedComment = commentText.normalize("NFKC").toLocaleLowerCase("pt-BR");
  return (blockedWords ?? [])
    .map(word => word.normalize("NFKC").toLocaleLowerCase("pt-BR").trim())
    .find(word => word.length > 0 && normalizedComment.includes(word)) ?? null;
}

export function privateReplyPolicyBlockReason(commentCreatedAt: Date | undefined, now = new Date()) {
  if (!commentCreatedAt || Number.isNaN(commentCreatedAt.getTime())) return "Comment creation time is unavailable";
  const age = now.getTime() - commentCreatedAt.getTime();
  if (age < 0) return "Comment creation time is invalid";
  if (age > 7 * 24 * 60 * 60 * 1000) return "Comment exceeds the seven-day private reply window";
  return null;
}

export function fallbackEventKey(rawBody: Buffer) {
  return `payload:${createHash("sha256").update(rawBody).digest("hex")}`;
}
