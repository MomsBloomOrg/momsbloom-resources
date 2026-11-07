import { PAGE_SIZE, serializeDirectoryQuery, type DirectoryQuery } from "@/directory/query";

/** Asks the server for the next 10 Programs (one more page in the URL). */
export function ShowMore({ query, remaining }: { query: DirectoryQuery; remaining: number }) {
  return (
    <a
      href={`?${serializeDirectoryQuery({ ...query, pages: query.pages + 1 })}`}
      className="flex min-h-12 items-center justify-center rounded-full border border-line bg-surface font-bold hover:border-muted"
    >
      Show {Math.min(remaining, PAGE_SIZE)} more {remaining === 1 ? "place" : "places"}
    </a>
  );
}
