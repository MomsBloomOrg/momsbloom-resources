import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { getDocumentFormOptions } from "@/admin/documents";
import { listActiveFields } from "@/custom-fields/form";
import { linkClass } from "../../_components/ui";
import { DocumentForm } from "../_components/document-form";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

export default async function NewDocumentPage() {
  const admin = await requireStaffAdmin();
  const db = getDb();
  const [options, customFields] = await Promise.all([getDocumentFormOptions(db), listActiveFields(db, "document")]);
  const uploadPrefix = process.env.VERCEL_ENV === "production" ? "documents/" : "preview/documents/";
  return (
    <DocumentForm
      options={options}
      customFields={customFields}
      canManageFields={admin.role === "admin"}
      uploadPrefix={uploadPrefix}
      title="New Document"
      back={
        <Link href="/admin?type=guide" className={`${linkClass} inline-flex items-center gap-1`}>
          <ArrowLeft size={14} aria-hidden />
          Back to Guides & Downloads
        </Link>
      }
    />
  );
}
