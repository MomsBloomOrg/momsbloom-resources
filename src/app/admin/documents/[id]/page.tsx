import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { getDocumentForAdmin, getDocumentFormOptions } from "@/admin/documents";
import { parseId } from "@/admin/organizations";
import { Card, PageHeader, hintClass, linkClass } from "../../_components/ui";
import { DocumentForm } from "../_components/document-form";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

export default async function DocumentPage({ params }: PageProps<"/admin/documents/[id]">) {
  await requireStaffAdmin();
  const id = parseId((await params).id);
  if (id === null) notFound();
  const db = getDb();
  const [detail, options] = await Promise.all([getDocumentForAdmin(db, id), getDocumentFormOptions(db)]);
  if (!detail) notFound();
  const { document } = detail;

  return (
    <>
      <PageHeader
        title={document.title}
        back={
          <Link href="/admin/documents" className={linkClass}>
            Back to Documents
          </Link>
        }
      />
      <Card title="Document">
        <DocumentForm key={id} id={id} document={document} options={options} />
        <p className={`${hintClass} mt-4`}>
          Last changed {new Date(document.updatedAt).toLocaleDateString("en-US", { timeZone: "America/Detroit", year: "numeric", month: "short", day: "numeric" })}
        </p>
      </Card>
    </>
  );
}
