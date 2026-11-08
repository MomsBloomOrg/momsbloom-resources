import { listStaffAdmins } from "@/admin/staff-admins";
import { requireAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { Card, PageHeader } from "../_components/ui";
import { AddStaffAdminForm, StaffAdminTable, type StaffAdminRow } from "./staff-admin-forms";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

const addedDate = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", year: "numeric", month: "short", day: "numeric" });

/** Who can log in to the Admin: the Owners (from the site settings) and the Staff admins added here. */
export default async function StaffAdminsPage() {
  const me = await requireAdmin();
  const rows: StaffAdminRow[] = (await listStaffAdmins(getDb())).map((s) => {
    const you = s.email === me.email;
    return {
      email: s.email,
      label: s.kind === "owner" ? "Owner" : `Added ${s.addedAt ? addedDate.format(s.addedAt) : ""}`.trim(),
      owner: s.kind === "owner",
      role: s.role,
      removeId: s.kind === "added" && !you ? s.id : null,
      you,
    };
  });

  return (
    <>
      <PageHeader title="Staff admins" />
      <div className="mb-6 flex max-w-2xl flex-col gap-3">
        <p>These people can log in to the Admin. Each person is an Editor, an Admin, or an Owner:</p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li><strong>Editor</strong> — can change Resources: Organizations, Programs, Contacts, and Documents.</li>
          <li><strong>Admin</strong> — can change Resources, and also Settings, Content, the custom fields, and this page.</li>
          <li><strong>Owner</strong> — is always an Admin. Owners come from the site settings. Only the developer can change them.</li>
        </ul>
        <p>To add a Staff admin, use the form below. They log in at /login with a Login link.</p>
        <p>When you remove a Staff admin, they are logged out at once.</p>
        <p>You cannot change your own role.</p>
      </div>
      <Card className="mb-8">
        <StaffAdminTable rows={rows} />
      </Card>
      <Card title="Add a Staff admin">
        <AddStaffAdminForm />
      </Card>
    </>
  );
}
