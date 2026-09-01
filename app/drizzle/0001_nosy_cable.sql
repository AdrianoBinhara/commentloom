CREATE TABLE `comment_automations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`instagramAccountId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`reelId` varchar(128) NOT NULL,
	`reelLabel` varchar(255),
	`commentKeyword` varchar(512),
	`normalizedKeyword` varchar(512),
	`messageBody` text NOT NULL,
	`linkUrl` varchar(2048) NOT NULL,
	`reviewStatus` enum('draft','approved') NOT NULL DEFAULT 'draft',
	`status` enum('active','paused','archived') NOT NULL DEFAULT 'paused',
	`approvedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comment_automations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookEventId` int NOT NULL,
	`automationId` int,
	`providerMessageId` varchar(255),
	`deliveryStatus` enum('queued','sent','failed','skipped') NOT NULL DEFAULT 'queued',
	`failureCode` varchar(128),
	`failureMessage` text,
	`attemptedAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` datetime,
	CONSTRAINT `delivery_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_attempts_webhook_event_unique` UNIQUE(`webhookEventId`)
);
--> statement-breakpoint
CREATE TABLE `instagram_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`instagramUserId` varchar(128) NOT NULL,
	`username` varchar(255) NOT NULL,
	`accountType` enum('business','creator') NOT NULL,
	`encryptedAccessToken` text NOT NULL,
	`tokenExpiresAt` datetime,
	`grantedScopes` text,
	`connectionStatus` enum('connected','invalid','revoked') NOT NULL DEFAULT 'connected',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `instagram_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `instagram_accounts_instagram_user_id_unique` UNIQUE(`instagramUserId`)
);
--> statement-breakpoint
CREATE TABLE `meta_oauth_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stateHash` varchar(64) NOT NULL,
	`expiresAt` datetime NOT NULL,
	`consumedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meta_oauth_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `meta_oauth_states_state_hash_unique` UNIQUE(`stateHash`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventKey` varchar(255) NOT NULL,
	`instagramAccountId` int,
	`automationId` int,
	`commentId` varchar(128),
	`commenterId` varchar(128),
	`reelId` varchar(128),
	`commentText` text,
	`signatureVerified` boolean NOT NULL DEFAULT false,
	`processingStatus` enum('received','matched','skipped','sent','failed') NOT NULL DEFAULT 'received',
	`skipReason` varchar(255),
	`receivedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` datetime,
	`rawPayload` json,
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_events_event_key_unique` UNIQUE(`eventKey`),
	CONSTRAINT `webhook_events_comment_id_unique` UNIQUE(`commentId`)
);
--> statement-breakpoint
ALTER TABLE `comment_automations` ADD CONSTRAINT `comment_automations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_automations` ADD CONSTRAINT `comment_automations_instagramAccountId_instagram_accounts_id_fk` FOREIGN KEY (`instagramAccountId`) REFERENCES `instagram_accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_attempts` ADD CONSTRAINT `delivery_attempts_webhookEventId_webhook_events_id_fk` FOREIGN KEY (`webhookEventId`) REFERENCES `webhook_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_attempts` ADD CONSTRAINT `delivery_attempts_automationId_comment_automations_id_fk` FOREIGN KEY (`automationId`) REFERENCES `comment_automations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `instagram_accounts` ADD CONSTRAINT `instagram_accounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `meta_oauth_states` ADD CONSTRAINT `meta_oauth_states_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD CONSTRAINT `webhook_events_instagramAccountId_instagram_accounts_id_fk` FOREIGN KEY (`instagramAccountId`) REFERENCES `instagram_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD CONSTRAINT `webhook_events_automationId_comment_automations_id_fk` FOREIGN KEY (`automationId`) REFERENCES `comment_automations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `comment_automations_account_reel_idx` ON `comment_automations` (`instagramAccountId`,`reelId`);--> statement-breakpoint
CREATE INDEX `comment_automations_user_status_idx` ON `comment_automations` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `delivery_attempts_status_attempted_idx` ON `delivery_attempts` (`deliveryStatus`,`attemptedAt`);--> statement-breakpoint
CREATE INDEX `instagram_accounts_user_id_idx` ON `instagram_accounts` (`userId`);--> statement-breakpoint
CREATE INDEX `meta_oauth_states_user_expiry_idx` ON `meta_oauth_states` (`userId`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `webhook_events_account_received_idx` ON `webhook_events` (`instagramAccountId`,`receivedAt`);