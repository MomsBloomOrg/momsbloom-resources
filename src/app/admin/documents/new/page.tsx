import Link from "next/link";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { getDocumentFormOptions } from "@/admin/documents";
import { Card, PageHeader, linkClass } from "../../_components/ui";
import { DocumentForm } from "../_components/document-form";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

export default async function NewDocumentPage() {
  await requireStaffAdmin();
  const options = await getDocumentFormOptions(getDb());
  const uploadPrefix = process.env.VERCEL_ENV === "production" ? "documents/" : "preview/documents/";
  return (
    <>
      <PageHeader
        title="New Document"
        back={
          <Link href="/admin/documents" className={linkClass}>
            Back to Documents
          </Link>
        }
      />
      <Card>
        <DocumentForm options={options} uploadPrefix={uploadPrefix} />
      </Card>
    </>
  );
}
