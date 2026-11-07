# src/directory

The Directory's search logic ([ADR 0004](../../docs/adr/0004-search-filters-a-cached-snapshot-on-the-server.md)).
Plain TypeScript functions: no React, no database. Pages and components call them. Tests sit next
to each file (`*.test.ts`); run them with `pnpm test`.

## How a results page uses it

```ts
import { parseDirectoryQuery } from "@/directory/query";
import { searchDirectory } from "@/directory/results";

// In a page: searchParams comes from Next.js.
const query = parseDirectoryQuery(await searchParams);
const results = searchDirectory(snapshot, query);

results.programs;      // the cards to show, in order (each has distanceMiles and group)
results.totalPrograms; // for "24 results"
results.hasMore;       // show the "Show more" button
results.documents;     // "Guides and downloads"
results.counts;        // the number next to each filter checkbox
results.query;         // build the chips from this (bad filter values are already removed)
results.zipNotFound;   // show "We don't recognize that ZIP"
```

To change the URL after a click, build the next query and turn it into a URL:

```ts
import { clearFilters, removeFilter, serializeDirectoryQuery, toggleFilter } from "@/directory/query";

const href = `?${serializeDirectoryQuery(toggleFilter(results.query, "language", "spanish"))}`;
```

## Files

| File | What it does |
|---|---|
| `types.ts` | The shape of the data (`DirectorySnapshot`, `DirectoryProgram`, ...). The contract with the database side. |
| `query.ts` | Reads and writes the Directory state in the URL; chip and checkbox helpers. |
| `search.ts` | Keyword matching. |
| `filter.ts` | Filter matching (OR inside a group, AND between groups) and the counts. |
| `distance.ts` | Miles between two points. |
| `zip.ts`, `michigan-zips.ts` | ZIP code → map point, for Michigan. The table is generated; see its header. |
| `results.ts` | `searchDirectory`: puts it all together. |
| `snapshot.ts` | `getDirectorySnapshot()`: the data the pages use. The cached database loader. |
| `mapper.ts` | `toDirectorySnapshot()`: database rows → `DirectorySnapshot`. Pure; the only code that knows the tables. |
| `sample-snapshot.ts` | Made-up sample data, for the e2e tests (`DIRECTORY_SAMPLE_DATA=1`). |
| `test-fixtures.ts` | A small made-up snapshot for unit tests. |

## Where the snapshot comes from

`getDirectorySnapshot()` in `snapshot.ts`. Pages call only this function. It selects the public
columns of each table (never Internal notes, never private Contacts) in one `Promise.all`, and
`toDirectorySnapshot()` in `mapper.ts` turns the rows into a `DirectorySnapshot`: Status, Inheritance,
and the "In person and virtual" format. The result is cached (`"use cache"`, `cacheTag("directory")`,
`cacheLife("hours")`); the Admin will call `updateTag("directory")` after a save.

With `DIRECTORY_SAMPLE_DATA=1` it returns the made-up `SAMPLE_SNAPSHOT` instead (`sample-snapshot.ts`),
so the e2e tests need no database. Unit tests use `TEST_SNAPSHOT` from `test-fixtures.ts`.
