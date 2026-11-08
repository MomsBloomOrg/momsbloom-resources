// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOT_PLACED, addressKey } from "@/admin/geocode";
import { useLastGoodPin, type Pin } from "./last-good-pin";
import { shouldLookUp, useMapPointLookup } from "./use-map-point-lookup";

const loaded = { streetAddress: "1 Example Way", city: "Sampletown", state: "MI", zip: "48000" };
const lastKey = addressKey(loaded);

describe("shouldLookUp", () => {
  it("never looks up a blank street", () => {
    expect(shouldLookUp({ ...loaded, streetAddress: null }, null)).toBe(false);
    expect(shouldLookUp({ ...loaded, streetAddress: null }, lastKey)).toBe(false);
  });

  it("does not look up the address it looked up or loaded last", () => {
    expect(shouldLookUp({ ...loaded }, lastKey)).toBe(false);
  });

  it("looks up a changed street, city, state, or ZIP", () => {
    expect(shouldLookUp({ ...loaded, streetAddress: "2 Example Way" }, lastKey)).toBe(true);
    expect(shouldLookUp({ ...loaded, city: "Othertown" }, lastKey)).toBe(true);
    expect(shouldLookUp({ ...loaded, state: null }, lastKey)).toBe(true);
    expect(shouldLookUp({ ...loaded, zip: "48001" }, lastKey)).toBe(true);
  });

  it("does not look up a suite-only change", () => {
    const withSuite = { ...loaded, suite: "Suite 200" };
    expect(shouldLookUp(withSuite, lastKey)).toBe(false);
  });
});

type SaveState = { status: string; latitude?: number | null; longitude?: number | null };
const IDLE: SaveState = { status: "idle" };
const NO_PIN: Pin = { latitude: null, longitude: null };

/** The address and coordinates parts of the Admin forms: uncontrolled inputs, the coordinates keyed on the pin. */
function Harness({ street = loaded.streetAddress, pin: initial = NO_PIN, onLoad = false, state = IDLE }: { street?: string; pin?: Pin; onLoad?: boolean; state?: SaveState }) {
  const [pin, setPin] = useLastGoodPin(initial, state);
  const lookup = useMapPointLookup(setPin, onLoad);
  const input = (name: string, value: string | number | null | undefined, key?: string) => h("input", { name, key, "aria-label": name, defaultValue: value ?? "" });
  const pinKey = `${pin.latitude}|${pin.longitude}`;
  return h(
    "form",
    null,
    h("div", { ref: lookup.ref, onBlur: lookup.onBlur }, input("streetAddress", street), input("suite", ""), input("city", loaded.city), input("state", loaded.state), input("zip", loaded.zip)),
    input("latitude", pin.latitude, `lat-${pinKey}`),
    input("longitude", pin.longitude, `lng-${pinKey}`),
    h("p", { "data-testid": "notice" }, lookup.notice ?? ""),
    h("button", { type: "button" }, "Other field"),
  );
}

// Each fetch waits until the test answers it.
let answers: { url: string; signal: AbortSignal; answer: (body: unknown) => Promise<void> }[] = [];
beforeEach(() => {
  answers = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (url: string, init: { signal: AbortSignal }) =>
        new Promise((resolve) => {
          answers.push({ url, signal: init.signal, answer: (body) => act(async () => resolve({ ok: true, json: async () => body })) });
        }),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const changeStreet = (value: string) => {
  fireEvent.change(field("streetAddress"), { target: { value } });
  fireEvent.blur(field("zip"), { relatedTarget: screen.getByRole("button") }); // focus leaves the address fields
};
const point = (latitude: number, longitude: number) => ({ latitude, longitude });

describe("useMapPointLookup", () => {
  it("looks up once on load and fills an empty point", async () => {
    render(h(Harness, { onLoad: true }));
    expect(answers).toHaveLength(1);
    expect(new URL(answers[0].url, "http://x").searchParams.get("street")).toBe(loaded.streetAddress);
    await answers[0].answer(point(42.7, -84.5));
    expect(field("latitude").value).toBe("42.7");
    expect(field("longitude").value).toBe("-84.5");
  });

  it("makes no call on load without the flag, or when focus moves inside the address fields", () => {
    render(h(Harness));
    fireEvent.change(field("streetAddress"), { target: { value: "2 Example Way" } });
    fireEvent.blur(field("streetAddress"), { relatedTarget: field("city") });
    expect(answers).toHaveLength(0);
  });

  it("keeps coordinates that staff typed while the lookup ran", async () => {
    render(h(Harness, { onLoad: true }));
    fireEvent.change(field("latitude"), { target: { value: "40.1" } });
    await answers[0].answer(point(42.7, -84.5));
    expect(field("latitude").value).toBe("40.1");
    expect(field("longitude").value).toBe("");
  });

  it("drops a stale reply when the address changed again", async () => {
    render(h(Harness));
    changeStreet("2 Example Way");
    changeStreet("3 Example Way");
    expect(answers).toHaveLength(2);
    expect(answers[0].signal.aborted).toBe(true);
    await answers[1].answer(point(43, -85));
    await answers[0].answer(point(41, -83)); // arrives late, after the newer one
    expect(field("latitude").value).toBe("43");
  });

  it("blanks the point and shows NOT_PLACED on no match", async () => {
    render(h(Harness, { pin: point(42.9, -85.6) }));
    changeStreet("1 Nowhere Road");
    await answers[0].answer({ point: null });
    expect(field("latitude").value).toBe("");
    expect(screen.getByTestId("notice").textContent).toBe(NOT_PLACED);
  });

  it("keeps the lookup's point after a save, while the page still holds the save's state", async () => {
    const { rerender } = render(h(Harness));
    const saved: SaveState = { status: "saved", latitude: 42.1, longitude: -85.1 };
    rerender(h(Harness, { state: saved }));
    expect(field("latitude").value).toBe("42.1");
    changeStreet("2 Example Way");
    await answers[0].answer(point(43, -85));
    rerender(h(Harness, { state: saved })); // any later render, for example a keystroke elsewhere
    expect(field("latitude").value).toBe("43");
    expect(field("longitude").value).toBe("-85");
  });
});
