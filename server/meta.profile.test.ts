import { afterEach, describe, expect, it, vi } from "vitest";
import { getInstagramProfile, subscribeAccountToComments } from "./meta";

afterEach(() => vi.unstubAllGlobals());

describe("Instagram profile and webhook subscription", () => {
  it("normalizes the official MEDIA_CREATOR account type to creator", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ user_id: "123", username: "creator", account_type: "MEDIA_CREATOR" }), { status: 200 })));
    await expect(getInstagramProfile("token")).resolves.toEqual({ instagramUserId: "123", username: "creator", accountType: "creator" });
  });

  it("subscribes explicitly to comment notifications", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await subscribeAccountToComments("123", "token");
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
    expect(options.body).toBe("subscribed_fields=comments");
  });
});
