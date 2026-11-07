# Shared links go through the host page URL

Status: accepted, 2026-11-07.

The Directory keeps its state in the URL (see [ADR 0004](0004-search-filters-a-cached-snapshot-on-the-server.md)).
But the Directory runs in an iframe, and the family never sees the iframe URL. A link that a family
copies from the browser bar is the momsbloom.org page, with no filters. The other person sees an
empty Directory. We had to choose how a shared link keeps the state.

The iframe tells the host page its state, and `public/embed.js` writes it into the host page URL.
This is the same approach that bikegr-calendar uses (`public/embed.js` there).

- **The `location` message.** After each load and each filter change, the iframe sends
  `{ type: "momsbloom-resources:location", search, program }` to the host page. `search` is the
  filter part of the iframe URL. `program` is the open Program ID, or `null` on the results page.
  `src/embed/protocol.ts` checks the message, and `embed.js` checks it again.
- **The `mbr-` prefix.** `embed.js` writes each key into the host URL as `mbr-<key>` (for example
  `mbr-q=yoga` and `mbr-program=P-101`). Squarespace uses `?q=` for its own search, so a key
  without a prefix would clash. `embed.js` never reads or changes a host key that has no prefix.
- **A list of allowed keys.** Only `q`, `r`, `cat`, `sub`, `ins`, `cost`, `lang`, `who`,
  `fmt`, `org`, `sort`, and `view` go through. Any other key is dropped. The list is in
  `HOST_QUERY_KEYS` in `src/embed/protocol.ts`, and `embed.js` has a copy.
- **`zip`, `near`, and `n` are never shared.** The iframe removes them before it sends the message
  (`shareSearch` in `src/directory/query.ts`). Shared links carry the keyword and filters but not
  the ZIP code or the location, because the host page URL goes to analytics (Squarespace GA4 records
  it as `page_location`), and the spec says never to send them there (see "Distance" and
  "Analytics" in [the public directory spec](../specs/public-directory.md)). The host page has
  scripts we do not control, and they can read every `message` event. A shared link opens on the
  first page of results, so `n` is not needed.
- **`mbr-program` opens the detail view.** On load, a valid Program ID makes `embed.js` open
  `/embed/programs/<id>` in the iframe. A valid ID has only letters, digits, and "-", and at most
  40 characters.
- **`history.replaceState`, not `pushState`.** The host URL changes, but the history does not
  grow. Going from the results to a Program and back is a real iframe navigation, so the Back
  button of the browser already works. With `pushState`, Back would step through every checkbox.
- **The first message is skipped.** It describes the start state, so the host URL stays as it is.
- **One Embed only.** When the page has more than one Embed, one URL cannot hold both states, so
  `embed.js` does not write the URL.

## Considered options

- **No sync.** Nothing to build. But every shared link shows an empty Directory, and the spec
  says a family can text a link.
- **A "Copy link" button only.** The button would copy a link that holds the state. But it adds
  UI to build and to explain, and the link in the browser bar still loses the state. Families
  copy that link without a thought.
- **`pushState`.** Every filter change would be a history entry. The Back button would then undo
  one checkbox at a time, and that is not what a family expects.

## Consequences

- **Analytics on the host page see the keyword and the filters**, because they are in its URL.
  The ZIP code and the location (`near`) never leave the iframe. A shared link does not open
  with the ZIP code, so the other person sees results without the distance.
- **A link to an Inactive Program** opens the results with the message "That resource isn't
  available anymore." The host URL keeps `mbr-program` until the next change, because the first
  message is skipped. The next filter change removes it.
- **Change both sides together.** `embed.js` has no build step, so it has its own copy of the
  message name and the list of keys. A change to `src/embed/protocol.ts` needs the same change in
  `public/embed.js`, and the Playwright tests in `e2e/embed.spec.ts` check that both agree.
- **Playwright tests the fake host page only.** After a deploy, check the real
  momsbloom.org/resources page: Squarespace may reload a page with AJAX.
