/**
 * Straight-line distance in miles (docs/specs/public-directory.md, "Distance").
 * The "haversine" formula measures distance on a sphere. For a county it is accurate to well
 * under 1%, which is enough: families see one decimal.
 */
import type { LatLng } from "./types";

const EARTH_RADIUS_MILES = 3958.8;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceMiles(from: LatLng, to: LatLng): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

/** One decimal, the way families see it: 0.84 → 0.8. */
export const roundMiles = (miles: number) => Math.round(miles * 10) / 10;
