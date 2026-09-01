import { describe, expect, it } from "vitest";
import type { Express } from "express";
import { registerAppConfigRoute } from "./appConfig";

describe("Instagram Login secret configuration", () => {
  it("reports a configured integration through the lightweight public configuration endpoint without exposing secrets", () => {
    let handler: ((req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => void) | undefined;
    const app = { get: (_path: string, route: typeof handler) => { handler = route; } } as unknown as Express;
    registerAppConfigRoute(app);
    let body: unknown;
    handler?.({}, { status: () => ({ json: value => { body = value; } }) });
    expect(body).toMatchObject({ instagramLoginConfigured: true });
    expect(JSON.stringify(body)).not.toContain(process.env.META_INSTAGRAM_APP_SECRET || "__missing__");
  });
});
