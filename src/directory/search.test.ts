import { describe, expect, it } from "vitest";
import { highlightRanges, keywordWords, matchesWords, normalizeText } from "./search";

describe("highlightRanges", () => {
  it("ignores case and marks part of a word", () => {
    expect(highlightRanges("Lactation help", ["lact"])).toEqual([[0, 4]]);
  });
  it("ignores accents but keeps original positions", () => {
    expect(highlightRanges("Un café bon", ["cafe"])).toEqual([[3, 7]]);
  });
  it("merges overlapping ranges", () => {
    expect(highlightRanges("Lactation", ["lact", "actation"])).toEqual([[0, 9]]);
  });
  it("marks every occurrence", () => {
    expect(highlightRanges("yoga and Yoga", ["yoga"])).toEqual([[0, 4], [9, 13]]);
  });
  it("gives [] for no words, a missing word, or a 1-letter word", () => {
    expect(highlightRanges("Lactation", [])).toEqual([]);
    expect(highlightRanges("Lactation", ["zzz"])).toEqual([]);
    expect(highlightRanges("Lactation", ["a"])).toEqual([]);
  });
});

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
