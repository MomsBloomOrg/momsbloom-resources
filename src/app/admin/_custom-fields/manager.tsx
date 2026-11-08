/**
 * "Program fields" (or "Organization fields"): one open section on the Admin Custom fields page
 * where staff add, edit, move, archive, and restore fields (src/custom-fields/README.md).
 *
 * A field belongs to every record of its type, so the section names the count. The section `id`
 * (`program-fields`, `organization-fields`) is the anchor the record forms link to.
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

export async function CustomFieldsManager({ db, entity }: { db: Db; entity: AdminEntity }) {
  const [{ active, archived }, total] = await Promise.all([listFieldsForAdmin(db, entity), countRecords(db, entity)]);
  const { one } = NAMES[entity];
  const id = `${entity}-fields`;

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-6">
      <Card title={<span id={`${id}-heading`}>{one} fields</span>}>
        <p className="mb-4 max-w-2xl">
          Each field is a question on <strong>every {one} ({total})</strong>.
        </p>
        <div className="flex flex-col gap-6">
          {active.length === 0 ? (
            <EmptyState>No {one} fields yet.</EmptyState>
          ) : (
            <ul>
              {active.map((field, index) => (
                <FieldRow key={field.id} field={field} first={index === 0} last={index === active.length - 1} />
              ))}
            </ul>
          )}
          <div className="rounded-2xl border border-line p-4 sm:p-5">
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
      </Card>
    </section>
  );
}
