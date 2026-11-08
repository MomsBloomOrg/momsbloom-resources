import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { listStatuses } from "@/admin/organizations";
import { listActiveFields } from "@/custom-fields/form";
import { linkClass } from "../../_components/ui";
import { OrganizationForm } from "../_components/organization-form";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

export default async function NewOrganizationPage() {
  await requireStaffAdmin();
  const db = getDb();
  const [statuses, customFields] = await Promise.all([listStatuses(db), listActiveFields(db, "organization")]);
  return (
    <OrganizationForm
      statuses={statuses}
      hiddenProgramCount={0}
      customFields={customFields}
      title="New Organization"
      back={
        <Link href="/admin?type=organization" className={`${linkClass} inline-flex items-center gap-1`}>
          <ArrowLeft size={14} aria-hidden />
          Back to Organizations
        </Link>
      }
    />
  );
}
