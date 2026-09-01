import { describe, expect, it } from "vitest";
import type { Express } from "express";
import { registerAppConfigRoute } from "./appConfig";
import { callbackUrl } from "./metaRoutes";

describe("public OAuth origin", () => {
  it("returns the configured public base through the lightweight configuration endpoint", () => {
    let handler: ((req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => void) | undefined;
    const app = { get: (_path: string, route: typeof handler) => { handler = route; } } as unknown as Express;
    registerAppConfigRoute(app);
    let body: unknown;
    handler?.({}, { status: () => ({ json: value => { body = value; } }) });
    expect(body).toMatchObject({ publicBaseUrl: "https://commentloom.com" });
  });

  it("uses the public base even when Cloud Run supplies an internal Host header", () => {
    const request = { protocol: "https", get: (name: string) => name === "host" ? "npqy7ebnqi-oj6762jnca-ue.a.run.app" : "https" } as never;
    expect(callbackUrl(request)).toBe("https://commentloom.com/api/meta/oauth/callback");
  });
});
