import { redirect } from "next/navigation";
import { requireStaffAdmin } from "@/auth/dal";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

/** Guides & Downloads now list on the Admin home ("Resources Admin"); old links land on that tab. */
export default async function DocumentsPage() {
  await requireStaffAdmin();
  redirect("/admin?type=guide");
}
