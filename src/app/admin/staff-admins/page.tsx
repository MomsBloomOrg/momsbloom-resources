import { listStaffAdmins } from "@/admin/staff-admins";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { Card, PageHeader } from "../_components/ui";
import { AddStaffAdminForm, StaffAdminTable, type StaffAdminRow } from "./staff-admin-forms";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

const addedDate = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", year: "numeric", month: "short", day: "numeric" });

/** Who can log in to the Admin: the Owners (from the site settings) and the Staff admins added here. */
export default async function StaffAdminsPage() {
  const me = await requireStaffAdmin();
  const rows: StaffAdminRow[] = (await listStaffAdmins(getDb())).map((s) => {
    const you = s.email === me.email;
    return {
      email: s.email,
      label: s.kind === "owner" ? "Owner" : `Added ${s.addedAt ? addedDate.format(s.addedAt) : ""}`.trim(),
      owner: s.kind === "owner",
      removeId: s.kind === "added" && !you ? s.id : null,
      you,
    };
  });

  return (
    <>
      <PageHeader title="Staff admins" />
      <p className="mb-6 max-w-2xl">
        These people can log in to the Admin, and all have the same rights. Owners come from the site
        settings, and only the developer can change them. Add a Staff admin here; they log in at /login
        with a Login link. When you remove a Staff admin, they are logged out at once.
      </p>
      <Card className="mb-8">
        <StaffAdminTable rows={rows} />
      </Card>
      <Card title="Add a Staff admin">
        <AddStaffAdminForm />
      </Card>
    </>
  );
}
