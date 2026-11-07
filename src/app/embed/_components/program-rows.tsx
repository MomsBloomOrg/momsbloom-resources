import { ArrowRight } from "lucide-react";
import type { DirectoryProgram } from "@/directory/types";
import { detailsHref, supportTags, type LabelOf } from "./program-card";

/** A list of Programs (name, tags, arrow) that open their Program detail. Used by "More from …" and "Programs at …". */
export function ProgramRows({ programs, labelOf, search }: { programs: readonly DirectoryProgram[]; labelOf: LabelOf; search: string }) {
  return (
    <ul className="mt-2">
      {programs.map((program) => (
        <li key={program.id} className="border-t border-line">
          <a href={detailsHref(program.id, search)} className="flex min-h-11 items-center justify-between gap-2 py-2">
            <span>
              <span className="block">{program.name}</span>
              <span className="block text-sm text-muted">
                {supportTags(program.facetValues, labelOf).map((tag) => tag.label).join(" · ")}
              </span>
            </span>
            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-primary-text" />
          </a>
        </li>
      ))}
    </ul>
  );
}
