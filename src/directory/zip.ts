import { MICHIGAN_ZIP_CENTERS } from "./michigan-zips";
import type { LatLng } from "./types";

/**
 * The center of a Michigan ZIP code, or null when we do not know it (not 5 digits, not in
 * Michigan, or a ZIP code for PO boxes only). The UI then shows "We don't recognize that ZIP".
 */
export function lookupMichiganZip(zip: string): LatLng | null {
  const center = Object.hasOwn(MICHIGAN_ZIP_CENTERS, zip) ? MICHIGAN_ZIP_CENTERS[zip] : undefined;
  return center ? { lat: center[0], lng: center[1] } : null;
}
