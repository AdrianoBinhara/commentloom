import { describe, expect, it } from "vitest";
import { hashLocalPassword, verifyLocalPassword } from "./localAuth";

describe("local administrator password", () => {
  it("accepts the password used to derive its scrypt hash and rejects another password", async () => {
    const hash = await hashLocalPassword("a-long-private-password", "test-salt-for-commentloom");
    expect(await verifyLocalPassword("a-long-private-password", hash)).toBe(true);
    expect(await verifyLocalPassword("another-private-password", hash)).toBe(false);
  });

  it("rejects malformed password hashes without throwing", async () => {
    await expect(verifyLocalPassword("a-long-private-password", "invalid")).resolves.toBe(false);
  });
});
