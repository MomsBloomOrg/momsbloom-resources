import Link from "next/link";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { listDocumentsForAdmin } from "@/admin/documents";
import { NEEDS_REVIEW_STATUS } from "@/admin/organizations";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  buttonClass,
  linkClass,
  stackRowClass,
  stackTableClass,
  stackTbodyClass,
  stackTdClass,
  stackTheadClass,
  stackTheadRowClass,
  thClass,
} from "../_components/ui";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

/** `2026-09-15` as "Sep 15, 2026". Read as UTC, so the time zone cannot move the day. */
function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });
}

export default async function DocumentsPage() {
  await requireStaffAdmin();
  const rows = await listDocumentsForAdmin(getDb());
  return (
    <>
      <PageHeader
        title="Documents"
        actions={
          <Link href="/admin/documents/new" className={buttonClass("primary", "sm")}>
            New Document
          </Link>
        }
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState>No Documents yet.</EmptyState>
        ) : (
          <table role="table" className={stackTableClass}>
            <caption className="sr-only">Documents</caption>
            <thead role="rowgroup" className={stackTheadClass}>
              <tr role="row" className={stackTheadRowClass}>
                <th role="columnheader" scope="col" className={thClass}>Title</th>
                <th role="columnheader" scope="col" className={thClass}>Status</th>
                <th role="columnheader" scope="col" className={thClass}>Last verified</th>
              </tr>
            </thead>
            <tbody role="rowgroup" className={stackTbodyClass}>
              {rows.map((row) => (
                <tr key={row.id} role="row" className={stackRowClass}>
                  <td role="cell" className={stackTdClass}>
                    <Link href={`/admin/documents/${row.id}`} className={`${linkClass} font-semibold`}>
                      {row.title}
                    </Link>
                  </td>
                  <td role="cell" data-label="Status" className={stackTdClass}>
                    <Badge tone={row.statusName === NEEDS_REVIEW_STATUS ? "warning" : row.showOnSite ? "good" : "neutral"}>{row.statusName}</Badge>
                  </td>
                  <td role="cell" data-label="Last verified" className={stackTdClass}>
                    {formatDate(row.lastVerified)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
