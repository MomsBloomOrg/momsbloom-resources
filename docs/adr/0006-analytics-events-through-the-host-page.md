# Analytics events go through the host page

Status: accepted, 2026-11-07.
Changed 2026-11-07 (#67): record events carry the public name next to the ID.

The site momsbloom.org uses Google Analytics 4 (GA4, `G-1QJ4VJRFP1`). Squarespace loads it. But the
Directory runs in an iframe, and GA4 on the host page cannot see a click inside an iframe. The spec
lists the events that MomsBloom wants (search, zero results, filter, Program view, call, directions,
website, download). We had to choose how those events reach the same GA4 property as the rest of the
site.

The iframe tells the host page about each event, and `public/embed.js` calls the host page's own
`gtag()`. Our app loads no Google script and sets no cookie.

- **The `event` message.** The iframe sends
  `{ type: "momsbloom-resources:event", name, params }` to the host page. `src/embed/protocol.ts`
  checks the message, and `embed.js` checks it again.
- **A list of allowed events.** Only these names pass, each with only these parameter keys. Any other
  name, or any other key, drops the whole message. The list is `ANALYTICS_EVENTS` in
  `src/embed/protocol.ts`, and `embed.js` has a copy.
  - `directory_search`: `search_term`, `result_count`
  - `directory_zero_results`: `search_term`, `filters` (the checked Facet value keys, joined with ",")
  - `directory_filter`: `filter_group` (for example `insurance`), `filter_value` (for example `medicaid`)
  - `program_view`, `program_call`, `program_directions`, `program_website`, `program_share_copy`, `program_share_email`: `program_id`, `program_name`
  - `organization_view`: `organization_id`, `organization_name`
  - `document_download`: `document_id`, `document_title`

  A string is at most 100 characters (the GA4 limit). A number is finite and not negative.
- **`embed.js` builds the call.** It copies only the allowed keys into a new object. It never passes
  the message object to `gtag`. It calls `window.gtag("event", name, params)` inside `try`, and only
  if `typeof window.gtag === "function"` at the time of the event. With no `gtag`, the event is
  dropped. There is no queue and no error. It works with more than one Embed on a page.
- **The keyword is the only free text.** The iframe sends it as GA4's standard `search_term`, so it
  fills the built-in "Search term" report with no setup. A keyword is cut to 100 characters. A keyword
  with `@`, or with 5 or more digits in a row, becomes `(redacted)`: it may be an
  email, a phone number, or a ZIP code. Before it counts the digits, it ignores spaces and these
  characters: `-`, `.`, `(`, `)`, `/`, `_`. It does not ignore `,` or `+`. So "616-555-1234" is
  redacted, and "ages 0-5" is not. `embed.js` does the same check again. It also drops an event whose
  `program_id`, `organization_id`, or `document_id` is not a valid ID. A name that a family types still goes through. Contact names
  are a real search feature, so a name filter would remove useful data. We do not send the GA4
  `search` event: it would mix Directory searches with Squarespace site searches.
- **A search is sent 1 second after the results settle.** A new keyword cancels the wait, so "yo",
  "yog", "yoga" send one event. The first load of a page sends nothing: a shared link, a reload, and
  "Back to results" are not new searches. A search is lost if the family leaves the page within 1
  second. If the numbers look low, add a flush on `pagehide`.
- **ID and public name.** Record events carry the ID (the stable key) and the public name, so a
  report is readable without a lookup. A renamed record shows its old name in old reports. Names are
  business or memorial names that staff enter, not family input, so they are not redacted. They are
  cut to 100 characters (`eventText`).
- **No ZIP code and no location.** `zip`, `near`, `r`, and `n` are not event parameters, and no
  event holds them. ADR 0005 keeps them out of the host page URL, because GA4 records that
  URL as `page_location` (the open question `zip-in-page-location` is closed there). The `filters`
  parameter holds only Facet value keys that exist in the Directory, never raw text from the URL.
- **Consent is not bypassed.** We never call `gtag("consent", ...)`, never load `gtag.js`, never use
  the Measurement Protocol, and never set `send_to`. If MomsBloom turns on the Squarespace cookie
  banner, its Consent Mode applies to our events with no change, because they go through the host
  `gtag`.
- **Click events cannot block a link.** The click happens in the iframe, and the host page never
  navigates. The iframe sends the event in the click handler and does not call `preventDefault`. A
  link carries `data-event` and `data-program-id` (or `data-document-id`), and one listener on the
  document sends the event. A middle click or a right-click "open in new tab" fires `auxclick`, not
  `click`, so it sends no event. We accept this loss.

## Considered options

- **GA4 inside the iframe, with its own `gtag.js`.** Browsers block or partition third-party
  cookies in an iframe. Each visit would be a new session that is split from the site. It also
  needs its own consent handling.
- **The Measurement Protocol from our server.** It needs a secret key. A server has no client id
  for the family, and a request from a server skips the consent choice of the family.
- **Vercel Analytics.** It is separate from the GA4 property of the site, and the free plan has no
  custom events.

## Consequences

- **GA4 shows `search_term` at once.** `result_count`, `filter_group`, `filter_value`, `program_id`,
  `program_name`, `organization_id`, `organization_name`, `document_id`, `document_title`, and
  `filters` show in reports only after a person with GA4 admin access on momsbloom.org registers them as custom dimensions (`result_count` as a custom metric). MomsBloom
  does this after the deploy. It is not part of the code.
- **A typed personal name can reach GA4** as the keyword. This is a known limit.
- **Change both sides together.** `embed.js` has no build step, so it has its own copy of the
  message name and the event list. A change to `src/embed/protocol.ts` needs the same change in
  `public/embed.js`. A Vitest test checks that both agree (`src/embed/protocol.test.ts`).
- **Playwright tests the fake host page only**, with a stub for `gtag`
  (`e2e/analytics.spec.ts`). After a deploy, check GA4 Realtime or DebugView on the real
  momsbloom.org/resources page: `directory_search` and `program_view` must show.
