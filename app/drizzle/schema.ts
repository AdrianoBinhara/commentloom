import {
  boolean,
  datetime,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the Manus OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const instagramAccounts = mysqlTable(
  "instagram_accounts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    instagramUserId: varchar("instagramUserId", { length: 128 }).notNull(),
    username: varchar("username", { length: 255 }).notNull(),
    accountType: mysqlEnum("accountType", ["business", "creator"]).notNull(),
    encryptedAccessToken: text("encryptedAccessToken").notNull(),
    tokenExpiresAt: datetime("tokenExpiresAt", { mode: "date" }),
    grantedScopes: text("grantedScopes"),
    connectionStatus: mysqlEnum("connectionStatus", ["connected", "invalid", "revoked"]).default("connected").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("instagram_accounts_instagram_user_id_unique").on(table.instagramUserId),
    index("instagram_accounts_user_id_idx").on(table.userId),
  ],
);

export const commentAutomations = mysqlTable(
  "comment_automations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    instagramAccountId: int("instagramAccountId").notNull().references(() => instagramAccounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    reelId: varchar("reelId", { length: 128 }).notNull(),
    reelLabel: varchar("reelLabel", { length: 255 }),
    reelPermalink: varchar("reelPermalink", { length: 2048 }),
    reelThumbnailUrl: varchar("reelThumbnailUrl", { length: 2048 }),
    commentKeyword: varchar("commentKeyword", { length: 512 }),
    normalizedKeyword: varchar("normalizedKeyword", { length: 512 }),
    blockedWords: json("blockedWords").$type<string[]>(),
    promptMessage: text("promptMessage").notNull(),
    confirmationLabel: varchar("confirmationLabel", { length: 20 }).notNull().default("Quero o link"),
    publicReplyMessage: text("publicReplyMessage"),
    publicReplyOptions: json("publicReplyOptions").$type<string[]>(),
    messageBody: text("messageBody").notNull(),
    linkUrl: varchar("linkUrl", { length: 2048 }).notNull(),
    reviewStatus: mysqlEnum("reviewStatus", ["draft", "approved"]).default("draft").notNull(),
    status: mysqlEnum("status", ["active", "paused", "archived"]).default("paused").notNull(),
    approvedAt: datetime("approvedAt", { mode: "date" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("comment_automations_account_reel_idx").on(table.instagramAccountId, table.reelId),
    index("comment_automations_user_status_idx").on(table.userId, table.status),
  ],
);

export const webhookEvents = mysqlTable(
  "webhook_events",
  {
    id: int("id").autoincrement().primaryKey(),
    eventKey: varchar("eventKey", { length: 255 }).notNull(),
    instagramAccountId: int("instagramAccountId").references(() => instagramAccounts.id, { onDelete: "set null" }),
    automationId: int("automationId").references(() => commentAutomations.id, { onDelete: "set null" }),
    commentId: varchar("commentId", { length: 128 }),
    commenterId: varchar("commenterId", { length: 128 }),
    reelId: varchar("reelId", { length: 128 }),
    commentText: text("commentText"),
    commentCreatedAt: datetime("commentCreatedAt", { mode: "date" }),
    selectedPublicReply: text("selectedPublicReply"),
    signatureVerified: boolean("signatureVerified").notNull().default(false),
    processingStatus: mysqlEnum("processingStatus", ["received", "matched", "skipped", "sent", "failed"]).default("received").notNull(),
    skipReason: varchar("skipReason", { length: 255 }),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    processedAt: datetime("processedAt", { mode: "date" }),
    rawPayload: json("rawPayload"),
  },
  table => [
    uniqueIndex("webhook_events_event_key_unique").on(table.eventKey),
    uniqueIndex("webhook_events_comment_id_unique").on(table.commentId),
    index("webhook_events_account_received_idx").on(table.instagramAccountId, table.receivedAt),
  ],
);

export const deliveryAttempts = mysqlTable(
  "delivery_attempts",
  {
    id: int("id").autoincrement().primaryKey(),
    webhookEventId: int("webhookEventId").notNull().references(() => webhookEvents.id, { onDelete: "cascade" }),
    automationId: int("automationId").references(() => commentAutomations.id, { onDelete: "set null" }),
    providerMessageId: varchar("providerMessageId", { length: 255 }),
    deliveryStatus: mysqlEnum("deliveryStatus", ["queued", "sent", "failed", "skipped"]).default("queued").notNull(),
    failureCode: varchar("failureCode", { length: 128 }),
    failureMessage: text("failureMessage"),
    attemptedAt: timestamp("attemptedAt").defaultNow().notNull(),
    sentAt: datetime("sentAt", { mode: "date" }),
  },
  table => [
    uniqueIndex("delivery_attempts_webhook_event_unique").on(table.webhookEventId),
    index("delivery_attempts_status_attempted_idx").on(table.deliveryStatus, table.attemptedAt),
  ],
);

export const pendingLinkConfirmations = mysqlTable(
  "pending_link_confirmations",
  {
    id: int("id").autoincrement().primaryKey(),
    confirmationKey: varchar("confirmationKey", { length: 96 }).notNull(),
    automationId: int("automationId").notNull().references(() => commentAutomations.id, { onDelete: "cascade" }),
    instagramAccountId: int("instagramAccountId").notNull().references(() => instagramAccounts.id, { onDelete: "cascade" }),
    commentWebhookEventId: int("commentWebhookEventId").notNull().references(() => webhookEvents.id, { onDelete: "cascade" }),
    commenterId: varchar("commenterId", { length: 128 }).notNull(),
    status: mysqlEnum("status", ["pending", "confirmed", "declined", "expired", "failed"]).default("pending").notNull(),
    expiresAt: datetime("expiresAt", { mode: "date" }).notNull(),
    confirmedAt: datetime("confirmedAt", { mode: "date" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("pending_link_confirmations_key_unique").on(table.confirmationKey),
    uniqueIndex("pending_link_confirmations_comment_event_unique").on(table.commentWebhookEventId),
    index("pending_link_confirmations_lookup_idx").on(table.confirmationKey, table.status, table.expiresAt),
    index("pending_link_confirmations_commenter_idx").on(table.instagramAccountId, table.commenterId),
  ],
);

export const metaOAuthStates = mysqlTable(
  "meta_oauth_states",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    stateHash: varchar("stateHash", { length: 64 }).notNull(),
    expiresAt: datetime("expiresAt", { mode: "date" }).notNull(),
    consumedAt: datetime("consumedAt", { mode: "date" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("meta_oauth_states_state_hash_unique").on(table.stateHash),
    index("meta_oauth_states_user_expiry_idx").on(table.userId, table.expiresAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type InstagramAccount = typeof instagramAccounts.$inferSelect;
export type CommentAutomation = typeof commentAutomations.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type DeliveryAttempt = typeof deliveryAttempts.$inferSelect;
export type PendingLinkConfirmation = typeof pendingLinkConfirmations.$inferSelect;
