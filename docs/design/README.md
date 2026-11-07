# Design captures

These are screenshots of the Figma designs for the resource directory. The first captures were taken
on 2026-11-07 and refreshed later the same day, at the native size of each frame. The Figma file is
[WFG 2026 - MomsBloom](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom),
pages "Resources Page Designs" and "Admin Designs". The Figma file is the source of truth: if a
screenshot here and Figma disagree, Figma wins. Each section links to its frame, so you can open
it and measure spacing, colors, and text in Figma. (Most of us have view access only, so Figma will not let us export.)

The data in the designs is made up ("Maria Sample", `example.org`). The real data comes from the
MomsBloom spreadsheet, which the database will import.

## Read this first

- **Every frame shows the MomsBloom site header** (logo, menu, Donate button). Do not build that
  header. Families see our app inside an iframe on momsbloom.org, and Squarespace already shows
  the header above it. Start at the part below the header.
- **Some screens are not designed yet.** The designer's to-do list (at the end of this page) still
  has the page before a search, the "no results" page, the loading state, and the error states. The
  Admin has one screen so far (the resource list, below). Until those exist, use the text in the
  Dev Handoff doc ("States and edge cases"), and keep the style of the screens below.
- Colors and the font are already set up in `src/app/globals.css` (Tailwind classes such as
  `bg-primary`, `text-muted`) and `src/app/layout.tsx` (Nunito). Use those classes, not hex values.
- The bright orange (#FD7A00) fails the contrast rules for text. Use
  `primary-text` (#B35400) for links, button backgrounds with white text, and orange text. See the
  comment in `globals.css`.

## Directory: list view

The main screen. A family types a keyword and a ZIP code, narrows the results with filters, and
sees program cards ("Places near you") followed by document cards ("Guides and downloads").

### Desktop

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=94-5149)

![Desktop directory, list view](desktop-directory-list.png)

Notes:

- The filter column is on the left: distance, type of support (categories with subcategories
  indented below them), insurance, cost, language, and how you'll connect (in person or virtual).
  Each option shows a count.
- Each active filter shows as a dark chip above the results, with an "x" to remove it, and a
  "Clear all" link.
- "List" and "Map" switch the view. "Sort" offers Nearest (and more; see the handoff doc).
- The green box at the bottom ("Can't find what you need?") always shows at the end of the results.
- The heading is "Postpartum Resources", with the line "Find nearby support that fits your family,
  your insurance, and your needs." There is no small heading above it. The mobile list frame
  matches; the mobile map frame still has the older heading (see the spec).

### Mobile

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=5-353)

![Mobile directory, list view](mobile-directory-list.png)

Notes:

- The filters move into a sheet that opens from the "Filters" button (next section). The number on
  the button is how many filters are active.
- "Use my location" is an alternative to typing a ZIP code.

### No distance (desktop and mobile)

Figma calls these frames "Resources Landing - No Distance".

[Open desktop in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=95-1275)

[Open mobile in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=95-1710)

![Desktop directory, list view, no distance](desktop-directory-list-no-distance.png)

![Mobile directory, list view, no distance](mobile-directory-list-no-distance.png)

Notes:

- There is no ZIP code field, no "Use my location", and no Distance filter group.
- The result line has no "within ... of ..." part ("24 results for "yoga"").
- Desktop: no List/Map toggle, and the sort shows "Sort: A-Z". Mobile: Filters and a sort button
  only, no Map button.
- The cards still show a distance and the chips still show "Within 10 mi". We think that these are
  left over from the copied frame.
- Figma does not say when this version applies (see the open question in the public directory spec).

## Mobile filters sheet

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=5-585)

![Mobile filters sheet](mobile-filters-sheet.png)

Notes:

- The sheet slides up from the bottom and holds the same filter groups as the desktop column.
- Results update while the sheet is open. The button at the bottom shows the new count
  ("Show 24 results") and closes the sheet.

## Directory: map view

### Desktop

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=7-541)

![Desktop directory, map view](desktop-directory-map.png)

Notes:

- The map is a stretch goal. Build the list view first.
- Programs show as numbered pins. The pin and its card are linked: selecting one highlights the other.
- Documents do not show on the map. The orange note above the cards tells families to switch to the
  list to see them.

