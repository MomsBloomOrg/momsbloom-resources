# Spec: public Directory

What families see and do. Capitalized terms (Program, Facet, ...) are defined in
[CONTEXT.md](../../CONTEXT.md). The screens are in [docs/design](../design/README.md).

This spec comes from the Dev Handoff doc (Option A), which described a Google Sheet and one
JavaScript file. Most of the behavior stays the same. What changes for our stack is marked
**Changed for Option C**.

## Goal

A tired parent on a phone can answer "What's available to me, and what's closest and fits my
needs?" in under a minute. Today the list is a long static page with no search. Success is a
directory on momsbloom.org/resources that families use more than the old list.

## Where the code lives

- `src/app/embed/page.tsx` is the page that momsbloom.org shows in the iframe. The Directory goes
  inside its `<main id={EMBED_ROOT_ID}>`, so the iframe keeps its correct height.
- **Changed for Option C:** do not build the site header (logo, menu, Donate) that the designs
  show. Squarespace shows it above the iframe.
- The data comes from the database through server code. Never send Internal notes, or any
  Inactive record, to the browser.

## Data that families see

Only records whose **Status** is `Active` or `Needs review`. A Program is hidden when its
Organization is Inactive.

For each **Program**: name, Organization name, description, Categories and Subcategories, address
(with **Inheritance**), phone, website, hours, cost, accepts insurance, insurance plans, languages,
who it serves, eligibility notes, **Service format**, Last verified, Contacts with "Show on
website" set to yes, and the Organization's other Programs.

For each **Document**: title, description, Categories, Subcategories, languages, PDF link, Last
verified.

## Search

- One keyword box. Search runs across: Program name, Organization name, description, search
  keywords, Category and Subcategory names, and Contact names and titles. Documents search their
  title, description, keywords, and Categories.
- Not case-sensitive, matches part of a word ("lact" finds "Lactation"), ignores extra spaces.
- Search runs about 250 ms after the family stops typing (this delay is called "debounce"). The
  Search button and the Enter key also run it.
- Typing an Organization's name (for example "Corewell") returns all of its Programs.
- The "popular" quick picks set the Category filter, not the keyword.

