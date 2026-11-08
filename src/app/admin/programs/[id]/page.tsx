import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { parseId } from "@/admin/organizations";
import { listContactsForAdmin } from "@/admin/contacts";
import { getProgramForAdmin, getProgramFormOptions } from "@/admin/programs";
import { listActiveFields } from "@/custom-fields/form";
import { buttonClass, hintClass, linkClass } from "../../_components/ui";
import { ProgramForm } from "../_components/program-form";
import { ContactsSection } from "./_components/contacts-section";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

export default async function ProgramPage({ params }: PageProps<"/admin/programs/[id]">) {
  const admin = await requireStaffAdmin();
  const id = parseId((await params).id);
  if (id === null) notFound();
  const db = getDb();
  const [{ detail, options }, contacts, customFields] = await Promise.all([
    // The saved record goes in first: its hidden values stay on the form.
    getProgramForAdmin(db, id).then(async (detail) => ({ detail, options: await getProgramFormOptions(db, detail?.program) })),
    listContactsForAdmin(db, id),
    listActiveFields(db, "program"),
  ]);
  if (!detail) notFound();
  const { program } = detail;

  return (
    <div className="flex flex-col gap-6">
      <ProgramForm
        key={id}
        id={id}
        program={program}
        options={options}
        customFields={customFields}
        canManageFields={admin.role === "admin"}
        title="Edit Resource"
        back={
          <Link href="/admin" className={`${linkClass} inline-flex items-center gap-1`}>
            <ArrowLeft size={14} aria-hidden />
            All Resources
          </Link>
        }
        actions={
          <a href={`/embed/programs/${id}`} target="_blank" rel="noopener" className={buttonClass("secondary")}>
            View on site<span className="sr-only"> (opens in a new tab)</span>
          </a>
        }
      >
        <p className={hintClass}>
          Last changed {new Date(program.updatedAt).toLocaleDateString("en-US", { timeZone: "America/Detroit", year: "numeric", month: "short", day: "numeric" })}
        </p>
      </ProgramForm>
      <ContactsSection programId={id} contacts={contacts} />
    </div>
  );
}
