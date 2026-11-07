# Search filters a cached snapshot on the server

Status: accepted, 2026-11-07.

The Directory needs keyword search, filters with counts, distance, sorting, and "Show more"
(see [the public directory spec](../specs/public-directory.md)). Today there are 52 Programs, and
the list may grow. We had to choose where the search runs.

The server does the search, one page at a time, but not in SQL. A cached function loads every
public Program and Document from the database once. We call that copy the "snapshot". Each request
then searches, filters, counts, sorts, and cuts out one page of that snapshot in plain TypeScript.
The database is read again only when a staff member saves a change.

This is the same approach that bikegr-calendar uses for its events (`src/agenda/cache.ts` there).

## Considered options

- **Send all the data to the browser and filter there.** Every click is instant, and it was our
  first idea. But the download grows with the data. At a few thousand Programs it gets slow on a
  phone, and the page shows nothing until the download finishes.
- **Filter and page in SQL.** It has no size limit. But each request needs one query for the
  results plus seven more for the filter counts (one per Facet, each with the other filters
  applied). Searching part of a word ("lact" for "Lactation") needs the `pg_trgm` extension, and
  distance needs math in SQL. Every keystroke would also reach Neon, and Neon's free plan pauses
  the database when idle, so the first query after a pause waits about half a second. That is a
  lot of work this weekend for a size we may never reach.

## Consequences

- **The search code is plain functions** in `src/directory/`: search, filter, count, sort by
  distance, and cut a page. No React and no database inside, so Vitest can test them with small
  made-up lists. Most of the Directory's logic lives here, and it is the easiest part to test.
- **The URL holds the state.** The page reads `searchParams` (`?q=yoga&zip=49508&r=10&cat=...`), so
  every result page has its own URL, and the first page arrives as finished HTML.
- **Caching.** Turn on `cacheComponents: true` in `next.config.ts`. The snapshot loader uses
  `"use cache"`, `cacheTag("directory")`, and `cacheLife`. Every Admin save calls
  `updateTag("directory")`, so the next page load shows the change. Read how bikegr-calendar does
  this before you start: it also explains `"use cache: remote"`, which lets all Vercel servers
  share one snapshot.
- **Each filter change is a trip to the server** (about 100 to 200 ms, but not to the database).
  Wait about 250 ms after typing stops before searching (debounce), and use React's
  `useTransition`, so the old results stay on screen until the new ones arrive.
- **"Show more"** asks the server for the next 10 results.
- **Never put Internal notes, or Inactive records, in the snapshot.** The snapshot is for public
  pages only. The Admin reads the database directly.
- **When to change this:** if the snapshot grows past about 10,000 Programs, or past the Vercel
  cache size limit, replace the inside of the snapshot loader with SQL queries. The functions in
  `src/directory/`, the URLs, and the pages stay the same.
