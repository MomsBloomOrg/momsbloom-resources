import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { parseId } from "@/admin/organizations";
import { getProgramForAdmin, getProgramFormOptions } from "@/admin/programs";
import { Card, PageHeader, buttonClass, hintClass, linkClass } from "../../_components/ui";
import { ProgramForm } from "../_components/program-form";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

export default async function ProgramPage({ params }: PageProps<"/admin/programs/[id]">) {
  await requireStaffAdmin();
  const id = parseId((await params).id);
  if (id === null) notFound();
  const db = getDb();
  const [detail, options] = await Promise.all([getProgramForAdmin(db, id), getProgramFormOptions(db)]);
  if (!detail) notFound();
  const { program } = detail;
  const organization = options.organizations.find((o) => o.id === program.organizationId);

  return (
    <>
      <PageHeader
        title={program.name}
        back={
          <Link href={`/admin/organizations/${program.organizationId}`} className={linkClass}>
            Back to {organization?.name ?? "Organization"}
          </Link>
        }
        actions={
          <a href={`/embed/programs/${id}`} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}>
            View on site<span className="sr-only"> (opens in a new tab)</span>
          </a>
        }
      />
      <Card title="Program">
        <ProgramForm key={id} id={id} program={program} options={options} />
        <p className={`${hintClass} mt-4`}>
          Last changed {new Date(program.updatedAt).toLocaleDateString("en-US", { timeZone: "America/Detroit", year: "numeric", month: "short", day: "numeric" })}
        </p>
      </Card>
    </>
  );
}
