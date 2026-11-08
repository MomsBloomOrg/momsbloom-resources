# Spec: Admin

What the three **Staff admins** do. Capitalized terms are defined in
[CONTEXT.md](../../CONTEXT.md).

The goal from the project brief: MomsBloom staff can add, edit, verify, and remove resources
without help from a developer. If a staff member has to email us to fix a phone number, the Admin
has failed.

## Design

The "Admin Designs" page in Figma has one screen, the resource list
(`admin-resource-list.png` in [docs/design](../design/README.md)). The other Admin screens are
not designed yet ("Build out admin experience" is still on the designer's to-do list). Until they are:

- Build plain, clear pages: a table for each list and a simple form for each record.
- Reuse the Directory's components and colors (buttons, chips, tags, checkbox rows; see
  [docs/design](../design/README.md)), so the Admin looks like the same product.
- Design for a laptop first. Staff do this work at a desk. The pages must still work on a phone,
  but they do not have to be pretty there.

The resource list design is one list for Organizations and Documents: title "Resources Admin", a
"New Resource" button, tabs (All, Organizations, Programs, Guides & Downloads; Programs is our addition, issue #75), "Sign Out", a search box, Type
and Status menus, a "Show Deleted" checkbox, and a table with Name, Type, and Status. Today the
Admin has separate Organizations and Documents pages (see "Pages" below). **Open questions:** does
the design replace those two lists; what "Type" filters (record type or Organization); and what
"Deleted" means, because Status has only Active, Needs review, and Inactive, and records are
never deleted (they become Inactive). Build work: issue #38.

## Who and how they log in

- Each Staff admin has a **Role**: **Admin** or **Editor**. An Editor can change Resources only
  (Organizations, Programs, Contacts, Documents, and the custom-field answers on a record). An Admin
  can also open Staff admins, Settings, Content, and the custom-fields manager. The **Owners** are
  the addresses in `ADMIN_EMAILS`, and they always have the Admin role. An Admin can add another
  Staff admin on `/admin/staff-admins` with a role (default Editor; no email is sent; the person logs
  in at `/login`), change an added one's role, and remove an added one. Nobody can remove an Owner or
  themselves, or change an Owner's role or their own; the server action refuses it, not only the
  page. A removed Staff admin is logged out at their next request.
- The role is read from the database on every request, so a role change applies on the next page or
  action. The nav of someone who is already on a page can show stale links until they reload, but
  every page and action checks the role again.
- They log in with a **Login link** sent by email through Resend ([ADR 0003](../adr/0003-admin-login-by-email-link-first.md)).
  Only email addresses on the allow-list can get a link. A person not on the list sees the same
  "Check your email" message, so the page never tells a stranger which addresses are allowed.
- Limit how often one address and one network can ask for a link. bikegr-calendar has working code
  for this (`src/auth/magic-link-limits.ts`).
- Everything under `/admin` needs a logged-in Staff admin. **Check the login on the server in every
  page and every save action**, not only in one central place. If one check is forgotten, the
  others still protect the data.
- The email link is the only login. Microsoft 365 SSO was dropped (ADR 0003, 2026-11-07).

## Pages

### Screens

| Route | Screen |
|---|---|
| `/admin` | The Resources list, the Admin home, with tabs All, Organizations, Programs, and Guides & Downloads. Search, Type and Status filters, and sortable columns work on every tab. |
| `/admin/organizations/new`, `/admin/organizations/[id]` | Organization form, then its Programs table and "Add program". |
| `/admin/programs/new?org=ID`, `/admin/programs/[id]` | Program form (below), with its Contacts section. |
| `/admin/documents`, `/new`, `/[id]` | Document list and form. Documents belong to no Organization, so Documents is a top-level nav item. |
| `/admin/settings/[facet]` | Filter options: one page for each Facet (see "Facet values" below). |
| `/admin/staff-admins` | **Staff admins**: the Owners and the added Staff admins, an add form, and Remove (with a confirm step) for an added Staff admin that is not you. |
| `/admin/content` | **Website content**: the text of the help box ("Can't find what you need?"): heading, body with a `{phone}` token, phone, button label, button link (`https://` only). A blank field shows the default. A save reloads the Directory. |

The nav is **Organizations, Documents, Settings, Content, Staff admins**. IDs in the Admin are database integers (`12`), as in
[CONTEXT.md](../../CONTEXT.md).

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

### Organizations (`/admin`, `/admin/organizations/[id]`)

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

### Facet values (`/admin/settings/[facet]`, headed "Filter options")

One page for each **Facet**: Categories (with their Subcategories), Insurance plans, Languages,
Who it serves, Cost, and Service format. `/admin/settings` opens Categories. A nav lists the Facets
with their value counts: a side column on a wide screen, a row that scrolls sideways on a phone.

- Add a value, rename a value, and change the order (the order is the order families see).
- Each row: the name, the Hidden badge, and the counts on the left. On the right: a drag handle,
  Hide or Show, and a "More actions" menu (Rename, Move up, Move down, and Delete when nothing uses
  the value).
- **Change the order** by drag and drop with a mouse, by touch, or by keyboard (Space or Enter on the
  handle, the arrow keys, then Space or Enter; Escape cancels). A screen reader hears each position.
  Move up and Move down in the menu do the same without a drag (WCAG 2.5.7).
- The new order shows at once. The server saves the whole list in one transaction
  (`reorderFacetValues`) and refuses a list that is not exactly the current values (another staff
  member changed it); then the old order comes back with "This list changed since you opened it.
  Reload the page."
- Each Category has a closed group with its Subcategories and its "New Subcategory" field.
  Subcategories move only inside their own Category.
- Renaming a value changes it everywhere it is used, at once. (Records point to the value, they do
  not copy its text.)
- To retire a value, hide it. A hidden value stays on the records that have it, but families no
  longer see it as a filter option. Show how many Programs use each value, so staff know what a
  change affects.
- Families also stop seeing a hidden value as a label on Program cards and on the Program detail
  page. Hiding a Category also hides its Subcategories.
- A value that no record uses can be deleted.

## Rules

- **No hard deletes for records.** Staff hide an Organization, Program, or Document by setting it
  to Inactive. That keeps the history, and a mistake is easy to undo. Contacts can be removed.
- **IDs stay.** New records get the next database integer. IDs never change and are never reused,
  because public links use them. (`O-047` style IDs exist only in the spreadsheet.)
- **Last changed.** Each Organization, Program, and Document shows "Last changed <date>" at the bottom
  of the form, from `updated_at`. Recording the email of the editor (`updated_by`) is deferred.
- **A save shows at once.** After a save, the next page load of the Directory shows the change.
  Every save action calls `updateTag("directory")`, which throws away the Directory's cached
  copy of the data ([ADR 0004](../adr/0004-search-filters-a-cached-snapshot-on-the-server.md)).
- **Check input on the server.** The browser checks are for convenience; the server must check
  again (required fields, URL format, IDs that exist). Never trust what the browser sends.

- **Map coordinates (decided).** Distance and the map need a latitude and longitude for each
  address. When staff save a new or changed street address and did not edit the coordinates, the
  server asks the US Census geocoder (`geocoding.geo.census.gov`, no key, 5 s timeout) and saves the
  result. If it finds nothing, the save still works, the coordinates become blank, and the form shows
  "We couldn't place this address on the map. Type the coordinates, or leave them blank." Staff can
  always type coordinates. A Program with a blank street address keeps blank coordinates
  (Inheritance). Only the Census sees the address.

## Acceptance checklist

- [ ] An address on the allow-list gets a Login link and can log in. Any other address sees the
      same message and gets no email.
- [ ] An address added on the Staff admins page can log in. A removed one is logged out at the next
      request, and its open Login link no longer works.
- [ ] An Owner has no Remove button, and you cannot remove yourself.
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
