import Link from "next/link";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { listStatuses } from "@/admin/organizations";
import { listActiveFields } from "@/custom-fields/form";
import { Card, PageHeader, linkClass } from "../../_components/ui";
import { OrganizationForm } from "../_components/organization-form";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

export default async function NewOrganizationPage() {
  await requireStaffAdmin();
  const db = getDb();
  const [statuses, customFields] = await Promise.all([listStatuses(db), listActiveFields(db, "organization")]);
  return (
    <>
      <PageHeader
        title="New Organization"
        back={
          <Link href="/admin" className={linkClass}>
            Back to Organizations
          </Link>
        }
      />
      <Card>
        <OrganizationForm statuses={statuses} hiddenProgramCount={0} customFields={customFields} />
      </Card>
    </>
  );
}
