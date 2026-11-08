import { List, Map } from "lucide-react";
import {
  serializeDirectoryQuery,
  type DirectoryQuery,
} from "@/directory/query";

/** "List" / "Map" links. Below `md` only the other view shows ("Map" on the list, "List View" on the map). Plain links, so they work without JavaScript. */
export function ViewToggle({ query }: { query: DirectoryQuery }) {
  const views = [
    { view: "list", label: "List", mobileLabel: "List View", Icon: List },
    { view: "map", label: "Map", mobileLabel: "Map", Icon: Map },
  ] as const;
  return (
    <nav
      aria-label="View"
      className="flex items-center rounded-full border border-line bg-surface p-0.5 text-sm"
    >
      {views.map(({ view, label, mobileLabel, Icon }) => (
        <a
          key={view}
          href={`?${serializeDirectoryQuery({ ...query, view })}`}
          aria-current={query.view === view ? "page" : undefined}
          className="flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3 aria-[current]:bg-primary-soft aria-[current]:font-bold aria-[current]:text-primary-text max-md:aria-[current]:hidden md:min-h-8"
        >
          <Icon aria-hidden="true" className="size-4" />
          <span className="max-md:hidden">{label}</span>
          <span className="md:hidden">{mobileLabel}</span>
        </a>
      ))}
    </nav>
  );
}
