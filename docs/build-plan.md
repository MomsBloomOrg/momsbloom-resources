# Build plan

The MomsBloom Resource Directory, built at the Code for Good WM Weekend for Good (November 2026).
A searchable directory of Programs for pregnant and postpartum families, embedded in
momsbloom.org/resources, with an Admin for three MomsBloom staff members.

Terms follow [CONTEXT.md](../CONTEXT.md). Last updated 2026-11-07.

## Status

| Slice | Status | Where |
|---|---|---|
| `repo-intent` | Done | [docs/intent/repo-init.md](intent/repo-init.md) |
| `app-skeleton-and-embed` | Done. Live at resources.momsbloom.org; embed tested on momsbloom.org/resources-test (desktop and phone, Chrome). | `src/app/embed/`, `public/embed.js`, `src/embed/` |
| `vercel-and-dns` | Done. Vercel GitHub integration; `resources` CNAME in Squarespace DNS. | [README](../README.md) "Put it online" |
| `design-captures` | Done (screenshots; Figma is view-only for us). | [docs/design](design/README.md) |
| `context-and-specs` | Done | [CONTEXT.md](../CONTEXT.md), [docs/specs](specs/) |
| `directory-core-functions` | Done. Search, filters, counts, distance, sorting, pages, Michigan ZIP centers; 53 unit tests. | `src/directory/` |
| `database-schema` | In progress (another developer) | `src/db/schema.ts` |
| `directory-list-view` | Done (list view, desktop and mobile, on sample data with a "Sample data" note). Next: mobile filter sheet, Program detail, empty and error states. | `src/app/embed/`, `src/directory/snapshot.ts`, `e2e/directory.spec.ts` |
| `directory-empty-error-states` | Done. Error screen with "Try again", "Clear filters" and "Widen to 25 mi" buttons, ZIP message for a ZIP that is not 5 digits. | `src/app/embed/`, `e2e/directory.spec.ts` |
| `program-detail-page` | Done. `/embed/programs/[id]` (no-map design, two columns from 900 px), "More from" list, unknown Program redirects to results with a note, new `scroll` embed message. | `src/app/embed/programs/`, `e2e/program-detail.spec.ts` |
| `mobile-filter-sheet` | Done. Below 768 px, "Filters" opens a bottom sheet (native `<dialog>`, focus trap, "Show N results"); in the iframe it fills the visible part of the screen. Without JavaScript, the link still jumps to the column. | `src/app/embed/_components/filter-sheet.tsx`, `e2e/directory.spec.ts` |
| `embed-link-sync` | Done. The iframe posts a `location` message; `embed.js` writes `mbr-` keys (and `mbr-program`) into the host page URL with `replaceState`, and reads them on load. `near` and `n` are never shared. | [ADR 0005](adr/0005-shared-links-through-the-host-page-url.md), `public/embed.js`, `e2e/embed.spec.ts` |
| `directory-snapshot-loader` | Blocked on the schema. Cached loader + mapper (tables → `DirectorySnapshot`), `cacheComponents: true`, `updateTag("directory")`. | [ADR 0004](adr/0004-search-filters-a-cached-snapshot-on-the-server.md) |
| `seed-import` | Blocked on the schema. | [data import spec](specs/data-import.md) |
| `admin-login` | Blocked on the schema (Auth.js tables) and on Resend domain setup. | [ADR 0003](adr/0003-admin-login-by-email-link-first.md), [admin spec](specs/admin.md) |
| `admin-pages` | After `admin-login`. No design yet: plain forms. | [admin spec](specs/admin.md) |
| `directory-map-view` | Done. List/Map toggle (`view=map`), Leaflet map beside numbered cards, pins for the shown pages; small 200 px map in the detail page Location card (hidden without a location or for virtual-only Programs). | `src/app/embed/_components/program-map.tsx`, `e2e/directory-map.spec.ts`, [public directory spec](specs/public-directory.md) |

## Decisions

| Decision | Record |
|---|---|
| pnpm is the package manager | [ADR 0001](adr/0001-pnpm-is-the-package-manager.md) |
| Vercel deploys from GitHub (no GitHub Action deploy) | [ADR 0002](adr/0002-vercel-deploys-from-github.md) |
| Admin login by email link (Resend) first; Microsoft 365 later | [ADR 0003](adr/0003-admin-login-by-email-link-first.md) |
| Search filters a cached snapshot on the server | [ADR 0004](adr/0004-search-filters-a-cached-snapshot-on-the-server.md) |
| Shared links go through the host page URL (`mbr-` keys) | [ADR 0005](adr/0005-shared-links-through-the-host-page-url.md) |
| The spreadsheet is a one-time seed; the database is the source of truth after it | [data import spec](specs/data-import.md) |
| The embed is an Embed (or Code) block holding `embed.js`, full width | [README](../README.md) "How the embed works" |

## Open questions

Each has a recommendation in its spec. Decide, then record it in an ADR.

| Question | Recommendation | Where |
|---|---|---|
| Analytics from inside the iframe | The iframe sends events with `postMessage`; `embed.js` calls the host page's `gtag()` (GA4 `G-1QJ4VJRFP1`). | Public directory spec, "Analytics" |
| Spreadsheet values not on the Lists tab (9 today) | The dry run lists them; `--write` refuses until they are fixed in the spreadsheet. | Data import spec |
| Map coordinates for new addresses | US Census geocoder on save; staff can type coordinates if it fails. | Admin spec |
| Lists rows 31 and 32 ("Home Visiting (Hope, add please?)", "Financial Assistance" with no Category) | A person at MomsBloom decides. | Data import spec |
| "Report a change" form link | MomsBloom provides it. | Public directory spec |

## Follow-ups found during the work

- [x] **Spec fix:** the public directory spec says browser location "stays in the browser". With
      server search, "Use my location" sends `near=lat,lng` (rounded to about 1 km) to our server.
      Update the spec, and say `near` is never copied to the host page URL.
- [ ] Turn on `cacheComponents: true` in `next.config.ts` with the snapshot loader (not before:
      it changes how pages render).
- [ ] When the schema lands, check it against `src/directory/types.ts` and the data import spec's
      column list.
- [ ] Skeleton on first load: add with the snapshot loader, as a Suspense boundary around the results only (the search form stays outside it, so no-JS still works).
- [ ] Test the embed in Safari and on iOS, and when reached from the Squarespace menu.
- [ ] The README says a Code block also works; only the Embed block was tested.
- [ ] Ask the designer for the Admin design and the empty, loading, and error states (Designer To Do list).
