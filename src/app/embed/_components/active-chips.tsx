import { X } from "lucide-react";
import { removeFilter, serializeDirectoryQuery, type DirectoryQuery } from "@/directory/query";
import { FACET_KEYS } from "@/directory/types";

/** A dark chip per active filter; its "x" link removes that filter. "Clear all" keeps the keyword and ZIP. */
export function ActiveChips({
  query,
  labelOf,
  organizationName,
  clearAllHref,
}: {
  query: DirectoryQuery;
  labelOf: (key: string) => string;
  organizationName: string | null;
  clearAllHref: string;
}) {
  const chips = FACET_KEYS.flatMap((facet) =>
    query.filters[facet].map((value) => ({
      label: labelOf(value),
      href: `?${serializeDirectoryQuery(removeFilter(query, facet, value))}`,
    })),
  );
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
          <li key={chip.href} className="flex shrink-0 items-center rounded-full bg-muted py-1 pl-3 text-sm text-white">
            {chip.label}
            <a
              href={chip.href}
              aria-label={`Remove ${chip.label}`}
              className="-my-2 flex size-11 items-center justify-center rounded-full md:size-8"
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
