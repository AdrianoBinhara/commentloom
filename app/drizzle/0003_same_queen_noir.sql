CREATE TABLE `pending_link_confirmations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`confirmationKey` varchar(96) NOT NULL,
	`automationId` int NOT NULL,
	`instagramAccountId` int NOT NULL,
	`commentWebhookEventId` int NOT NULL,
	`commenterId` varchar(128) NOT NULL,
	`status` enum('pending','confirmed','declined','expired','failed') NOT NULL DEFAULT 'pending',
	`expiresAt` datetime NOT NULL,
	`confirmedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pending_link_confirmations_id` PRIMARY KEY(`id`),
	CONSTRAINT `pending_link_confirmations_key_unique` UNIQUE(`confirmationKey`),
	CONSTRAINT `pending_link_confirmations_comment_event_unique` UNIQUE(`commentWebhookEventId`)
);
--> statement-breakpoint
ALTER TABLE `comment_automations` ADD `reelPermalink` varchar(2048);--> statement-breakpoint
ALTER TABLE `comment_automations` ADD `reelThumbnailUrl` varchar(2048);--> statement-breakpoint
ALTER TABLE `comment_automations` ADD `promptMessage` text;--> statement-breakpoint
UPDATE `comment_automations` SET `promptMessage` = 'Obrigada pelo comentário. Posso te enviar o link?' WHERE `promptMessage` IS NULL;--> statement-breakpoint
ALTER TABLE `comment_automations` MODIFY `promptMessage` text NOT NULL;--> statement-breakpoint
ALTER TABLE `comment_automations` ADD `confirmationLabel` varchar(20) DEFAULT 'Quero o link' NOT NULL;--> statement-breakpoint
ALTER TABLE `pending_link_confirmations` ADD CONSTRAINT `plc_automation_fk` FOREIGN KEY (`automationId`) REFERENCES `comment_automations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pending_link_confirmations` ADD CONSTRAINT `plc_account_fk` FOREIGN KEY (`instagramAccountId`) REFERENCES `instagram_accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pending_link_confirmations` ADD CONSTRAINT `plc_webhook_event_fk` FOREIGN KEY (`commentWebhookEventId`) REFERENCES `webhook_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pending_link_confirmations_lookup_idx` ON `pending_link_confirmations` (`confirmationKey`,`status`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `pending_link_confirmations_commenter_idx` ON `pending_link_confirmations` (`instagramAccountId`,`commenterId`);
