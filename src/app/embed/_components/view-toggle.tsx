import { List, Map } from "lucide-react";
import {
  serializeDirectoryQuery,
  type DirectoryQuery,
} from "@/directory/query";

/** "List" / "Map" links. Plain links, so they work without JavaScript. */
export function ViewToggle({ query }: { query: DirectoryQuery }) {
  const views = [
    { view: "list", label: "List", Icon: List },
    { view: "map", label: "Map", Icon: Map },
  ] as const;
  return (
    <nav
      aria-label="View"
      className="flex items-center rounded-full border border-line bg-surface p-0.5 text-sm"
    >
      {views.map(({ view, label, Icon }) => (
        <a
          key={view}
          href={`?${serializeDirectoryQuery({ ...query, view })}`}
          aria-current={query.view === view ? "page" : undefined}
          className="flex min-h-11 items-center gap-1.5 rounded-full px-3 aria-[current]:bg-primary-text aria-[current]:font-bold aria-[current]:text-white md:min-h-8"
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </a>
      ))}
    </nav>
  );
}
