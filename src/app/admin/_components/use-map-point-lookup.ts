"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent } from "react";
import { NOT_PLACED, addressKey, type Address, type Point } from "@/admin/geocode";
import type { Pin } from "./last-good-pin";

/** Look up when the street is set and the address differs from the last one looked up or loaded. A suite-only change is not a change. */
export function shouldLookUp(address: Address, lastKey: string | null): boolean {
  return Boolean(address.streetAddress) && addressKey(address) !== lastKey;
}

type Field = HTMLInputElement | null;
/** A field of the form that holds `inside`. */
const field = (inside: HTMLElement | null, name: string): Field => (inside?.closest("form")?.elements.namedItem(name) as Field) ?? null;

/** The point, null for no match, or undefined when there is no answer (aborted, offline, logged out). */
async function fetchPoint(a: Address, signal: AbortSignal): Promise<Point | null | undefined> {
  const query = { street: a.streetAddress ?? "", city: a.city ?? "", state: a.state ?? "", zip: a.zip ?? "" };
  try {
    const res = await fetch(`/api/admin/map-point?${new URLSearchParams(query)}`, { signal });
    if (!res.ok) return undefined;
    const body = (await res.json()) as Point | { point: null };
    return "latitude" in body ? body : null;
  } catch {
    return undefined;
  }
}

/**
 * Fills Latitude and Longitude from the street address before Save, so the save makes no Census call
 * (`geocodeOnSave` stays the fallback). Put `ref` and `onBlur` on the wrapper of the street, suite,
 * city, state, and ZIP fields: a lookup runs when focus leaves the wrapper with a changed address, and
 * once on load when `lookUpOnLoad` (the record's own street is set and it has no point). A blank street
 * never looks up (a Program then inherits the Organization's point). The result replaces the fields
 * only if staff did not edit them: a match sets the pin; no match blanks it and `notice` is NOT_PLACED.
 * `answered` is true after the first answer, so the form can drop its on-load notice.
 */
export function useMapPointLookup(setPin: (pin: Pin) => void, lookUpOnLoad: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const lastKey = useRef<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const [notice, setNotice] = useState<string>();
  const [answered, setAnswered] = useState(false);
  // Only the first render's value: a save re-renders with new props, and must not start a new on-load lookup.
  const [onLoad] = useState(lookUpOnLoad);

  const read = useCallback((): Address => {
    const v = (name: string) => field(ref.current, name)?.value.trim() || null;
    return { streetAddress: v("streetAddress"), city: v("city"), state: v("state"), zip: v("zip") };
  }, []);

  const lookUp = useCallback(
    (address: Address) => {
      inFlight.current?.abort(); // a stale reply must not fill the fields
      const controller = new AbortController();
      inFlight.current = controller;
      lastKey.current = addressKey(address);
      void fetchPoint(address, controller.signal).then((point) => {
        if (inFlight.current !== controller) return; // a newer lookup started, or the form unmounted
        // undefined: aborted by a newer lookup, or no answer; Save looks the address up instead.
        // The inputs are keyed on the pin, so the default value is the pin: a different value means staff edited it.
        if (point === undefined || [field(ref.current, "latitude"), field(ref.current, "longitude")].some((f) => f && f.value.trim() !== f.defaultValue)) return;
        setPin(point ?? { latitude: null, longitude: null });
        setNotice(point ? undefined : NOT_PLACED);
        setAnswered(true);
      });
    },
    [setPin],
  );

  useEffect(() => {
    const address = read();
    lastKey.current = addressKey(address);
    if (onLoad && address.streetAddress) lookUp(address);
    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [onLoad, read, lookUp]);

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) return; // still in the address fields
    const address = read();
    if (shouldLookUp(address, lastKey.current)) lookUp(address);
  };

  return { ref, onBlur, notice, answered };
}
