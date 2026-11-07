# Spec: Seed import (spreadsheet to database)

> **Done outside this repo.** The team ran the import outside GitHub, to keep real data out of this
> public repo. No import script is in the repo. This spec stays as the record of the mapping rules.

How the MomsBloom spreadsheet gets into the database, one time. Capitalized terms are defined in
[CONTEXT.md](../../CONTEXT.md).

## Goal

MomsBloom and the Code for Good data team cleaned up the resource list in a spreadsheet:
`MomsBloom Resource Directory - Data Template (cleaned).xlsx`. The **Seed import** reads that file
and saves every Organization, Program, Contact, Document, and Facet value into the database. After
the import, the database is the source of truth, and staff edit in the Admin. Nobody edits the
spreadsheet again.

## Keep the file private

The spreadsheet has real people's names, phone numbers, and email addresses, and staff notes. This
repo is public.

- **Never commit the file.** `.gitignore` already blocks `*.xlsx` and `*.csv`. Keep the file outside
  the repo folder, and pass its path to the script.
- Never paste rows from it into a pull request, an issue, or a chat.
- The script's report prints IDs and column names, never whole rows, emails, phone numbers, or notes.

## How to run it

```bash
pnpm import:xlsx "/path/to/MomsBloom Resource Directory - Data Template (cleaned).xlsx"
pnpm import:xlsx "/path/to/...xlsx" --write
```

- The volunteer who builds the import adds the `import:xlsx` script to `package.json`
  (`tsx src/import/cli.ts`, as in bikegr-calendar).
- Without `--write`, the script reads the file, checks everything, prints the report, and saves
  nothing. This is a "dry run". Run it first, every time.
- With `--write`, it saves. All of it is saved in one database transaction: if anything fails,
  nothing is saved, so the database is never half-imported.
- It is safe to run more than once while we set up: it matches records by their ID (`O-001`) and
  updates them instead of adding copies. **After staff start editing in the Admin, never run it
  again**, because it would overwrite their changes.
- The script lives in `src/import/` and runs with `tsx` (already installed). Read the file with the
  `exceljs` package. Do not use the `xlsx` package from npm: that version is old and has known
  security problems.

## What is in the file

Seven tabs. The import reads five of them, in this order:

1. **Lists** (Facet values)
2. **Organizations**
3. **Programs**
4. **Contacts**
5. **Documents**

It ignores the **Instructions** and **Cleanup log** tabs. Row 1 of each tab is the header row. The
script finds columns by their header text, not by their position, so an added column does not
break it. If an expected header is missing, the script stops and names it.

### Lists tab

| Column | Becomes |
|---|---|
| Category, Subcategory | The Category and Subcategory Facet values. Each row is one Subcategory and the Category it belongs to. |
| Category list | The order of the Categories. |
| Insurance plans, Languages, Who it serves, Cost, Service format | The Facet values for those Facets, in the order listed. |
| Accepts insurance, Status | Fixed lists in the app (see CONTEXT.md). The script checks that they match, and saves nothing for them. |

Two rows need a person to decide (the report flags them; do not guess):

- The Category "Home Visiting (Hope, add please?)" has a note in its name.
- The Subcategory "Financial Assistance" has no Category.

### Organizations tab

| Header | Becomes |
|---|---|
| Org ID | The Organization's ID. |
| Organization name | Name. |
| About this organization | About text. |
| Website, Email Address, Main phone | Contact details. |
| Street address, Suite or unit, City, State, ZIP | Address. |
| County | Not used (empty in the file). |
| Last verified | Last verified date. |
| Status | Status. |
| Internal notes (not shown on site) | Internal notes. |
| Latitude, Longitude | Map coordinates. |
| Dropdown label (auto), ID # (auto) | Not used (spreadsheet helpers). |

### Programs tab

