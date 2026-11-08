"use client";

import { useId } from "react";
import type { FieldPreview } from "@/custom-fields/preview";
import { CustomField } from "../../embed/_components/detail-fields";
import { FilterCheckbox, FilterGroup } from "../../embed/_components/filter-column";

/**
 * "How families see it", beside a field form. It sits outside the `<form>`, so its inputs never post.
 * The card classes are the ones of the public detail page "More details" section.
 */
export function FieldPreviewPanel({ preview }: { preview: FieldPreview }) {
  const { shown, where, filter, needsOptions } = preview;
  const headingId = useId();
  const detailsId = useId();
  // One short line for screen readers; it changes only when the state changes, not on each keystroke.
  const status = shown ? (filter ? "Families see it, and it is a filter." : "Families see it.") : needsOptions ? "Add options to preview." : "Families don't see this.";
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 text-sm">
      <h4 id={headingId} className="font-bold">
        How families see it
      </h4>
      <p role="status" className="sr-only">
        {status}
      </p>
      {shown ? (
        <>
          {where === "card" ? (
            <>
              <p className="text-muted">On the card</p>
              <div className="rounded-2xl border border-line bg-surface p-5">
                <CustomField field={shown} />
              </div>
            </>
          ) : (
            <>
              <p className="text-muted">On the detail page</p>
              <section aria-labelledby={detailsId} className="rounded-2xl border border-line bg-surface p-5">
                <h5 id={detailsId} className="text-base font-extrabold">
                  More details
                </h5>
                <div className="mt-2">
                  <CustomField field={shown} />
                </div>
              </section>
            </>
          )}
          {filter && (
            <>
              <p className="text-muted">In the filters</p>
              {/* The public group has a top divider for the one below it; the preview has no group above. */}
              <div className="rounded-2xl border border-line bg-surface p-5 [&_fieldset]:border-t-0 [&_fieldset]:pt-0">
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
    </section>
  );
}
