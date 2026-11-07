# Custom fields

Staff admins can add their own fields to Programs, Organizations, Contacts, and Documents, for
example "Parking" or "Doula on staff", without a developer and without a database change.

**Status: live in the Admin.** Staff can add fields and fill in answers on the Program and Organization
pages (below). The database change (migration 0004) is on Neon. Families see Program and Organization
answers on the Program detail page, and Program fields marked as filters in the filter column
(URL key `cf<field id>`, for example `cf12=1`).

## The idea: a field is a question, each record has its own answer

There are two separate things:

| | What it is | Where it lives | How many |
|---|---|---|---|
| **Field** | The question, for example "Parking", with its type and list of options. | The `custom_fields` table. | One, shared by every record of that type. |
| **Answer** | One record's answer, for example "Covered". | That record's own row, in its `custom` column. | One per record, and each can be different. |

Adding a field gives every Program the question, but **no Program has an answer yet**. A Program
gets an answer only when a staff member picks one on that Program and saves.

### Example: a "Parking" field on Programs

A Staff admin adds a list field "Parking" with the options Covered and Standard Lot. Then they open
one Program, pick Covered, and save:

| Program | Parking answer | What is stored on the row |
|---|---|---|
| Yoga and Barre Classes | Covered | `{"21": "1"}` |
| Every other Program | blank (we don't know) | `{}` |

The other Programs did not change. Each one keeps its own answer, and saving one Program never touches
another. (`21` is the field's id and `1` is the key of the "Covered" option. Staff and families never
see these numbers; they see the names.)

## What families will see

Once the Directory uses custom fields:

- **Program detail page:** one line per field that has an answer, for example **Parking:** Covered.
  Fields with no answer don't appear at all.
- **Filters:** a field marked as a filter becomes a group of checkboxes after the usual ones, for
  example "Parking: Covered, Standard Lot". Like the other filters, an option with a count of 0 is
  hidden.
- **Blank means "we don't know".** A blank answer is never shown as "No" and never matches a filter.
  A Program with no Parking answer is not in the results for "Covered" or "Standard Lot".
- **Staff only:** a field without "Show on the website" is visible only in the Admin, like Internal
  notes. It is never sent to a family's browser.
- **Archived:** an archived field is hidden everywhere, even on records that have an answer.

## Where staff use it

Both live on each Program's and each Organization's Admin page:

| Part of the page | What it does |
|---|---|
| **More details** (in the form, before Status) | This record's answers. They save with the form's **Save** button, with the rest of the record. Leave a field blank if you don't know. |
| **Custom fields for all Programs** (a section at the bottom, closed at first) | The questions. Add, edit, move, archive, and restore fields here. A change applies to **every** Program (or every Organization), not just the one on screen, and the section says how many. |

Contacts and Documents have no Admin form yet, so they get custom fields later. The code already
supports them (`CUSTOM_FIELD_ENTITIES`); `ADMIN_ENTITIES` in `form.ts` lists the ones the Admin shows.

## The rules

These keep the feature simple and safe. The code enforces all of them.

- **A field's type can't change.** A Yes / No field can't become a list. Archive it and add a new one.
- **Fields are archived, never deleted.** Archived fields are hidden, but their answers stay on the
  records, so **Restore** brings everything back.
- **List options are added, renamed, or hidden, never removed.** Renaming "Covered" to "Covered
  garage" updates every record that has it. A hidden option can't be picked any more, but records
  that already have it keep it.
- **No two active fields of the same record type can have the same name.**
- **Filters:** only Program fields, only Yes / No and list fields, and only if shown on the website.
- **Every answer is checked on the server when it's saved:** numbers, dates, phone numbers, emails,
  website links, and list options. The database itself does not check answers.

## For developers

### How it is stored

- `custom_fields`: one row per field (`CustomFieldDefinition` in `types.ts`). Defined in
  `src/db/schema.ts`; migration `drizzle/0004_noisy_ezekiel.sql`.
- A `custom` jsonb column on `organizations`, `programs`, `contacts`, and `documents`: the answers,
  keyed by field id. Blank answers are not stored. Value shapes by field type:

| Field type | Stored as | Example |
|---|---|---|
| Short text, Long text, Website link, Phone, Email | string | `"Call before 10 a.m."` |
| Number | number | `12` |
| Yes / No | boolean | `true` |
| Date | `"YYYY-MM-DD"` | `"2026-10-01"` |
| Pick one from a list | option key | `"1"` |
| Pick any from a list | option keys, in list order | `["1", "3"]` |

### Files

| File | What it does |
|---|---|
| `types.ts` | Field types, the field shape, the stored answer shape. |
| `definitions.ts` | Adding, editing, reordering, archiving, and restoring fields, with the error messages. Pure functions. |
| `values.ts` | A record's form → the `custom` value to save (checks every answer); formatting answers for pages. Pure functions. |
| `filter.ts` | Custom fields as Program filters: groups, matching, counts, cleaning filters from old links. Pure functions. |
| `store.ts` | Reads and writes `custom_fields` and the `custom` columns. No rules: callers check first. |
| `form.ts` | A record's Admin form: reads the `custom.<id>` inputs and builds the `custom` column to save. Only the fields the form showed (`customFieldIds`) change, so an older form can't blank a newer field. |
| `manage.ts` | The "Custom fields for all …" section: add, edit, move, archive, restore, from form data. |
| `*.test.ts` | Tests next to each file. Run them with `pnpm test`. |
| `store.test.ts` | Runs the real migrations on a fresh in-process Postgres (PGlite) with made-up sample rows, so it needs no database and runs on CI. |
| `test-fixtures.ts` | Made-up fields for the tests. |

In the Admin: the inputs are `src/app/admin/_components/custom-field-inputs.tsx`; the section and its
server actions are in `src/app/admin/_custom-fields/`. The Program and Organization save actions run
`parseCustomForm` next to their own checks and write the answers in the same transaction. Every
action checks the login first (`requireStaffAdmin`).

### Still to do

- The Embed does not copy `cf…` keys to the host page URL yet (`HOST_QUERY_KEYS`, `public/embed.js`).
- Admin: custom fields for Contacts and Documents, once they have Admin forms.
- Nice to have: set the same answer on many records at once (for backfilling a new field).
