import { requireAdmin } from "@/auth/dal";
import { getDb } from "@/db";
import { ADMIN_ENTITIES } from "@/custom-fields/form";
import { PageHeader } from "../../_components/ui";
import { CustomFieldsManager } from "../../_custom-fields/manager";
import { SettingsSubNav } from "../settings-sub-nav";

/** Block on the login check (cacheComponents): the page is never prerendered without it. */
export const instant = false;

/**
 * Custom fields for every record type in ADMIN_ENTITIES, one open section each. Owners only
 * (`requireAdmin`); editors fill in the answers on the records.
 */
export default async function CustomFieldsPage() {
  await requireAdmin();
  const db = getDb();

  return (
    <>
      <SettingsSubNav current="custom-fields" />
      <PageHeader title="Custom fields" />
      <div className="mb-6 flex max-w-2xl flex-col gap-3">
        <p>Custom fields are extra questions you add to every Program, Organization, or Document.</p>
        <ol className="flex list-decimal flex-col gap-1 pl-5">
          <li><strong>Add the field</strong> here, for example &ldquo;Parking&rdquo;.</li>
          <li>
            <strong>Fill in the answers</strong> on each Program, Organization, or Document, under &ldquo;More details&rdquo;. A blank answer
            means &ldquo;we don&apos;t know&rdquo;.
          </li>
          <li>
            <strong>Choose who sees it</strong>: &ldquo;Families see it&rdquo; shows the answer on the website, and &ldquo;Staff only&rdquo;
            keeps it in the Admin. Yes / No and list fields on Programs can also be filters.
          </li>
        </ol>
      </div>
      <div className="flex flex-col gap-6">
        {ADMIN_ENTITIES.map((entity) => (
          <CustomFieldsManager key={entity} db={db} entity={entity} />
        ))}
      </div>
    </>
  );
}
