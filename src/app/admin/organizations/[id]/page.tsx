import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { getOrganizationForAdmin, listStatuses, parseId } from "@/admin/organizations";
import { listActiveFields } from "@/custom-fields/form";
import {
  Badge,
  Card,
  EmptyState,
  buttonClass,
  hintClass,
  linkClass,
  sectionTitle,
  stackRowClass,
  stackTableClass,
  stackTbodyClass,
  stackTdClass,
  stackTheadClass,
  stackTheadRowClass,
  thClass,
} from "../../_components/ui";
import { CustomFieldsManager } from "../../_custom-fields/manager";
import { OrganizationForm } from "../_components/organization-form";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

/** `2026-09-15` as "Sep 15, 2026". Read as UTC, so the time zone cannot move the day. */
function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
}

export default async function OrganizationPage({ params }: PageProps<"/admin/organizations/[id]">) {
  const admin = await requireStaffAdmin();
  const id = parseId((await params).id);
  if (id === null) notFound();
  const db = getDb();
  const [detail, statuses, customFields] = await Promise.all([getOrganizationForAdmin(db, id), listStatuses(db), listActiveFields(db, "organization")]);
  if (!detail) notFound();
  const { organization, programs } = detail;

  return (
    <div className="flex flex-col gap-6">
      <OrganizationForm
        key={id}
        id={id}
        organization={organization}
        statuses={statuses}
        hiddenProgramCount={programs.filter((p) => p.showOnSite).length}
        customFields={customFields}
        title={organization.name}
        back={
          <Link href="/admin?type=organization" className={`${linkClass} inline-flex items-center gap-1`}>
            <ArrowLeft size={14} aria-hidden />
            Back to Organizations
          </Link>
        }
        actions={
          <a href={`/embed/organizations/${id}`} target="_blank" rel="noopener" className={buttonClass("secondary")}>
            View on site<span className="sr-only"> (opens in a new tab)</span>
          </a>
        }
      >
        <p className={hintClass}>
          Last changed {new Date(organization.updatedAt).toLocaleDateString("en-US", { timeZone: "America/Detroit", year: "numeric", month: "short", day: "numeric" })}
        </p>
      </OrganizationForm>

        <Card
          title={sectionTitle("Programs")}
          actions={
            <Link href={`/admin/programs/new?org=${id}`} className={buttonClass("secondary", "sm")}>
              Add program
            </Link>
          }
        >
          {programs.length === 0 ? (
            <EmptyState>This Organization has no Programs yet.</EmptyState>
          ) : (
            <table role="table" className={stackTableClass}>
              <caption className="sr-only">Programs of {organization.name}</caption>
              <thead role="rowgroup" className={stackTheadClass}>
                <tr role="row" className={stackTheadRowClass}>
                  <th role="columnheader" scope="col" className={thClass}>Name</th>
                  <th role="columnheader" scope="col" className={thClass}>Status</th>
                  <th role="columnheader" scope="col" className={thClass}>Last verified</th>
                  <th role="columnheader" scope="col" className={thClass}><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody role="rowgroup" className={stackTbodyClass}>
                {programs.map((p) => (
                  <tr key={p.id} role="row" className={stackRowClass}>
                    <td role="cell" className={`${stackTdClass} font-semibold`}>{p.name}</td>
                    <td role="cell" data-label="Status" className={stackTdClass}>
                      <Badge tone={p.showOnSite ? "good" : "neutral"}>{p.statusName}</Badge>
                    </td>
                    <td role="cell" data-label="Last verified" className={stackTdClass}>{formatDate(p.lastVerified)}</td>
                    <td role="cell" className={stackTdClass}>
                      <Link href={`/admin/programs/${p.id}`} className={linkClass} aria-label={`Edit ${p.name}`}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {admin.role === "admin" && <CustomFieldsManager db={db} entity="organization" />}
    </div>
  );
}
