import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENTS, EVENT_MESSAGE, MAX_PARAM_LENGTH, REDACT_STRIP, LOCATION_MESSAGE, safeKeyword, MAX_HEIGHT, MAX_SEARCH_LENGTH, HOST_QUERY_KEYS, HOST_CUSTOM_KEY, PROGRAM_ID_PATTERN, readEmbedMessage, RESIZE_MESSAGE, SCROLL_MESSAGE } from "./protocol";

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

describe("event messages", () => {
  const good = { type: EVENT_MESSAGE, name: "directory_search", params: { search_term: "yoga", result_count: 4 } };

  it("accepts a good event", () => {
    expect(readEmbedMessage(good)).toEqual(good);
    expect(readEmbedMessage({ type: EVENT_MESSAGE, name: "program_view", params: { program_id: "P-101" } })).not.toBeNull();
  });

  it.each([
    ["an unknown name", { ...good, name: "purchase" }],
    ["a name from the object prototype", { ...good, name: "toString" }],
    ["an extra param key", { ...good, params: { search_term: "yoga", zip: "49508" } }],
    ["a param key that belongs to another event", { ...good, params: { program_id: "P-1" } }],
    ["a long string", { ...good, params: { search_term: "a".repeat(101) } }],
    ["a count that is NaN", { ...good, params: { result_count: Number.NaN } }],
    ["a negative count", { ...good, params: { result_count: -1 } }],
    ["a param that is an object", { ...good, params: { search_term: { a: 1 } } }],
    ["no params", { type: EVENT_MESSAGE, name: "directory_search" }],
  ])("refuses an event with %s", (_name, data) => {
    expect(readEmbedMessage(data)).toBeNull();
  });
});

describe("safeKeyword", () => {
  it.each([
    ["yoga", "yoga"],
    ["  yoga  ", "yoga"],
    ["jane@example.com", "(redacted)"],
    ["616-555-1234", "(redacted)"],
    ["49508", "(redacted)"],
    ["doula 49508", "(redacted)"],
    ["616/555/1234", "(redacted)"],
    ["0-3 months", "0-3 months"],
    ["6-12 months", "6-12 months"],
    ["ages 0-5", "ages 0-5"],
    ["a".repeat(150), "a".repeat(100)],
  ])("turns %j into %j", (input, output) => {
    expect(safeKeyword(input)).toBe(output);
  });
});

describe("public/embed.js agrees with protocol.ts", () => {
  const script = readFileSync("public/embed.js", "utf8");

  it("has the same key list", () => {
    const match = script.match(/var KEYS = (\[.*?\]);/);
    expect(JSON.parse(match![1])).toEqual([...HOST_QUERY_KEYS]);
  });

  it("has the same custom filter key pattern", () => {
    expect(script).toContain(`var CUSTOM_KEY = ${HOST_CUSTOM_KEY};`);
  });

  it("has the same Program ID pattern and message names", () => {
    expect(script).toContain(`var PROGRAM_ID = ${PROGRAM_ID_PATTERN};`);
    expect(script).toContain(`"${LOCATION_MESSAGE}"`);
    expect(script).toContain(`"${EVENT_MESSAGE}"`);
  });

  it("has the same value limit and redaction pattern", () => {
    expect(script).toContain(`var MAX_VALUE = ${MAX_PARAM_LENGTH};`);
    expect(script).toContain(`var REDACT_STRIP = ${REDACT_STRIP};`);
  });

  it("has the same event names and parameter keys", () => {
    const match = script.match(/var EVENTS = (\{[\s\S]*?\});/);
    expect(JSON.parse(match![1])).toEqual(ANALYTICS_EVENTS);
  });
});
