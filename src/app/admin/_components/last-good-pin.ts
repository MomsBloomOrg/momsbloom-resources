import { useState } from "react";

export type Pin = { latitude: number | null | undefined; longitude: number | null | undefined };
type SaveState = { status: string; latitude?: number | null; longitude?: number | null };

/** The pin of the last good save. A refused save (invalid) or "Mark verified" carries no pin, so it keeps the one we have. */
export function lastGoodPin(pin: Pin, state: SaveState): Pin {
  if (state.status !== "saved" || state.latitude === undefined) return pin;
  return state.latitude === pin.latitude && state.longitude === pin.longitude ? pin : { latitude: state.latitude, longitude: state.longitude };
}

/** A save's pin applies only when the save state is a new one: the page keeps the last state, and a later lookup must not be reverted. */
export function pinForState(pin: Pin, state: SaveState, seen: SaveState): Pin {
  return state === seen ? pin : lastGoodPin(pin, state);
}

/** The form's pin: the page-load pin, then the pin of each good save (see pinForState), kept across a refused save. */
export function useLastGoodPin(initial: Pin, state: SaveState) {
  const [pin, setPin] = useState(initial);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    const next = pinForState(pin, state, seen);
    if (next !== pin) setPin(next);
  }
  return [pin, setPin] as const;
}
