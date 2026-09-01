import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  commentAutomations,
  deliveryAttempts,
  instagramAccounts,
  InsertUser,
  pendingLinkConfirmations,
  users,
  webhookEvents,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { assertCanActivate, resetForReapproval } from "./automationGuards";

let _db: ReturnType<typeof drizzle> | null = null;

export function setDatabaseForTesting(database: ReturnType<typeof drizzle> | null) {
  if (process.env.NODE_ENV === "production") throw new Error("Test database injection is unavailable in production");
  _db = database;
}

export function canActivateAutomation(reviewStatus: "draft" | "approved") {
  return reviewStatus === "approved";
}

export function isDuplicateEventError(error: unknown) {
  return error instanceof Error && /(duplicate|unique)/i.test(error.message);
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      const normalized = user[field] ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function ensureLocalAdmin(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  await db.insert(users).values({
    openId: "local-admin",
    name: "Administrador",
    email,
    loginMethod: "local",
    role: "admin",
    lastSignedIn: now,
  }).onDuplicateKeyUpdate({
    set: { name: "Administrador", email, loginMethod: "local", role: "admin", lastSignedIn: now },
  });
  const user = await getUserByOpenId("local-admin");
  if (!user) throw new Error("Unable to initialize local administrator");
  return user;
}

export async function getDashboardData(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const [accounts, automations] = await Promise.all([
    db.select().from(instagramAccounts).where(eq(instagramAccounts.userId, userId)).orderBy(desc(instagramAccounts.createdAt)),
    db.select().from(commentAutomations).where(eq(commentAutomations.userId, userId)).orderBy(desc(commentAutomations.updatedAt)),
  ]);

  const automationIds = automations.map(automation => automation.id);
  const events = automationIds.length
    ? await db
        .select()
        .from(webhookEvents)
        .where(inArray(webhookEvents.automationId, automationIds))
        .orderBy(desc(webhookEvents.receivedAt))
        .limit(10)
    : [];

  const eventIds = events.map(event => event.id);
  const deliveries = eventIds.length
    ? await db
        .select()
        .from(deliveryAttempts)
        .where(inArray(deliveryAttempts.webhookEventId, eventIds))
        .orderBy(desc(deliveryAttempts.attemptedAt))
    : [];

  return { accounts, automations, events, deliveries };
}

export async function createAutomation(input: {
  userId: number;
  instagramAccountId: number;
  name: string;
  reelId: string;
  reelLabel?: string;
  reelPermalink?: string;
  reelThumbnailUrl?: string;
  commentKeyword?: string;
  normalizedKeyword?: string;
  blockedWords?: string[];
  promptMessage: string;
  confirmationLabel: string;
  publicReplyMessage?: string;
  publicReplyOptions?: string[];
  messageBody: string;
  linkUrl: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const account = await db
    .select({ id: instagramAccounts.id })
    .from(instagramAccounts)
    .where(and(eq(instagramAccounts.id, input.instagramAccountId), eq(instagramAccounts.userId, input.userId)))
    .limit(1);
  if (!account[0]) throw new Error("Instagram account not found");

  const result = await db.insert(commentAutomations).values(input);
  return result;
}

export async function setAutomationStatus(input: {
  userId: number;
  automationId: number;
  status: "active" | "paused" | "archived";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const existing = await db
    .select({ id: commentAutomations.id, reviewStatus: commentAutomations.reviewStatus })
    .from(commentAutomations)
    .where(and(eq(commentAutomations.id, input.automationId), eq(commentAutomations.userId, input.userId)))
    .limit(1);
  if (!existing[0]) throw new Error("Automation not found");
  if (input.status === "active") assertCanActivate(existing[0].reviewStatus);

  await db
    .update(commentAutomations)
    .set({ status: input.status })
    .where(and(eq(commentAutomations.id, input.automationId), eq(commentAutomations.userId, input.userId)));
}

export async function approveAutomation(userId: number, automationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(commentAutomations)
    .set({ reviewStatus: "approved", approvedAt: new Date(), status: "paused" })
    .where(and(eq(commentAutomations.id, automationId), eq(commentAutomations.userId, userId)));
}

export async function updateAutomation(input: {
  userId: number;
  automationId: number;
  name: string;
  reelId: string;
  reelLabel?: string;
  reelPermalink?: string;
  reelThumbnailUrl?: string;
  commentKeyword?: string;
  normalizedKeyword?: string;
  blockedWords?: string[];
  promptMessage: string;
  confirmationLabel: string;
  publicReplyMessage?: string;
  publicReplyOptions?: string[];
  messageBody: string;
  linkUrl: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.update(commentAutomations).set({
    name: input.name,
    reelId: input.reelId,
    reelLabel: input.reelLabel || null,
    reelPermalink: input.reelPermalink || null,
    reelThumbnailUrl: input.reelThumbnailUrl || null,
    commentKeyword: input.commentKeyword || null,
    normalizedKeyword: input.normalizedKeyword || null,
    blockedWords: input.blockedWords?.length ? input.blockedWords : null,
    promptMessage: input.promptMessage,
    confirmationLabel: input.confirmationLabel,
    publicReplyMessage: input.publicReplyMessage || null,
    publicReplyOptions: input.publicReplyOptions?.length ? input.publicReplyOptions : null,
    messageBody: input.messageBody,
    linkUrl: input.linkUrl,
    ...resetForReapproval(),
  }).where(and(eq(commentAutomations.id, input.automationId), eq(commentAutomations.userId, input.userId)));
  if (result[0]?.affectedRows !== 1) throw new Error("Automation not found");
}

export async function createMetaOAuthState(userId: number, stateHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { metaOAuthStates } = await import("../drizzle/schema");
  await db.insert(metaOAuthStates).values({ userId, stateHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
}

export async function consumeMetaOAuthState(rawState: string) {
  const { hashState } = await import("./meta");
  const { metaOAuthStates } = await import("../drizzle/schema");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const stateHash = hashState(rawState);
  const state = await db.select().from(metaOAuthStates).where(and(eq(metaOAuthStates.stateHash, stateHash), isNull(metaOAuthStates.consumedAt), gt(metaOAuthStates.expiresAt, new Date()))).limit(1);
  if (!state[0]) return null;
  const result = await db.update(metaOAuthStates).set({ consumedAt: new Date() }).where(and(eq(metaOAuthStates.id, state[0].id), isNull(metaOAuthStates.consumedAt)));
  return result[0]?.affectedRows === 1 ? state[0].userId : null;
}

export async function storeInstagramAccount(input: {
  userId: number;
  instagramUserId: string;
  username: string;
  accountType: "business" | "creator";
  encryptedAccessToken: string;
  tokenExpiresAt: Date | null;
  grantedScopes: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(instagramAccounts).values({ ...input, connectionStatus: "connected" }).onDuplicateKeyUpdate({ set: { userId: input.userId, username: input.username, accountType: input.accountType, encryptedAccessToken: input.encryptedAccessToken, tokenExpiresAt: input.tokenExpiresAt, grantedScopes: input.grantedScopes, connectionStatus: "connected" } });
}

export async function findAccountByInstagramUserId(instagramUserId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const accounts = await db.select().from(instagramAccounts).where(eq(instagramAccounts.instagramUserId, instagramUserId)).limit(1);
  return accounts[0] ?? null;
}

export async function findEligibleAutomation(instagramAccountId: number, reelId: string, commentText: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const candidates = await db.select().from(commentAutomations).where(and(eq(commentAutomations.instagramAccountId, instagramAccountId), eq(commentAutomations.reelId, reelId), eq(commentAutomations.status, "active"), eq(commentAutomations.reviewStatus, "approved"))).orderBy(desc(commentAutomations.updatedAt));
  const normalizedComment = commentText.normalize("NFKC").toLocaleLowerCase("pt-BR");
  return candidates.find(automation => !automation.normalizedKeyword || normalizedComment.includes(automation.normalizedKeyword)) ?? null;
}

export async function getAutomationById(automationId: number, instagramAccountId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const automation = await db.select().from(commentAutomations).where(and(eq(commentAutomations.id, automationId), eq(commentAutomations.instagramAccountId, instagramAccountId))).limit(1);
  return automation[0] ?? null;
}

export async function getInstagramAccountForUser(userId: number, instagramAccountId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const account = await db.select().from(instagramAccounts).where(and(eq(instagramAccounts.id, instagramAccountId), eq(instagramAccounts.userId, userId), eq(instagramAccounts.connectionStatus, "connected"))).limit(1);
  if (!account[0]) throw new Error("Connected Instagram account not found");
  return account[0];
}

export async function createPendingLinkConfirmation(input: {
  confirmationKey: string;
  automationId: number;
  instagramAccountId: number;
  commentWebhookEventId: number;
  commenterId: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(pendingLinkConfirmations).values({ ...input, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
}

export async function markPendingConfirmationFailed(commentWebhookEventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(pendingLinkConfirmations).set({ status: "failed" }).where(and(eq(pendingLinkConfirmations.commentWebhookEventId, commentWebhookEventId), eq(pendingLinkConfirmations.status, "pending")));
}

export async function claimConfirmedLink(input: { confirmationKey: string; instagramAccountId: number; commenterId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = new Date();
  const result = await db.update(pendingLinkConfirmations).set({ status: "confirmed", confirmedAt: now }).where(and(
    eq(pendingLinkConfirmations.confirmationKey, input.confirmationKey),
    eq(pendingLinkConfirmations.instagramAccountId, input.instagramAccountId),
    eq(pendingLinkConfirmations.commenterId, input.commenterId),
    eq(pendingLinkConfirmations.status, "pending"),
    gt(pendingLinkConfirmations.expiresAt, now),
  ));
  if (result[0]?.affectedRows !== 1) return null;
  const confirmation = await db.select().from(pendingLinkConfirmations).where(eq(pendingLinkConfirmations.confirmationKey, input.confirmationKey)).limit(1);
  return confirmation[0] ?? null;
}

export async function markConfirmedLinkFailed(confirmationKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(pendingLinkConfirmations).set({ status: "failed" }).where(and(eq(pendingLinkConfirmations.confirmationKey, confirmationKey), eq(pendingLinkConfirmations.status, "confirmed")));
}

export async function recordWebhookEvent(input: {
  eventKey: string;
  instagramAccountId: number;
  automationId?: number;
  commentId?: string;
  commenterId?: string;
  reelId?: string;
  commentText?: string;
  commentCreatedAt?: Date | null;
  selectedPublicReply?: string | null;
  rawPayload: Record<string, unknown>;
  signatureVerified: boolean;
  processingStatus: "matched" | "skipped";
  skipReason: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  try {
    const result = await db.insert(webhookEvents).values({ ...input, automationId: input.automationId ?? null, commenterId: input.commenterId ?? null, commentId: input.commentId ?? null, reelId: input.reelId ?? null, commentText: input.commentText ?? null, commentCreatedAt: input.commentCreatedAt ?? null, selectedPublicReply: input.selectedPublicReply ?? null });
    const rows = await db.select().from(webhookEvents).where(eq(webhookEvents.id, Number(result[0].insertId))).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    if (isDuplicateEventError(error)) return null;
    throw error;
  }
}

export async function updateWebhookEvent(webhookEventId: number, values: { processingStatus: "sent" | "failed" | "skipped"; skipReason: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(webhookEvents).set({ ...values, processedAt: new Date() }).where(eq(webhookEvents.id, webhookEventId));
}

export async function recordDeliverySuccess(input: { webhookEventId: number; automationId: number; providerMessageId: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(deliveryAttempts).values({ ...input, deliveryStatus: "sent", sentAt: new Date() });
}

export async function recordDeliveryFailure(input: { webhookEventId: number; automationId: number; failureCode: string; failureMessage: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(deliveryAttempts).values({ ...input, deliveryStatus: "failed" });
}
