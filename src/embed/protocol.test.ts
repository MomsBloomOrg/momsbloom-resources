import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOCATION_MESSAGE, MAX_HEIGHT, MAX_SEARCH_LENGTH, HOST_QUERY_KEYS, PROGRAM_ID_PATTERN, readEmbedMessage, RESIZE_MESSAGE, SCROLL_MESSAGE } from "./protocol";

describe("readEmbedMessage", () => {
  it("accepts a resize message with a good height", () => {
    expect(readEmbedMessage({ type: RESIZE_MESSAGE, height: 812 })).toEqual({ type: RESIZE_MESSAGE, height: 812 });
  });

  it("accepts a scroll message with a good top", () => {
    expect(readEmbedMessage({ type: SCROLL_MESSAGE, top: 0 })).toEqual({ type: SCROLL_MESSAGE, top: 0 });
  });

  it.each([
    ["a negative top", { type: SCROLL_MESSAGE, top: -1 }],
    ["a top that is too large", { type: SCROLL_MESSAGE, top: MAX_HEIGHT + 1 }],
    ["a top that is NaN", { type: SCROLL_MESSAGE, top: Number.NaN }],
    ["a top that is text", { type: SCROLL_MESSAGE, top: "0" }],
  ])("refuses %s", (_name, data) => {
    expect(readEmbedMessage(data)).toBeNull();
  });

  it.each([
    ["not an object", "hello"],
    ["null", null],
    ["another type", { type: "something-else", height: 10 }],
    ["a height that is text", { type: RESIZE_MESSAGE, height: "812" }],
    ["a negative height", { type: RESIZE_MESSAGE, height: -1 }],
    ["a height that is too large", { type: RESIZE_MESSAGE, height: MAX_HEIGHT + 1 }],
    ["NaN", { type: RESIZE_MESSAGE, height: Number.NaN }],
  ])("refuses %s", (_name, data) => {
    expect(readEmbedMessage(data)).toBeNull();
  });

  it("accepts a location message with and without a Program", () => {
    const good = { type: LOCATION_MESSAGE, search: "q=yoga&zip=49508", program: null };
    expect(readEmbedMessage(good)).toEqual(good);
    expect(readEmbedMessage({ ...good, program: "P-101" })).toEqual({ ...good, program: "P-101" });
    expect(readEmbedMessage({ ...good, program: "42" })).toEqual({ ...good, program: "42" });
  });

  it.each([
    ["a search that is too long", { search: "q=".padEnd(MAX_SEARCH_LENGTH + 1, "a"), program: null }],
    ["a search that is not text", { search: 5, program: null }],
    ["a Program ID with bad characters", { search: "", program: "P-1&mbr-q=x" }],
    ["a Program ID that is too long", { search: "", program: "P".repeat(41) }],
    ["a Program ID that is not text", { search: "", program: 7 }],
    ["no program field", { search: "" }],
  ])("refuses a location message with %s", (_name, rest) => {
    expect(readEmbedMessage({ type: LOCATION_MESSAGE, ...rest })).toBeNull();
  });
});

describe("public/embed.js agrees with protocol.ts", () => {
  const script = readFileSync("public/embed.js", "utf8");

  it("has the same key list", () => {
    const match = script.match(/var KEYS = (\[.*?\]);/);
    expect(JSON.parse(match![1])).toEqual([...HOST_QUERY_KEYS]);
  });

  it("has the same Program ID pattern and message names", () => {
    expect(script).toContain(`var PROGRAM_ID = ${PROGRAM_ID_PATTERN};`);
    expect(script).toContain(`"${LOCATION_MESSAGE}"`);
  });
});
