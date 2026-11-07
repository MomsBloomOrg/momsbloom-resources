import { describe, expect, it } from "vitest";
import { keywordWords, matchesWords, normalizeText } from "./search";

describe("keyword search", () => {
  const text = normalizeText("Lactation and feeding · Breastfeeding support (Español)");

  it("ignores case, accents, and extra spaces", () => {
    expect(normalizeText("  Español   CLASS ")).toBe("espanol class");
  });

  it("matches part of a word", () => {
    expect(matchesWords(text, keywordWords("lact"))).toBe(true);
  });

  it("needs every word", () => {
    expect(matchesWords(text, keywordWords("breastfeeding espanol"))).toBe(true);
    expect(matchesWords(text, keywordWords("breastfeeding yoga"))).toBe(false);
  });

  it("an empty keyword matches everything", () => {
    expect(keywordWords("   ")).toEqual([]);
    expect(matchesWords(text, [])).toBe(true);
  });
});
