import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { getDocumentForAdmin, getDocumentFormOptions } from "@/admin/documents";
import { parseId } from "@/admin/organizations";
import { listActiveFields } from "@/custom-fields/form";
import { buttonClass, hintClass, linkClass } from "../../_components/ui";
import { DocumentForm } from "../_components/document-form";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

export default async function DocumentPage({ params }: PageProps<"/admin/documents/[id]">) {
  const admin = await requireStaffAdmin();
  const id = parseId((await params).id);
  if (id === null) notFound();
  const db = getDb();
  const detail = await getDocumentForAdmin(db, id);
  if (!detail) notFound();
  // The saved record goes in: its hidden values stay on the form.
  const [options, customFields] = await Promise.all([getDocumentFormOptions(db, detail.document), listActiveFields(db, "document")]);
  const { document } = detail;
  const uploadPrefix = process.env.VERCEL_ENV === "production" ? "documents/" : "preview/documents/";

  return (
    <DocumentForm
      key={id}
      id={id}
      document={document}
      options={options}
      customFields={customFields}
      canManageFields={admin.role === "admin"}
      uploadPrefix={uploadPrefix}
      title={document.title}
      back={
        <Link href="/admin?type=guide" className={`${linkClass} inline-flex items-center gap-1`}>
          <ArrowLeft size={14} aria-hidden />
          Back to Guides & Downloads
        </Link>
      }
      actions={
        document.url ? (
          <a href={document.url} target="_blank" rel="noopener" className={buttonClass("secondary")}>
            Open PDF<span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : undefined
      }
    >
      <p className={hintClass}>
        Last changed {new Date(document.updatedAt).toLocaleDateString("en-US", { timeZone: "America/Detroit", year: "numeric", month: "short", day: "numeric" })}
      </p>
    </DocumentForm>
  );
}
