# Spec: Admin

What the three **Staff admins** do. Capitalized terms are defined in
[CONTEXT.md](../../CONTEXT.md).

The goal from the project brief: MomsBloom staff can add, edit, verify, and remove resources
without help from a developer. If a staff member has to email us to fix a phone number, the Admin
has failed.

## There is no design yet

The "Admin Designs" page in Figma is empty, and "Build out admin experience" is on the designer's
to-do list. Until a design exists:

- Build plain, clear pages: a table for each list and a simple form for each record.
- Reuse the Directory's components and colors (buttons, chips, tags, checkbox rows; see
  [docs/design](../design/README.md)), so the Admin looks like the same product.
- Design for a laptop first. Staff do this work at a desk. The pages must still work on a phone,
  but they do not have to be pretty there.

## Who and how they log in

- Three Staff admins, all with the same rights. There are no roles.
- They log in with a **Login link** sent by email through Resend ([ADR 0003](../adr/0003-admin-login-by-email-link-first.md)).
  Only email addresses on the allow-list can get a link. A person not on the list sees the same
  "Check your email" message, so the page never tells a stranger which addresses are allowed.
- Limit how often one address and one network can ask for a link. bikegr-calendar has working code
  for this (`src/auth/magic-link-limits.ts`).
- Everything under `/admin` needs a logged-in Staff admin. **Check the login on the server in every
  page and every save action**, not only in one central place. If one check is forgotten, the
  others still protect the data.
- Microsoft 365 login comes later, as a second button on the same page.

## Pages

### Home (`/admin`)

A short summary that tells a staff member what needs attention:

- How many Programs, Organizations, and Documents are Active, Needs review, and Inactive.
- A list of records with Status **Needs review**.
- A list of the records with the oldest **Last verified** dates (for example, older than 6 months).
  Each row links to the record.

### Programs (`/admin/programs`)

- A table: Program name, Organization, Categories, Status, Last verified.
- Search by name. Filter by Status, Category, and Organization.
- "Add program" opens an empty form.

### Program form

Fields, in the order of the data template:

| Field | Notes |
|---|---|
| Organization | Required. Pick from a list. |
| Program name | Required. |
| Description | Required. Plain text. |
| Search keywords | Words a parent might type that are not in the name or description (PPD, baby blues, nursing). Help text should say this. |
| Categories, Subcategories | At least one Category is required. Subcategories show only for the Categories that are checked. |
| Address, suite, city, state, ZIP | Optional. Blank means "use the Organization's" (**Inheritance**). Show the Organization's value as grey placeholder text, so staff see what families will see. |
| Phone, website | Optional, with the same Inheritance and placeholder. The website must be a full URL (`https://...`). |
| Service format | In person, Virtual, or In person and virtual. |
| Hours | Free text ("Mon to Fri 9am to 5pm"). |
| Cost | One Facet value. |
| Accepts insurance | Yes, No, Not applicable, or blank (unknown). |
| Insurance plans accepted | Facet values. Show only when Accepts insurance is Yes. |
| Languages, Who it serves | Facet values. |
| Eligibility notes | Free text. |
| Status | Active, Needs review, or Inactive. |
| Internal notes | Staff only. Label it "Not shown on the website". |
| Contacts | A list inside the form: name, title or specialty, phone, email, "Show on website" (yes or no), internal notes. Add, edit, and remove. |

Buttons:

- **Save.** Saves and stays on the form, with a "Saved" message.
- **Mark verified.** Sets Last verified to today. A staff member uses it after a phone call that
  confirms nothing changed, without editing anything else.
- **View on site.** Opens the public Program detail in a new tab.

### Organizations (`/admin/organizations`)

- A table and a form like the Program ones. Fields: name, about text, website, email, main phone,
  address, Status, Last verified, internal notes, and map coordinates (see the open question below).
- The form lists the Organization's Programs, with links, and an "Add program" button that fills
  in the Organization.
- Setting an Organization to Inactive hides all of its Programs from families. The form must say
  so before it saves.

### Documents (`/admin/documents`)

- A table and a form. Fields: title, description, search keywords, Categories, Subcategories,
  languages, PDF link (required, a full URL), Status, Last verified, internal notes.
- The PDF stays where it is today (momsbloom.org). We store the link, not the file.

### Facet values (`/admin/facets`)

One section for each **Facet**: Categories (with their Subcategories), Insurance plans, Languages,
Who it serves, Cost, and Service format.

- Add a value, rename a value, and change the order (the order is the order families see).
- Renaming a value changes it everywhere it is used, at once. (Records point to the value, they do
  not copy its text.)
- To retire a value, hide it. A hidden value stays on the records that have it, but families no
  longer see it as a filter option. Show how many Programs use each value, so staff know what a
  change affects.
- A value that no record uses can be deleted.

## Rules

- **No hard deletes for records.** Staff hide an Organization, Program, or Document by setting it
  to Inactive. That keeps the history, and a mistake is easy to undo. Contacts can be removed.
- **IDs stay.** New records get the next ID in the same format as the spreadsheet (`O-047`,
  `P-055`, `D-002`). IDs never change and are never reused, because public links use them.
- **Record who changed what.** Each Organization, Program, and Document stores when it was last
  changed and the email of the Staff admin who changed it. Show it at the bottom of the form.
- **A save shows at once.** After a save, the next page load of the Directory shows the change.
  Every save action calls `updateTag("directory")`, which throws away the Directory's cached
  copy of the data ([ADR 0004](../adr/0004-search-filters-a-cached-snapshot-on-the-server.md)).
- **Check input on the server.** The browser checks are for convenience; the server must check
  again (required fields, URL format, IDs that exist). Never trust what the browser sends.

> **Open question: map coordinates for a new or changed address.** Distance and the map need a
> latitude and longitude for each address. The spreadsheet has them for 35 of 45 Organizations.
> Recommendation: when a staff member saves an address, the server asks the free US Census
> geocoder (`geocoding.geo.census.gov`, no key, no account) for the coordinates and saves them. If
> it finds nothing, the form shows "We couldn't place this address on the map" and lets the staff
> member type the coordinates. The other option is to have staff type coordinates from Google Maps
> every time, which they will forget.

## Acceptance checklist

- [ ] An address on the allow-list gets a Login link and can log in. Any other address sees the
      same message and gets no email.
- [ ] Opening any `/admin` page, or sending any save request, without a login is refused.
- [ ] A staff member can add an Organization, add a Program to it, and see the Program in the
      Directory on the next page load.
- [ ] Leaving a Program's address blank shows the Organization's address in the form placeholder
      and on the public Program detail.
- [ ] Changing an Organization's phone number changes it for every Program that has no phone of its own.
- [ ] Setting a Program to Inactive hides it from the Directory. Setting it back to Active shows it again.
- [ ] Setting an Organization to Inactive hides all its Programs, after a warning.
- [ ] "Mark verified" sets Last verified to today and changes nothing else.
- [ ] Renaming a Facet value changes it on every Program that has it, and in the filters.
- [ ] Hiding a Facet value removes it from the filters but not from the Programs that have it.
- [ ] Changing the order of Facet values changes the order of the filter options.
- [ ] A Contact with "Show on website" set to no never appears on the public site.
- [ ] Internal notes never appear on the public site or in its page source.
- [ ] A website that is not a full URL is refused with a clear message, in the browser and on the server.
- [ ] Every page can be used with the keyboard only.
