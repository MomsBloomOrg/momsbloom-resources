export type Pin = { latitude: number | null | undefined; longitude: number | null | undefined };

/** The pin of the last good save. A refused save (invalid) or "Mark verified" carries no pin, so it keeps the one we have. */
export function lastGoodPin(pin: Pin, state: { status: string; latitude?: number | null; longitude?: number | null }): Pin {
  if (state.status !== "saved" || state.latitude === undefined) return pin;
  return state.latitude === pin.latitude && state.longitude === pin.longitude ? pin : { latitude: state.latitude, longitude: state.longitude };
}
