# Statement of Intent: MomsBloom Resource Directory, repo init (Option C)

Confirmed by Jeremy Bell on 2026-11-06.

- **Outcome:** An init commit in `momsbloom-resources` that lets the Weekend for Good volunteers build Option C from Saturday morning. It contains:
  - `CONTEXT.md`
  - about 6 ADRs
  - Figma captures
  - 3 specs (public directory, admin, data import)
  - a thin Next.js + Drizzle + Neon scaffold
- **Users:**
  - The volunteer team, with some junior developers, builds it.
  - Families who search on momsbloom.org/resources use it.
  - 3 MomsBloom staff admins (Microsoft 365 / Entra ID SSO, equal full-admin rights) maintain it. The public cannot get access to the admin.
- **Why now:** The event is this weekend. Option C (Neon, Vercel, iframe in Squarespace, admin with SSO) replaces Option A (Google Sheet with vanilla JS) and Option B (Airtable with Softr).
- **Success:**
  - A volunteer takes a slice, reads its spec and capture, runs the app locally with the seeded data, and starts with no setup questions.
  - A junior developer understands why each decision was made, not only what was decided.
- **Writing style:** Verbose and plain. Technical terms are explained or replaced. Each ADR shows the options that we did not choose. The scaffold has comments. Humanizer runs on each doc.
- **Constraint:**
  - The handoff doc and the data template are the source.
  - The data hierarchy is Organization → Program (search hits are programs) → Contact. Documents stand alone.
  - The Lists tab gives the facets (Category → Subcategory is a hierarchy).
  - The cleaned xlsx is a one-time seed import. After the import, Neon is the source of truth.
  - The specs copy and explain the important rules. They do not only link to the handoff doc.
- **Sharing:** A GitHub repo, with the ADRs as Markdown files in `docs/adr/`.
- **Out of scope for the init:** Feature code, the Squarespace embed, Vercel/Neon provisioning, and GA4 wiring.

## Sources

- Data template: `MomsBloom Resource Directory - Data Template (cleaned).xlsx` (tabs: Organizations, Programs, Contacts, Documents, Lists)
- Dev handoff: `MomsBloom Resource Directory Dev Handoff - Option A.docx` (behavior, design tokens, accessibility, analytics, acceptance checklist)
- Project summary: `Copy of 2026 Project Summary _ Moms Bloom.docx`
- Figma: https://www.figma.com/design/XNxEurTwFpvw3kvVLPlea4/WFG-2026---MomsBloom?node-id=4-24

## Open blockers

- **Figma access:** the file owner must share `WFG-2026---MomsBloom` before the design captures can be made.
- **GitHub:** the org and the visibility (public or private) of the repo.
