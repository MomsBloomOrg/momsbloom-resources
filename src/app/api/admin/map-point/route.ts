import { NextResponse } from "next/server";
import { geocodeAddress } from "@/admin/geocode";
import { getCurrentStaffAdmin } from "@/auth/dal";

const MAX_LENGTH = 200;
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * The map point for an address, for the Organization and Program forms: `{ latitude, longitude }`, or
 * `{ point: null }` when the Census finds nothing. Staff admins only: a 401 (not the login redirect,
 * which would hand `fetch` the login page).
 * shortcut: no per-session throttle (staff only, one call per address change, and an in-memory counter
 * would not hold across serverless instances); add one with a shared store if the route is abused.
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (!(await getCurrentStaffAdmin())) {
    return NextResponse.json({ error: "Log in to look up a map point." }, { status: 401, headers: NO_STORE });
  }
  const params = new URL(request.url).searchParams;
  const parts = ["street", "city", "state", "zip"].map((name) => params.get(name)?.trim() ?? "");
  if (!parts[0] || parts.some((p) => p.length > MAX_LENGTH)) {
    return NextResponse.json({ error: "Send a street address of up to 200 characters." }, { status: 400, headers: NO_STORE });
  }
  const point = await geocodeAddress(parts.filter(Boolean).join(", "));
  return NextResponse.json(point ?? { point: null }, { headers: NO_STORE });
}
