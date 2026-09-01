import { describe, expect, it } from "vitest";
import type { Express } from "express";
import { registerAppConfigRoute } from "./appConfig";

describe("platform logo configuration", () => {
  it("returns the configured CommentLoom logo from the lightweight app-config endpoint", () => {
    let handler: ((req: unknown, res: { status: (code: number) => { json: (value: unknown) => void } }) => void) | undefined;
    const app = { get: (_path: string, route: typeof handler) => { handler = route; } } as unknown as Express;
    registerAppConfigRoute(app);
    let status = 0;
    let body: unknown;
    handler?.({}, { status: code => ({ json: value => { status = code; body = value; } }) });
    expect(status).toBe(200);
    expect(body).toMatchObject({ appLogo: "/manus-storage/commentloom-logo_9f622f4b.svg" });
  });
});
