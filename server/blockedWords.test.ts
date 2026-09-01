import { describe, expect, it } from "vitest";
import { findBlockedWord } from "./metaWebhook";

describe("blocked comment words", () => {
  it("matches blocked words without case or unicode variation", () => {
    expect(findBlockedWord("Como REBOLAR de lentilhõ", ["rebolar", "ofensa"])).toBe("rebolar");
  });
  it("allows a comment when no blocked term is present", () => {
    expect(findBlockedWord("Quero receber o material", ["ofensa"])).toBeNull();
  });
});
