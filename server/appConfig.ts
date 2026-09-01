import type { Express } from "express";

export function getPublicAppConfig() {
  return {
    appTitle: process.env.VITE_APP_TITLE || "CommentLoom",
    appLogo: process.env.VITE_APP_LOGO || null,
    instagramLoginConfigured: Boolean(process.env.META_INSTAGRAM_APP_ID && process.env.META_INSTAGRAM_APP_SECRET && process.env.META_WEBHOOK_VERIFY_TOKEN),
    publicBaseUrl: process.env.PUBLIC_BASE_URL || null,
  } as const;
}

export function registerAppConfigRoute(app: Express) {
  app.get("/api/app-config", (_req, res) => res.status(200).json(getPublicAppConfig()));
}
