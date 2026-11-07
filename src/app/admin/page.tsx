import { requireStaffAdmin } from "@/auth/dal";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

/** Placeholder Admin home. The admin-pages task replaces it with the spec's Home. */
export default async function AdminHome() {
  await requireStaffAdmin();
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">Admin</h1>
      <p className="text-muted">Admin pages are coming.</p>
    </>
  );
}