### Mobile

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=95-1903)

![Mobile directory, map view](mobile-directory-map.png)

Notes:

- The map sits above the cards, under "Places near you". A selected pin shows a small card with the
  Program name, the Organization, the distance, and "Get directions".
- The "Map" button becomes "List View".
- "Show 16 more places" and "Guides and downloads" follow the cards, as in the list view.

## Program detail

The page for one program. It opens when a family selects "View details" on a card.

### Desktop, with map

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=20-858)

![Desktop program detail, with map](desktop-detail-with-map.png)

### Desktop, no map

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=21-884)

![Desktop program detail, no map](desktop-detail-no-map.png)

### Mobile, with map

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=7-726)

![Mobile program detail, with map](mobile-detail-with-map.png)

### Mobile, no map

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=21-1050)

![Mobile program detail, no map](mobile-detail-no-map.png)

Notes for all four:

- "Part of Riverbend Health" names the organization that runs the program. It links to results
  filtered to that organization.
- Call, Directions, and Website are the main actions. On mobile they sit at the top.
- "More from Riverbend Health" lists the organization's other programs. Hide this section when the
  organization has only one program.
- The "no map" versions are the fallback if we cut the map. The mobile "no map" frame also shows
  two contacts, a "Who to contact" heading, and a phone number per contact.
- "Last verified" comes from the data and tells families how fresh the information is. On desktop,
  a "Request an update" link follows it.

## Organization detail (desktop)

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=107-3795)

![Desktop organization detail](desktop-organization-detail.png)

Notes:

- The page for one Organization: "Back to results", the Organization name, its tags, "About", and
  "Programs at [Organization]" (each Program with its tags and an arrow to its Program detail).
- On the right: Call, Directions, and Website, then "Location" with a map and the address.
- "Last verified" and "Request an update" at the bottom.
- There is no mobile frame yet. Use the mobile Program detail as the guide.
- Build work: issue #37.

## Components

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=3-34)

![Components](components.png)

The small pieces that repeat on every screen: the primary button (orange, fully rounded), the
secondary button (white with a border), a filter chip (dark, with an "x"), a tag (light green), and a
checkbox row with a count. Build each one once and reuse it.

The program card and the document card are Figma components too. You can see both in the desktop
list view above.

## Icons

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=3-4)

![Icons](icons.png)

There are 14 icons, at 16 px with a 1.5 px line: search, map pin, close (x), check, file, chevron
down, phone, globe, map, list, arrow right, download, filter, and user. They look like the free
[Lucide](https://lucide.dev/icons) icon set (the `lucide-react` package). Compare them in Figma
before you add that package.

## Branding

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=1-722)

![Branding](branding.png)

This capture is from the first set; the refresh did not take it again. The logo in orange and in
white, and the three brand colors: green (#9DBB86), orange (#FD7A00), and white. The embed does
not show the logo, because the Squarespace header already does.

## Designer to-do list

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=21-1172)

![Designer to-do list](designer-to-do.png)

The list did not change. The "Admin Designs" page now has the resource list (below), so the first
item has started.

## Admin: resource list

Page "Admin Designs".

[Open in Figma](https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=110-14021)

![Admin resource list](admin-resource-list.png)

Notes:

- The Admin frame shows the MomsBloom site header too. The Admin is not in the Embed, so this
  header is not ours to build either; keep the Admin header we have.
- Title "Resources Admin" and a "New Resource" button.
- Tabs: All, Organizations, Guides & Downloads, with "Sign Out" on the right of the tab row.
- A search box ("Search for name, organization, or keyword"), a "Type" menu, a "Status" menu, and a
  "Show Deleted" checkbox. Then the result count.
- A table with Name (a link), Type, and Status. The Type column shows an Organization name for a
  Program row and "Organization" for an Organization row.
- Status badges: Active (green), Inactive (gray), and Deleted (red). "Deleted" is not a Status in
  CONTEXT.md.
- The capture shows the Organizations tab selected. "Needs review" is not shown.
- Build work: issue #38.

## Not captured

The Option B frames (Airtable and Softr) are on the same Figma page. We do not use them, because the
team chose Next.js and Neon instead. The "Cover" and "Design Exploration" pages are also not here.