**How search runs** ([ADR 0004](../adr/0004-search-filters-a-cached-snapshot-on-the-server.md)):
the server searches, filters, counts, and pages a cached copy of all public data, in plain
TypeScript. Write that logic as pure functions in `src/directory/` (no React and no database
inside), and test them with Vitest. The page reads its state from the URL (`searchParams`).
While new results load, keep the old ones on screen (React's `useTransition`).

## Filters

The Facets, in this order: Distance, Type of support (Category with its Subcategories indented
under it), Insurance, Cost, Language, Who it serves, How you'll connect (Service format).

- Inside one group, options combine with OR: "Medicaid or Priority Health".
- Between groups, they combine with AND: "Medicaid and Spanish".
- Checking a Category does not check its Subcategories. Each Subcategory filters on its own.
- Each group shows its first 4 options and a "Show all" link. Options are in the same order as the
  Facet value list that staff manage.
- Each checked option shows as a chip above the results. The chip's "x" removes that filter.
  "Clear all" removes every filter but keeps the keyword and the ZIP code.
- Stretch goal: a count next to each option, which shows how many results you would get with that
  option, given the other active filters. Hide options with a count of 0 (do not grey them out).

## Distance

- The family types a ZIP code or selects "Use my location".
- Look up the ZIP code in a small table of Michigan ZIP code centers that ships with the app (the
  US Census publishes these for free).
- **The ZIP code and the location go only to our own server.** They never go to another company,
  and never to analytics. "Use my location" sends `near=lat,lng`, rounded to 2 decimals (about
  1 km), so the URL never holds an exact home address. `near` is never copied to the host page URL
  (see "Sharing a link").
- Distance is a straight line (the "haversine" formula), in miles, with one decimal: "0.8 mi".
- Radius options: 5, 10, 25, Any. The default is Any until a ZIP code is entered, then 10.
- Distance applies to Programs only. Programs that are virtual only, or have no coordinates, show
  in a "Virtual and phone" group and are never hidden by the radius. Documents always show.
- Sort options: Nearest (the default when a ZIP code is set), A to Z, Recently verified.

## Results

- Two groups: "Places near you" (Program cards), then "Guides and downloads" (Document cards).
- Show 10 Program cards, then a "Show more" button that asks the server for the next 10.
- The result line reads `24 results for "yoga" within 10 mi of 49508`. Leave out the parts that are
  not set.
- **Program card** (see `desktop-directory-list.png`): Organization name, Program name, distance,
  tags (Facet values), description cut to 3 lines, address, phone (a `tel:` link, so a phone can
  call it), website, a row of facts (insurance summary, cost, languages, format), the first Contact
  plus "+N more", and "View details".
- **Document card:** title, description, tags, "PDF" and languages, and "Download".
- The green box "Can't find what you need?" (call or text 211, or contact MomsBloom) always comes
  last.

## Program detail

See the four `*-detail-*.png` captures.

- Opens when the family selects "View details", and scrolls to the top.
- "Back to results" returns to the same results, filters, and scroll position.
- Mobile: one column, with Call, Directions, and Website at the top. Desktop: two columns, with the
  actions, location, and "More from ..." on the right. Below 900 px wide it becomes one column.
- "Part of [Organization]" and "See all programs at ..." open the results filtered to that
  Organization.
- Directions opens Google Maps with the address. Website opens in a new tab.
- Hide "More from ..." when the Organization has only one Program.
- "Report a change" links to a form. **Open question:** MomsBloom must give us the link.

## Sharing a link

The handoff doc keeps all state in the URL, so a family can text a link and the other person sees
the same results. Examples: `?q=yoga&zip=49508&r=10&cat=Yoga` for results, and a Program ID for
the detail view.

The family never sees the iframe URL, so the iframe tells the host page its state with a `location`
message. `embed.js` writes it into the host page URL with the prefix `mbr-` (`mbr-q=yoga`,
`mbr-program=P-101`), so it never clashes with Squarespace's own `?q=`. When a family opens a link
with those keys, `embed.js` passes them to the iframe. The URL changes with `replaceState`, and
only when the page has one Embed. See [ADR 0005](../adr/0005-shared-links-through-the-host-page-url.md).

`near` is never shared: a link holds the ZIP code, never the family's location.

## Mobile filter sheet

See `mobile-filters-sheet.png`.

- The "Filters" button opens a sheet from the bottom with the same groups. The number on the button
  is the count of active filters.
- Results update underneath while the sheet is open. The footer button reads "Show 24 results" and
  closes the sheet.
- While the sheet is open, the keyboard focus stays inside it ("focus trap"). When it closes, focus
  goes back to the Filters button.

## Map view (stretch goal)

See `desktop-directory-map.png`. Build it only after everything above works.

- Leaflet with OpenStreetMap tiles: free, no API key.
- The map shows the same filtered Programs as the list. Selecting a card highlights its pin, and
  the reverse.
- A note tells families that Documents are in the list view.
- The map fits the Program pins. It never centers on the family's ZIP code or location, and it has no
  "you are here" marker.
- OpenStreetMap gets only tile requests: the map area, and the page origin as the Referer. It never
  gets `near` or the ZIP code.
- The map shows the Programs on the shown pages (10, then "Show more" adds 10). Programs at the same
  address share one pin. Virtual and phone Programs stay cards with no pin.
- If time is short, skip the map. The Directions link on each Program covers most of its value.

## States and edge cases

These states are not designed yet (see the designer's to-do list). Until they are, use this text
and the style of the existing screens.

| Situation | What the family sees |
|---|---|
| First load | Grey placeholder cards ("skeletons") in the results, filters disabled. |
| Loading after a change | The old results stay on screen, slightly faded, until the new ones arrive. Filters stay usable. |
| The data does not load | "We couldn't load the directory right now. Call 211 or contact MomsBloom and we'll help you look." and a "Try again" button. |
| No results | `No matches for "yoga" with these filters.` Buttons: "Clear filters", "Widen to 25 mi". The 211 box stays. |
| ZIP code not found | Under the field: "We don't recognize that ZIP. Try a Michigan ZIP code." Keep the previous results. |
| Location permission refused | Put the cursor in the ZIP field. No error message box. |
| Program with no address | No distance and no pin. The card shows its format (Virtual, Phone) instead of an address. |
| Organization with one Program | The detail view hides "More from ...". |
| Website is not a real URL | Hide the Website link. Some rows hold a page title instead of a URL. |
| Unknown or Inactive Program link | Show the results with a small note: "That resource isn't available anymore." |
| Status Needs review | Show it normally. Nothing changes for families. |

## Accessibility (WCAG 2.1 AA)

- Contrast: use `primary-text` (#B35400) for orange text, links, and button backgrounds with white
  text. The bright orange fails (about 2.6:1). Tag text is `ink`, not green. See
  `src/app/globals.css`.
- Everything works with the keyboard only, with a visible focus ring.
- Each filter group is a `<fieldset>` with a `<legend>`. Checkboxes are real `<input type="checkbox">`.
- The result count is in an `aria-live="polite"` region, so screen readers announce "24 results"
  after each change.
- Tap targets are at least 44 by 44 px on phones, including the "x" on chips.
- Icons next to text are decorative (`aria-hidden="true"`); the text carries the meaning.
- The map is never the only way to reach a Program.
- Respect `prefers-reduced-motion` for the sheet animation.

## Analytics

The site uses Google Analytics 4 (`G-1QJ4VJRFP1`). Events: `directory_search` (keyword, result
count), `directory_filter` (group, value), `directory_zero_results`, `program_view` (Program ID),
`program_call`, `program_directions`, `program_website`, `document_download`. Zero-result searches
are the most useful signal: they show which resources are missing. **Never send ZIP codes,
location, or any free text except the keyword.**

> **Open question: analytics from inside the iframe (Changed for Option C).** GA on momsbloom.org
> cannot see clicks inside our iframe. Recommendation: the iframe sends each event to the host page
> with `postMessage`, and `embed.js` calls the host page's `gtag()`. Then the events land in the
> same GA4 property as the rest of the site, with no cookies set by our app.

## Acceptance checklist

A volunteer marks a slice done only when its items pass on an iPhone, an Android phone, and
desktop Chrome, inside the Squarespace test page.

- [ ] Typing "Corewell" returns every Corewell Program.
- [ ] A Contact's name finds their Program.
- [ ] Two insurance options give more results; adding a language gives fewer.
- [ ] Entering 49508 sorts by distance. Virtual Programs and Documents still show at 5 mi.
- [ ] Every chip removes its filter. "Clear all" keeps the keyword and ZIP code.
- [ ] A shared link restores the same results. (How depends on the open question above.)
- [ ] A Program's detail view opens. Back returns to the same results and scroll position.
- [ ] Call, Directions, and Website work on a phone.
- [ ] A Program with a blank address shows its Organization's address.
- [ ] Inactive records never appear. Internal notes are never in the page source.
- [ ] **Changed for Option C:** a change saved in the Admin shows in the Directory on the next page
      load. (The handoff doc allowed 5 minutes for a Google Sheet.)
- [ ] The page works when reached from the Squarespace menu, not only on a refresh.
- [ ] Keyboard only: every filter, chip, card, and the sheet can be reached and used.
- [ ] When the data fails to load, the error state and the 211 text show.
- [ ] The iframe never shows its own scroll bar (the existing Playwright test still passes).
