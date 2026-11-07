import { describe, expect, it } from "vitest";
import { MAX_HEIGHT, readEmbedMessage, RESIZE_MESSAGE } from "./protocol";

describe("readEmbedMessage", () => {
  it("accepts a resize message with a good height", () => {
    expect(readEmbedMessage({ type: RESIZE_MESSAGE, height: 812 })).toEqual({ type: RESIZE_MESSAGE, height: 812 });
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
});
