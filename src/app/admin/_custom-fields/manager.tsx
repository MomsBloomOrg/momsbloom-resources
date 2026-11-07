/**
 * "Custom fields for all Programs" (or Organizations): the section at the bottom of a record's Admin
 * page where staff add, edit, move, archive, and restore fields (src/custom-fields/README.md).
 *
 * A field belongs to every record of its type, not to the record on screen, so the section says so,
 * names the count, and starts closed: nobody changes a shared field by accident while editing one
 * record. It is its own Card, outside the record's form (forms can't nest).
 */
import type { AdminEntity } from "@/custom-fields/form";
import { countRecords, listFieldsForAdmin } from "@/custom-fields/manage";
import type { Db } from "@/db/types";
import { Card, EmptyState, hintClass } from "../_components/ui";
import { AddFieldForm, ArchivedFieldRow, FieldRow } from "./field-forms";

const NAMES: Record<AdminEntity, { one: string; many: string }> = {
  program: { one: "Program", many: "Programs" },
  organization: { one: "Organization", many: "Organizations" },
};

/** The id the "Manage fields" link in the record's form points at. */
export const MANAGER_ID = "custom-fields";

export async function CustomFieldsManager({ db, entity }: { db: Db; entity: AdminEntity }) {
  const [{ active, archived }, total] = await Promise.all([listFieldsForAdmin(db, entity), countRecords(db, entity)]);
  const { one, many } = NAMES[entity];

  return (
    <section id={MANAGER_ID} aria-labelledby={`${MANAGER_ID}-heading`} className="scroll-mt-6">
      <Card title={<span id={`${MANAGER_ID}-heading`}>Custom fields for all {many}</span>}>
        <p className="mb-3 max-w-2xl">
          Changes here apply to <strong>every {one} ({total})</strong>, not just this one. Each {one} keeps its own
          answers: fill them in above, under &ldquo;More details&rdquo;.
        </p>
        <details className="group">
          <summary className="cursor-pointer font-semibold text-primary-hover underline decoration-1 underline-offset-2 hover:text-ink">
            Manage the {active.length} {one} field{active.length === 1 ? "" : "s"}
          </summary>
          <div className="mt-4 flex flex-col gap-6">
            {active.length === 0 ? (
              <EmptyState>No {one} fields yet.</EmptyState>
            ) : (
              <ul>
                {active.map((field, index) => (
                  <FieldRow key={field.id} field={field} first={index === 0} last={index === active.length - 1} />
                ))}
              </ul>
            )}
            <div className="rounded-2xl bg-surface p-4 sm:p-5">
              <AddFieldForm entity={entity} entityLabel={one} />
            </div>
            {archived.length > 0 && (
              <div>
                <h3 className="text-xl font-normal">Archived fields</h3>
                <p className={hintClass}>Hidden everywhere. Their answers stay on the records; Restore brings them back.</p>
                <ul>
                  {archived.map((field) => (
                    <ArchivedFieldRow key={field.id} field={field} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      </Card>
    </section>
  );
}
