import { getHelpBoxContent, HELP_BOX_DEFAULTS, HELP_BOX_FIELDS, type HelpBoxField } from "@/admin/help-box";
import { requireStaffAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { Card, PageHeader } from "../_components/ui";
import { HelpBoxForm } from "./help-box-form";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

/** The text that families see on the Directory. */
export default async function ContentPage() {
  await requireStaffAdmin();
  const content = await getHelpBoxContent(getDb());
  // A field that equals its default shows empty (placeholder), so the form shows what is really saved.
  const saved = Object.fromEntries(HELP_BOX_FIELDS.map((f) => [f, content[f] === HELP_BOX_DEFAULTS[f] ? "" : content[f]])) as Record<HelpBoxField, string>;
  return (
    <>
      <PageHeader title="Website content" />
      <Card title="Help box">
        <p className="mb-4 max-w-2xl">
          The green &quot;Can&apos;t find what you need?&quot; box at the end of the Directory.
        </p>
        <HelpBoxForm saved={saved} defaults={HELP_BOX_DEFAULTS} />
      </Card>
    </>
  );
}
