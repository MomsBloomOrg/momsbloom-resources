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
| `database-schema` | Done. The team made the tables in the database; `schema.ts` is pulled from it (`drizzle-kit pull`), with `drizzle/` as the migration baseline. | `src/db/schema.ts`, `drizzle/` |
| `directory-list-view` | Done (list view, desktop and mobile, on sample data with a "Sample data" note). Next: mobile filter sheet, Program detail, empty and error states. | `src/app/embed/`, `src/directory/snapshot.ts`, `e2e/directory.spec.ts` |
| `directory-empty-error-states` | Done. Error screen with "Try again", "Clear filters" and "Widen to 25 mi" buttons, ZIP message for a ZIP that is not 5 digits. | `src/app/embed/`, `e2e/directory.spec.ts` |
| `program-detail-page` | Done. `/embed/programs/[id]` (no-map design, two columns from 900 px), "More from" list, unknown Program redirects to results with a note, new `scroll` embed message. | `src/app/embed/programs/`, `e2e/program-detail.spec.ts` |
| `mobile-filter-sheet` | Done. Below 768 px, "Filters" opens a bottom sheet (native `<dialog>`, focus trap, "Show N results"); in the iframe it fills the visible part of the screen. Without JavaScript, the link still jumps to the column. | `src/app/embed/_components/filter-sheet.tsx`, `e2e/directory.spec.ts` |
| `embed-link-sync` | Done. The iframe posts a `location` message; `embed.js` writes `mbr-` keys (and `mbr-program`) into the host page URL with `replaceState`, and reads them on load. `near` and `n` are never shared. | [ADR 0005](adr/0005-shared-links-through-the-host-page-url.md), `public/embed.js`, `e2e/embed.spec.ts` |
| `embed-analytics-events` | Done. The iframe posts an `event` message; `embed.js` checks it against an allow-list and calls the host page's `gtag("event", ...)`. Custom dimensions in GA4 are for MomsBloom to register after the deploy. | [ADR 0006](adr/0006-analytics-events-through-the-host-page.md), `src/app/embed/_components/analytics-reporter.tsx`, `e2e/analytics.spec.ts` |
| `directory-snapshot-loader` | Done. Cached loader (`cacheLife("max")`) + mapper (tables → `DirectorySnapshot`), `cacheComponents: true`. Admin saves call `updateTag("directory")`. | [ADR 0004](adr/0004-search-filters-a-cached-snapshot-on-the-server.md) |
| `seed-import` | Done (seeded outside the repo). | [data import spec](specs/data-import.md) |
| `admin-login` | Done. Login link by email (Auth.js + Resend), allow-list in `ADMIN_EMAILS`, rate limits, database sessions, Admin shell at `/admin` with a placeholder home. Follow-up: run migration `0001` on the Neon dev branch and on prod (`migrate-dev-prod`), then set the Vercel env. | [ADR 0003](adr/0003-admin-login-by-email-link-first.md), [admin spec](specs/admin.md) |
| `migrate-dev-prod` | Next. Run `pnpm db:migrate` (migration `0001`, login tables; and `0002`, the `hidden` column of the Facet values, from `facet-settings`) on the Neon dev branch, test a login on a Preview, then on prod. Until then, `/login` on that database says it could not send the link. | `drizzle/0001_*.sql`, `drizzle/0002_*.sql` |
| `admin-pages` | In progress, six slices. `admin-nav-and-org-list` done: nav (Organizations, Documents, Settings), UI kit, Organizations list at `/admin` with search, Status filter and sort, `createTestDb()`, `pnpm db:seed-sample`. `org-edit` done: Organization create and edit with its Programs table, Mark verified, `updateTag("directory")` on save, snapshot `cacheLife("max")`. `facet-settings` done: Filter options at `/admin/settings` (add, rename, move, hide, delete unused), migration `0002`; the Directory filters leave hidden values out. Run migration 0002 on Neon (dev, then prod) before this merges; the snapshot loader selects `hidden`. `program-edit` done: Program create and edit at `/admin/programs/new?org=ID` and `/admin/programs/[id]` with Facet values (join tables replaced in one transaction), Inheritance placeholders, Mark verified, and View on site. `contacts-and-documents` done: Contacts section on the Program page (add, edit, remove; only public Contacts reach the Embed) and Documents at `/admin/documents` (list, create, edit; the nav link is live). `address-geocoding` done: saving an Organization or Program with a new or changed street address asks the US Census geocoder for coordinates (5 s timeout); on failure the save still works and a notice asks staff to type them. | [admin spec](specs/admin.md) |
| `admin-users` | Done. Staff admins page at `/admin/staff-admins`: Owners from `ADMIN_EMAILS` plus Staff admins added in the Admin (`staff_admins.added_at`, migration `0003`); add (no email), remove (sessions and open Login links go at once); no remove of an Owner or yourself. Migration 0003 ran on Neon dev and prod before the merge; every login reads `added_at`. | [ADR 0003](adr/0003-admin-login-by-email-link-first.md), [admin spec](specs/admin.md) |
| `design-refresh` | Done. Captures taken again at native size from Figma: new list view, "No distance" list (desktop, mobile), mobile map view, Organization detail (desktop), and the Admin resource list. Specs updated where the design changed; open questions are in the specs. | [docs/design](design/README.md) |
| `directory-map-view` | Done. List/Map toggle (`view=map`), Leaflet map beside numbered cards, pins for the shown pages; small 200 px map in the detail page Location card (hidden without a location or for virtual-only Programs). | `src/app/embed/_components/program-map.tsx`, `e2e/directory-map.spec.ts`, [public directory spec](specs/public-directory.md) |

