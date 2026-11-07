/** Map coordinates for an address from the US Census one-line geocoder (free, no key). Only the Census sees the address. */

const ENDPOINT = "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";
const TIMEOUT_MS = 5000;

export const NOT_PLACED = "We couldn't place this address on the map. Type the coordinates, or leave them blank.";

type Fetch = typeof fetch;
export interface Point {
  latitude: number;
  longitude: number;
}

/** The coordinates of the first match, or null on no match, a bad reply, an error, or a timeout. Never throws. */
export async function geocodeAddress(address: string, fetchFn: Fetch = fetch): Promise<Point | null> {
  try {
    const url = `${ENDPOINT}?${new URLSearchParams({ address, benchmark: "Public_AR_Current", format: "json" })}`;
    const res = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return null;
    const c = (await res.json())?.result?.addressMatches?.[0]?.coordinates;
    return Number.isFinite(c?.y) && Number.isFinite(c?.x) ? { latitude: c.y, longitude: c.x } : null;
  } catch {
    return null;
  }
}

export interface Placed {
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
}

const addressKey = (a: Placed) => [a.streetAddress, a.city, a.state, a.zip].map((v) => v ?? "").join("|");

/**
 * Keeps latitude and longitude in step with the street address when the address is new or changed and
 * staff left the coordinates as they were: a lookup fills them; a failed lookup or a cleared street
 * address sets them to null (never the old pin). A blank street address is never looked up (a Program
 * then inherits the Organization's). Returns the input to save and `failed` (a lookup found nothing).
 * The save goes on either way.
 */
export async function geocodeOnSave<T extends Placed>(input: T, old: Placed | null, fetchFn: Fetch = fetch): Promise<{ input: T; failed: boolean }> {
  const edited = input.latitude !== (old?.latitude ?? null) || input.longitude !== (old?.longitude ?? null);
  const changed = !old || addressKey(old) !== addressKey(input);
  if (!changed || edited) return { input, failed: false };
  const cleared = { ...input, latitude: null, longitude: null };
  if (!input.streetAddress) return { input: cleared, failed: false };
  const point = await geocodeAddress([input.streetAddress, input.city, input.state, input.zip].filter(Boolean).join(", "), fetchFn);
  return point ? { input: { ...input, ...point }, failed: false } : { input: cleared, failed: true };
}
