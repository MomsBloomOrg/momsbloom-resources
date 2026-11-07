import Link from "next/link";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { listStatuses } from "@/admin/organizations";
import { Card, PageHeader, linkClass } from "../../_components/ui";
import { OrganizationForm } from "../_components/organization-form";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

export default async function NewOrganizationPage() {
  await requireStaffAdmin();
  const statuses = await listStatuses(getDb());
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
        <OrganizationForm statuses={statuses} programCount={0} />
      </Card>
    </>
  );
}
