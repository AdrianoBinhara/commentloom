ALTER TABLE `comment_automations` ADD `publicReplyOptions` json;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD `selectedPublicReply` text;