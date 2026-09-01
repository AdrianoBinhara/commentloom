import { describe, expect, it } from "vitest";
import type { Express } from "express";
import { registerOAuthRoutes } from "./_core/oauth";

describe("managed sign-in callback", () => {
  it("rejects an incomplete callback before any external token exchange", async () => {
    let handler: ((req: { query: Record<string, unknown> }, res: { status: (code: number) => { json: (value: unknown) => void } }) => Promise<unknown>) | undefined;
    const app = { get: (_path: string, route: typeof handler) => { handler = route; } } as unknown as Express;
    registerOAuthRoutes(app);
    let status = 0; let body: unknown;
    await handler?.({ query: {} }, { status: code => ({ json: value => { status = code; body = value; } }) });
    expect(status).toBe(400);
    expect(body).toEqual({ error: "code and state are required" });
  });
});
