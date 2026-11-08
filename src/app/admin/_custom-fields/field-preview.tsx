import type { FieldPreview } from "@/custom-fields/preview";
import { CustomField } from "../../embed/_components/detail-fields";
import { FilterCheckbox, FilterGroup } from "../../embed/_components/filter-column";

/**
 * "How families see it", beside a field form. It sits outside the `<form>`, so its inputs never post.
 * The card classes are the ones of the public detail page "More details" section.
 */
export function FieldPreviewPanel({ preview }: { preview: FieldPreview }) {
  const { shown, filter, needsOptions } = preview;
  return (
    <aside aria-label="How families see it" aria-live="polite" className="flex flex-col gap-3 text-sm">
      <h4 className="font-bold">How families see it</h4>
      {shown ? (
        <>
          <p className="text-muted">On the detail page</p>
          <section aria-labelledby="preview-details" className="rounded-2xl border border-line bg-surface p-5">
            <h5 id="preview-details" className="text-base font-extrabold">
              More details
            </h5>
            <div className="mt-2">
              <CustomField field={shown} />
            </div>
          </section>
          {filter && (
            <>
              <p className="text-muted">In the filters</p>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <FilterGroup
                  label={filter.label}
                  options={filter.values.map((value) => ({
                    node: <FilterCheckbox key={value.key} name={`preview-${value.key}`} value={value} disabled />,
                    checked: false,
                  }))}
                />
              </div>
            </>
          )}
        </>
      ) : needsOptions ? (
        <p>Add options to preview.</p>
      ) : (
        <p>Families don&apos;t see this.</p>
      )}
    </aside>
  );
}
