# MomsBloom Resource Directory: Context

A searchable list of community services for pregnant and postpartum families in Kent County,
Michigan. [MomsBloom](https://momsbloom.org) is a nonprofit that supports these families. Families use
the directory inside the momsbloom.org/resources page. Three MomsBloom staff members keep the data
current.

Use the words in this file in code, in the database, in the user interface (where it makes sense),
and when you talk about the project. When everyone uses the same word for the same thing, nobody has
to translate, and bugs from "I thought you meant..." go away.

## Ubiquitous language

| Term | Meaning |
|---|---|
| **Organization** | A group that offers services, for example Corewell Health or Arbor Circle. It holds the shared details: name, about text, main phone, website, email, and main address. An Organization is never a search result itself. It has one or more Programs. ID format: in the database, an integer (`12`); `O-001` is the spreadsheet ID only. |
| **Program** | One service that an Organization offers, for example "Mom and baby yoga" at Riverbend Health. **Programs are what families search, filter, and open.** Categories, insurance, cost, languages, and who it serves belong to the Program, not the Organization. An Organization that offers only one thing still has one Program. ID format: in the database, an integer (`12`); `P-001` is the spreadsheet ID only. |
| **Contact** | A person who works in one Program, with a name, title, phone, and email. Shown on the Program detail page only if "Show on website" is yes. |
| **Document** | A downloadable guide (a PDF), for example "Postpartum Warning Signs". It has no address or distance. It may belong to one Organization (staff pick it in the Documents admin); then it also shows on that Organization's page. Always shown in "Guides and downloads". ID format: in the database, an integer (`12`); `D-001` is the spreadsheet ID only. |
| **Facet** | One way to filter Programs, shown as a group of checkboxes: Category, Subcategory, Insurance plan, Language, Who it serves, Cost, and Service format. Each Facet has a fixed list of Facet values. |
| **Facet value** | One option in a Facet, for example "Spanish" in Language, or "Sliding scale" in Cost. Staff admins manage the list. The order of the list is the order on screen. |
| **Category** | The main Facet: the type of support, for example "Mental health" or "Lactation and feeding". A Program can have more than one. |
| **Subcategory** | A more exact type of support that belongs to one Category, for example "Yoga" under "Postpartum recovery". Shown indented under its Category. Checking a Category does not check its Subcategories. |
| **Service format** | How a family gets the service: In person, Virtual, or In person and virtual. On screen it is labeled "How you'll connect". |
| **Accepts insurance** | Yes, No, Not applicable, or blank. Blank means "we don't know". Never show blank as No. |
| **Status** | Whether a record shows to families: `Active` (shows), `Needs review` (shows; staff should check it), or `Inactive` (hidden, but kept). Organizations, Programs, and Documents each have a Status. |
| **Last verified** | The date a staff member last confirmed that a record is correct. Shown to families as "Last verified Oct 1, 2026". |
| **Internal notes** | Text for staff only. Never sent to the browser on public pages. |
| **Inheritance** | A Program's blank address, phone, or website means "use the Organization's". The app applies this when it reads the data, so a change to the Organization's address updates all its Programs. Map coordinates follow the address that was used. |
| **Distance** | Straight-line miles from the family's ZIP code (or location) to the Program. Programs that are virtual only, or have no coordinates, have no Distance and are never hidden by the distance filter. |
| **Directory** | The public part of the app: search, filters, results, and the Program detail page. |
| **Program detail** | The page for one Program. Shows the Organization ("Part of ..."), the actions (Call, Directions, Website), Contacts, insurance and cost, languages, and the Organization's other Programs. |
| **Staff admin** | A MomsBloom staff member who can log in and change the data: an Owner, or a person that an Admin-role Staff admin added in the Admin (Staff admins page). Each has a **Role**. Families never log in. |
| **Owner** | A Staff admin whose address is in the `ADMIN_EMAILS` setting. Only the developer changes this list. An Owner can always log in, always has the Admin role, and cannot be removed or changed in the Admin. |
| **Role** | What a Staff admin may do: **Admin** (everything, including Staff admins, Settings, Content, and the custom fields) or **Editor** (Resources only: Organizations, Programs, Contacts, Documents). Set on the Staff admins page. The Admin role is not "the Admin", the part of the app. Nobody can change their own role or an Owner's. |
| **Admin** | The part of the app where Staff admins work. Not visible to families, and no website may show it in an iframe. |
| **Login link** | The email that a Staff admin gets to log in. Only Owners and the Staff admins added in the Admin can get one. See [ADR 0003](docs/adr/0003-admin-login-by-email-link-first.md). |
| **Embed** | The Directory as shown inside the momsbloom.org/resources page: an iframe that `public/embed.js` adds. The Embed never shows the MomsBloom site header, because Squarespace shows it. |
| **Host page** | The Squarespace page that holds the Embed (momsbloom.org/resources). |
| **Seed import** | The one-time load of the MomsBloom spreadsheet into the database. After it, the database is the source of truth and Staff admins edit in the Admin. See [docs/specs/data-import.md](docs/specs/data-import.md). |
| **Example row** | A row in the spreadsheet that shows how to fill it in (ID ending in `000`, `P-999`, or a name starting with "EXAMPLE"). Never imported. |

## How the pieces relate

```
Organization 1 ──── many Program 1 ──── many Contact
                         │
                         └── many Facet values (Categories, Subcategories, Insurance plans,
                             Languages, Who it serves) + one Cost + one Service format

Document ── 0 or 1 Organization (optional link; shows on its page too)
         └── many Facet values (Categories, Subcategories, Languages)

Category 1 ──── many Subcategory
```

## Avoid

- "Resource" or "listing" in code. Say **Program** (the search result) or **Document** (the PDF).
  "Resource directory" is fine as the name of the product.
- "Service" as a record type. Say **Program**.
- "Provider" or "agency". Say **Organization**.
- "Tag" for filter options. Say **Facet value**. (The small pills on cards are tags in the design,
  but in code they show Facet values.)
- "Filter" for the group itself in code. Say **Facet**. "Filter" is fine in the user interface.
- "User" for the staff. Say **Staff admin**. Families are "families" or "visitors", and they have no
  account.
- "Deleted" for hidden records. Say **Inactive**. Staff hide records; they do not delete them.
- "Verified" as a yes/no field. There is only the **Last verified** date.
