import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { callbackUrl, choosePublicReply, requestOrigin } from "./metaRoutes";

function request(headers: Record<string, string | undefined> = {}): Request {
  return {
    protocol: "http",
    get: (name: string) => headers[name.toLowerCase()],
  } as Request;
}

afterEach(() => {
  delete process.env.PUBLIC_BASE_URL;
});

describe("Meta OAuth callback origin", () => {
  it("uses the fixed public HTTPS origin when configured", () => {
    process.env.PUBLIC_BASE_URL = "https://commentloom.com/";
    expect(requestOrigin(request({ host: "internal:3000", "x-forwarded-proto": "http" }))).toBe("https://commentloom.com");
    expect(callbackUrl(request({ host: "internal:3000" }))).toBe("https://commentloom.com/api/meta/oauth/callback");
  });

  it("uses the forwarded HTTPS protocol when no fixed origin exists", () => {
    expect(callbackUrl(request({ host: "commentloom.com", "x-forwarded-proto": "https" }))).toBe("https://commentloom.com/api/meta/oauth/callback");
  });

  it("rejects a non-HTTPS configured origin", () => {
    process.env.PUBLIC_BASE_URL = "http://commentloom.com";
    expect(() => requestOrigin(request())).toThrow("PUBLIC_BASE_URL must use HTTPS");
  });

  it("selects one configured public reply and falls back to the legacy response", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.8);
    expect(choosePublicReply(["Opção A", "Opção B", "Opção C"], "Legado")).toBe("Opção C");
    expect(choosePublicReply([], "Legado")).toBe("Legado");
    expect(choosePublicReply([], null)).toBeNull();
    random.mockRestore();
  });
});