## Decisions

| Decision | Record |
|---|---|
| pnpm is the package manager | [ADR 0001](adr/0001-pnpm-is-the-package-manager.md) |
| Vercel deploys from GitHub (no GitHub Action deploy) | [ADR 0002](adr/0002-vercel-deploys-from-github.md) |
| Admin login by email link (Resend) only; Microsoft 365 SSO dropped | [ADR 0003](adr/0003-admin-login-by-email-link-first.md) |
| Search filters a cached snapshot on the server | [ADR 0004](adr/0004-search-filters-a-cached-snapshot-on-the-server.md) |
| Shared links go through the host page URL (`mbr-` keys) | [ADR 0005](adr/0005-shared-links-through-the-host-page-url.md) |
| Analytics events go through the host page's `gtag()` | [ADR 0006](adr/0006-analytics-events-through-the-host-page.md) |
| The spreadsheet is a one-time seed; the database is the source of truth after it | [data import spec](specs/data-import.md) |
| The embed is an Embed (or Code) block holding `embed.js`, full width | [README](../README.md) "How the embed works" |

## Open questions

Each has a recommendation in its spec. Decide, then record it in an ADR.

| Question | Recommendation | Where |
|---|---|---|
| Spreadsheet values not on the Lists tab (9 today) | The dry run lists them; `--write` refuses until they are fixed in the spreadsheet. | Data import spec |
| Lists rows 31 and 32 ("Home Visiting (Hope, add please?)", "Financial Assistance" with no Category) | A person at MomsBloom decides. | Data import spec |
| "Report a change" form link | Answered: the MomsBloom Microsoft Form (issue #44). | Public directory spec |

## Follow-ups found during the work

- [x] **Spec fix:** the public directory spec says browser location "stays in the browser". With
      server search, "Use my location" sends `near=lat,lng` (rounded to about 1 km) to our server.
      Update the spec, and say `near` is never copied to the host page URL.
- [x] Turn on `cacheComponents: true` in `next.config.ts` with the snapshot loader (not before:
      it changes how pages render).
- [x] When the schema lands, check it against `src/directory/types.ts` and the data import spec's
      column list.
- [x] ~~Skeleton on first load~~ Not done, on purpose: streamed Suspense content stays hidden when JavaScript is off, so it breaks the no-JS promise. The snapshot is cached, and `DirectoryLive` already fades old results. Later, a spinner on the Host page (in `embed.js`, outside the iframe) replaced the skeleton (#84).
- [ ] Test the embed in Safari and on iOS, and when reached from the Squarespace menu.
- [ ] The README says a Code block also works; only the Embed block was tested.
- [ ] Ask the designer for the Admin design and the empty, loading, and error states (Designer To Do list).