| Header | Becomes |
|---|---|
| Program ID | The Program's ID. |
| Organization (pick from list) | The Organization. **Read the ID from the end of the cell**: "Rise Wellness Chiropractic (O-001)" means `O-001`. |
| Org ID (auto) | Not used. It is a formula, and the saved file has no value in it. |
| Program name, Description, Search keywords | Text. |
| Categories, Subcategories | Facet values (more than one, separated by commas). |
| Street address (blank = organization's), Suite or unit, City, State, ZIP | The Program's own address. Leave blank when blank. |
| Service format | Service format. |
| Phone (blank = organization's), Website (blank = organization's) | The Program's own phone and website. Leave blank when blank. |
| Hours | Text. |
| Cost | One Facet value. |
| Accepts insurance | Yes, No, Not applicable, or blank. |
| Insurance plans accepted, Languages, Who it serves | Facet values (separated by commas). |
| Eligibility notes | Text. |
| Last verified, Status, Internal notes (not shown on site) | As for Organizations. |
| Latitude, Longitude | The Program's own coordinates (empty in the file today). |
| Dropdown label (auto), ID # (auto) | Not used. |

### Contacts tab

| Header | Becomes |
|---|---|
| Program (pick from list) | The Program. **Read the ID from the end of the cell**: "Prenatal and Pediatric Chiropractic Care – Rise Wellness Chiropractic (P-001)" means `P-001`. |
| Program ID (auto), Organization (auto) | Not used (formulas with no saved value). |
| Contact name, Title or specialty, Phone, Email | Contact details. |
| Show on website? | Yes or No. |
| Internal notes (not shown on site) | Internal notes. |

Contacts have no ID in the file. On a second run, replace a Program's Contacts as a group.

### Documents tab

| Header | Becomes |
|---|---|
| Resource ID | The Document's ID (`D-001`). |
| Document title, Description, Search keywords | Text. |
| Categories, Subcategories, Languages | Facet values (separated by commas). |
| PDF link | The link to the PDF. |
| Last verified, Status, Internal notes (not shown on site) | As above. |
| ID # (auto) | Not used. |

Today the Documents tab has only its example row, so the import adds no Documents.

## Rules

- **Skip Example rows:** an ID that ends in `000`, the ID `P-999`, or a name that starts with
  "EXAMPLE". Report how many were skipped.
- **Clean every cell:** trim spaces at the start and end. Write IDs in capitals. Treat "Yes",
  "yes", and "YES" the same.
- **IDs:** a capital letter, a dash, and three digits (`O-001`). A missing, badly formatted, or
  repeated ID stops the import and is listed in the report.
- **Links between tabs:** a Program whose Organization ID does not exist, or a Contact whose
  Program ID does not exist, stops the import and is listed.
- **Values with more than one answer** (Categories, Subcategories, Insurance plans, Languages, Who
  it serves): split on commas, trim each part, and match it to the Lists tab without caring about
  capital letters.
- **Do not copy inherited values.** A Program's blank address, phone, or website stays blank in the
  database. The app fills it from the Organization when it reads the data (**Inheritance**).
  Copying would break that: a later change to the Organization would not reach its Programs.
- **Accepts insurance blank** stays blank (unknown). Never save it as No.
- **Status blank** becomes `Needs review`, so staff see the record on the Admin home page. Three
  Programs have no Status today.
- **ZIP codes and phone numbers are text**, never numbers (a number would drop a leading zero).
- **Dates:** the file stores real dates. Save the date only, with no time.
- **Website** that is not a full URL: save it, and list it in the report. The Directory hides
  links that are not URLs. Staff fix them in the Admin.
- **Missing coordinates:** save the record, and list it in the report. 10 Organizations have none
  today. Those Programs show without a distance until staff fix them.

> **Open question: values that are not on the Lists tab.** The cleaned file has 9 values that are
> not on the Lists tab, for example the Category "Playgroups" (3 Programs), and "Newborns" and
> "infants" in Who it serves. Recommendation: the dry run lists every such value with
> the Program IDs that use it, and `--write` refuses to run until the list is empty. The data team
> fixes each one in the spreadsheet (correct the spelling, or add the value to the Lists tab) and
> runs the dry run again. This keeps the filters clean from day one. The other option, saving
> unknown values as new Facet values, would put typos into the filters.

## The report

The dry run and the real run print the same report:

```
Lists:          9 categories, 31 subcategories, 15 insurance plans, 8 languages, ...
Organizations:  45 to save, 1 example skipped
Programs:       52 to save, 2 examples skipped
Contacts:       25 to save, 2 examples skipped
Documents:      0 to save, 1 example skipped

Needs a decision:
  Lists row 31: Category "Home Visiting (Hope, add please?)" has a note in its name
  Lists row 32: Subcategory "Financial Assistance" has no Category
Values not on the Lists tab:
  Categories "Playgroups": 3 programs (IDs listed)
  Who it serves "Newborns": 2 programs (IDs listed)
  ... (9 values today)
Status blank, saved as Needs review: P-050, P-051, P-052
No coordinates: 10 organizations (IDs listed)
Website is not a URL: (IDs listed)
```

(The counts above are from the cleaned file on 2026-11-07. The real run prints the current ones.)

## Tests

Write the reading and checking steps as plain functions (read a cell, split a list, find an ID in a
pick-list cell, check a row) and test them with Vitest. The tests use small rows written in the
test file. **The tests must never read the real spreadsheet**, because it is not in the repo.

## Acceptance checklist

- [ ] The dry run on the cleaned spreadsheet prints the report and saves nothing.
- [ ] The report shows no emails, phone numbers, notes, or whole rows.
- [ ] `--write` saves everything in one transaction. A forced failure halfway leaves the database
      unchanged.
- [ ] Running `--write` twice gives the same records, not copies.
- [ ] No Example row is in the database.
- [ ] Every Program points to the right Organization, and every Contact to the right Program, using
      the IDs read from the pick-list cells.
- [ ] Programs with a blank address, phone, or website are blank in the database and show their
      Organization's values in the Directory.
- [ ] Facet values are in the same order as the Lists tab, and Subcategories belong to the right
      Category.
- [ ] The three Programs with no Status are saved as Needs review.
- [ ] The unit tests pass without the spreadsheet.
