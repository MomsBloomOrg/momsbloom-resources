import Link from "next/link";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { parseId } from "@/admin/organizations";
import { getProgramFormOptions } from "@/admin/programs";
import { listActiveFields } from "@/custom-fields/form";
import { linkClass } from "../../_components/ui";
import { ProgramForm } from "../_components/program-form";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

/** `?org=ID` (from "Add program" on an Organization) preselects that Organization. */
export default async function NewProgramPage({ searchParams }: PageProps<"/admin/programs/new">) {
  const admin = await requireStaffAdmin();
  const db = getDb();
  const [options, { org }, customFields] = await Promise.all([getProgramFormOptions(db), searchParams, listActiveFields(db, "program")]);
  const orgId = parseId(org);
  const organization = options.organizations.find((o) => o.id === orgId);

  return (
    <ProgramForm
      organizationId={organization?.id}
      options={options}
      customFields={customFields}
      canManageFields={admin.role === "admin"}
      title="New Program"
      back={
        <Link href={organization ? `/admin/organizations/${organization.id}` : "/admin"} className={linkClass}>
          Back to {organization?.name ?? "Organizations"}
        </Link>
      }
    />
  );
}
