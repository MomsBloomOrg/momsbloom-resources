import { useState } from "react";

export type Pin = { latitude: number | null | undefined; longitude: number | null | undefined };
type SaveState = { status: string; latitude?: number | null; longitude?: number | null };

/** The pin of the last good save. A refused save (invalid) or "Mark verified" carries no pin, so it keeps the one we have. */
export function lastGoodPin(pin: Pin, state: SaveState): Pin {
  if (state.status !== "saved" || state.latitude === undefined) return pin;
  return state.latitude === pin.latitude && state.longitude === pin.longitude ? pin : { latitude: state.latitude, longitude: state.longitude };
}

/**
 * The form's pin: the page-load pin, then the pin of each good save, kept across a refused save. A save's
 * pin is applied once, when `state` changes, so a later `setPin` (the map point lookup) is not reverted
 * while the page still holds that save's state.
 */
export function useLastGoodPin(initial: Pin, state: SaveState) {
  const [pin, setPin] = useState(initial);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    const next = lastGoodPin(pin, state);
    if (next !== pin) setPin(next);
  }
  return [pin, setPin] as const;
}
