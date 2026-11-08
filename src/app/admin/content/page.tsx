import { DIRECTORY_HEADING_DEFAULTS, DIRECTORY_HEADING_FIELDS, getDirectoryHeadingContent, type DirectoryHeadingField } from "@/admin/directory-heading";
import { getHelpBoxContent, HELP_BOX_DEFAULTS, HELP_BOX_FIELDS, type HelpBoxField } from "@/admin/help-box";
import { requireAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { Card, PageHeader } from "../_components/ui";
import { DirectoryHeadingForm } from "./directory-heading-form";
import { HelpBoxForm } from "./help-box-form";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

/** The text that families see on the Directory. */
export default async function ContentPage() {
  await requireAdmin();
  const db = getDb();
  const [heading, content] = await Promise.all([getDirectoryHeadingContent(db), getHelpBoxContent(db)]);
  // A field that equals its default shows empty (placeholder), so the form shows what is really saved.
  const savedHeading = Object.fromEntries(
    DIRECTORY_HEADING_FIELDS.map((f) => [f, heading[f] === DIRECTORY_HEADING_DEFAULTS[f] ? "" : heading[f]]),
  ) as Record<DirectoryHeadingField, string>;
  const saved = Object.fromEntries(HELP_BOX_FIELDS.map((f) => [f, content[f] === HELP_BOX_DEFAULTS[f] ? "" : content[f]])) as Record<HelpBoxField, string>;
  return (
    <>
      <PageHeader title="Website content" />
      <Card title="Directory heading">
        <p className="mb-4 max-w-2xl">The title and the line under it at the top of the Directory.</p>
        <DirectoryHeadingForm saved={savedHeading} defaults={DIRECTORY_HEADING_DEFAULTS} />
      </Card>
      <Card title="Help box">
        <p className="mb-4 max-w-2xl">
          The green &quot;{content.heading}&quot; box at the end of the Directory.
        </p>
        <HelpBoxForm saved={saved} defaults={HELP_BOX_DEFAULTS} />
      </Card>
    </>
  );
}
