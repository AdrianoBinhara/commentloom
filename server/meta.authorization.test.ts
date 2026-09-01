import { describe, expect, it } from "vitest";
import { getAuthorizationUrl } from "./meta";

describe("Instagram authorization URL", () => {
  it("keeps the public Instagram callback in the final authorization request", () => {
    const authorizationUrl = new URL(getAuthorizationUrl("https://commentloom.com/api/meta/oauth/callback", "state-value"));
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe("https://commentloom.com/api/meta/oauth/callback");
    expect(authorizationUrl.searchParams.get("client_id")).toBe(process.env.META_INSTAGRAM_APP_ID);
    expect(authorizationUrl.searchParams.get("scope")).toContain("instagram_business_manage_comments");
  });
});
