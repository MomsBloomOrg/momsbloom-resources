import { X } from "lucide-react";
import { customFilterGroups } from "@/custom-fields/filter";
import type { CustomFieldDefinition } from "@/custom-fields/types";
import { removeCustomFilter, removeFilter, serializeDirectoryQuery, type DirectoryQuery } from "@/directory/query";
import { FACET_KEYS } from "@/directory/types";
import type { LabelOf } from "./program-card";

/** A light chip per active filter; its "x" link removes that filter. "Clear all" keeps the keyword and ZIP. */
export function ActiveChips({
  query,
  labelOf,
  customFields,
  organizationName,
  clearAllHref,
}: {
  query: DirectoryQuery;
  labelOf: LabelOf;
  customFields: readonly CustomFieldDefinition[];
  organizationName: string | null;
  clearAllHref: string;
}) {
  const chips = FACET_KEYS.flatMap((facet) =>
    query.filters[facet].map((value) => ({
      label: labelOf(facet, value),
      href: `?${serializeDirectoryQuery(removeFilter(query, facet, value))}`,
    })),
  );
  for (const group of customFilterGroups(customFields)) {
    for (const value of query.custom[group.fieldId] ?? []) {
      chips.push({
        label: `${group.label}: ${group.values.find((v) => v.key === value)?.label ?? value}`,
        href: `?${serializeDirectoryQuery(removeCustomFilter(query, group.fieldId, value))}`,
      });
    }
  }
  if (query.org) {
    chips.push({
      label: organizationName ?? query.org,
      href: `?${serializeDirectoryQuery({ ...query, org: null, pages: 1 })}`,
    });
  }
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
      <ul className="contents">
        {chips.map((chip) => (
          <li key={chip.href} className="flex shrink-0 items-center rounded-full border border-line bg-surface py-0.5 pl-3 text-sm text-ink">
            {chip.label}
            <a
              href={chip.href}
              aria-label={`Remove ${chip.label}`}
              className="-my-2 flex size-11 items-center justify-center rounded-full text-muted hover:text-ink md:size-8"
            >
              <X aria-hidden="true" className="size-4" />
            </a>
          </li>
        ))}
      </ul>
      <a href={clearAllHref} className="flex min-h-11 shrink-0 items-center px-1 text-sm font-bold text-primary-text underline">
        Clear all
      </a>
    </div>
  );
}
