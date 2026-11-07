# Moms Bloom Resources

A resource directory for [momsbloom.org](https://momsbloom.org), where organizations list their programs and visitors can browse them by category. The app is hosted at **resources.momsbloom.org** and embedded in the main Squarespace site.

## Architecture

```
GitHub (code) ──▶ Vercel (build + host)
                         │
               resources.momsbloom.org
                         │
    embedded in ──▶ Squarespace (momsbloom.org)
```

| Concern | Service |
| --- | --- |
| Source code | GitHub |
| CI / build | Vercel (builds each push) |
| Hosting | Vercel |
| Framework | Next.js |
| UI | React + TypeScript |
| Database | Neon (Postgres) |
| Email | Resend |
| Marketing site | Squarespace (momsbloom.org) |

## How it fits together

- The main site, `momsbloom.org`, lives on **Squarespace**.
- This app is deployed to **Vercel** and served at `resources.momsbloom.org`.
- The Squarespace site embeds the resources app with an Embed (or Code) block that holds the `embed.js` script, so it appears inside the main site. A bare `<iframe>` would not change its height; see [How the embed works](#how-the-embed-works).

## Data model

```
Organizations ──▶ Programs ──▶ Categories (managed)
Users (identified by email)
```

- **Organizations** own one or more **Programs**.
- **Programs** are assigned to **Categories**, which can be managed (created, edited, removed) in an admin area.
- **Users** are identified by email address. Transactional email is sent through Resend.

## Tech stack

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Neon](https://neon.tech/) for the database
- [Resend](https://resend.com/) for email
- [Vercel](https://vercel.com/) for hosting
- Vercel's GitHub integration for builds and deploys

This repo is public, so never commit passwords, connection strings, or the resource spreadsheet.

## What the app uses

| Part | What it is | Why we use it |
| --- | --- | --- |
| [Next.js](https://nextjs.org/docs) 16 | The web framework. Pages live in `src/app/`. | One app for the public directory, the admin, and the server code. |
| [Tailwind CSS](https://tailwindcss.com/docs) 4 | Styles written as class names (`text-muted`, `rounded-full`). | Brand colors are set once in `src/app/globals.css`. |
| [Neon](https://neon.com/docs) | A hosted Postgres database. | Free tier, works well with Vercel. |
| [Drizzle](https://orm.drizzle.team/docs/overview) | Writes the database tables and queries in TypeScript. | Type-safe queries; migrations are plain SQL files you can read. |
| [Vitest](https://vitest.dev) | Unit tests (`*.test.ts` next to the code). | Fast, no browser. |
| [Playwright](https://playwright.dev) | Browser tests (`e2e/`). | Tests the embed in a real browser. |

The setup is copied from [bikegr-calendar](https://github.com/ggrbc/bikegr-calendar), another
Squarespace embed app. When you wonder "how should I do X?", that repo often has an example.

## Get started on your computer

You need:

- Node.js 24. Check with `node -v`. If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm use`;
  it reads the version from `.nvmrc`.
- pnpm 10, the package manager. It does the same job as npm. Install it with `corepack enable`.
- Docker, but only if you want a local database instead of Neon.

Then:

```bash
pnpm install                 # download the packages
cp .env.example .env.local   # your own settings file; git ignores it
pnpm dev                     # start the app at http://localhost:3000
```

Open <http://localhost:3000/embed> to see the page that momsbloom.org will show.

### The database

The app does not read the database yet, so you can skip this until the tables exist.

- For a local Docker database, run `pnpm db:up` to start Postgres. The `DATABASE_URL` in `.env.example`
  already points at it. `pnpm db:down` stops it.
- For Neon, paste your Neon connection string into `DATABASE_URL` in `.env.local`.

The tables are defined in `src/db/schema.ts`. After you change that file, run `pnpm db:generate`
(writes a migration file into `drizzle/`) and then `pnpm db:migrate` (applies it to the database).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts the app on port 3000. It reloads when you save a file. |
| `pnpm lint` | Checks the code for common mistakes. |
| `pnpm typecheck` | Checks the TypeScript types. |
| `pnpm test` | Runs the unit tests. |
| `pnpm test:e2e` | Builds the app and runs the browser tests. First time: `pnpm exec playwright install chromium`. |
| `pnpm build` | Makes the production build, the same as Vercel does. |
| `pnpm db:up` / `pnpm db:down` | Starts or stops the local Docker database. |
| `pnpm db:generate` / `pnpm db:migrate` | Makes or applies a database migration. |
| `pnpm db:studio` | Opens a web page where you can look at the database tables. |

Before you open a pull request, run `pnpm lint && pnpm typecheck && pnpm test`.

## How the embed works

1. The Squarespace page has an Embed block (a Code block also works) with one line:
   `<script src="https://resources.momsbloom.org/embed.js" async></script>`
2. That script (`public/embed.js`) adds an iframe that shows `https://resources.momsbloom.org/embed`.
3. An iframe does not grow by itself. So the page inside the iframe
   (`src/app/embed/_components/resize-reporter.tsx`) measures its own height each time it changes,
   and sends the height to the Squarespace page with `postMessage` (the browser's safe way for two
   websites to talk). The script sets the iframe to that height, so the page never shows a second scroll bar.
4. A security header (`frame-ancestors`, set in `next.config.ts` from `src/embed/frame-ancestors.ts`)
   tells browsers that only momsbloom.org and Squarespace may show `/embed` in an iframe. No site
   may frame any other page, such as the admin.

`e2e/embed.spec.ts` tests all of this with a fake momsbloom.org page (`e2e/host/index.html`).

## Deployment

1. Push to GitHub.
2. Vercel sees the push, builds the project, and deploys it. A push to `main` goes live at `resources.momsbloom.org`. A pull request gets its own preview link.
3. Squarespace (`momsbloom.org`) embeds the deployed app.

Why Vercel and not a GitHub Action: see [ADR 0002](docs/adr/0002-vercel-deploys-from-github.md).

Set the same environment variables in the Vercel project settings.

## Put it online (one-time setup)

These steps are done once, by someone with access to the Vercel and Squarespace accounts.

### 1. Connect Vercel to GitHub

1. In Vercel, select **Add New → Project** and import `MomsBloomOrg/momsbloom-resources`.
   If the repo is not in the list, give the Vercel GitHub app access to the `MomsBloomOrg`
   organization (a GitHub org owner may need to approve it).
2. Keep the defaults. Vercel finds Next.js and pnpm by itself. No environment variables are needed yet.
3. Deploy. From now on, each push to `main` updates the live site, and each pull request gets its
   own preview link. Share the preview link in the pull request.

### 2. Add the subdomain

1. In the Vercel project, open **Settings → Domains** and add `resources.momsbloom.org`.
2. Vercel shows a CNAME record (a DNS entry that says "this name lives at Vercel").
3. In Squarespace, open **Domains → momsbloom.org → DNS settings**, and add a record:
   type `CNAME`, host `resources`, data: the value that Vercel showed.
4. Wait until Vercel shows the domain as valid (minutes, sometimes an hour). Vercel adds HTTPS itself.

### 3. Test the embed on Squarespace

1. Make a test page that is not in the navigation, and add an **Embed** block (or a **Code** block) with:
   `<script src="https://resources.momsbloom.org/embed.js" async></script>`
2. Drag the block's edge across the full width of the section. The iframe is as wide as the block,
   and a new block in the Squarespace editor is only a few columns wide.
3. Open the page. You should see "Postpartum Resources" with no scroll bar inside the box.
   Also open the page from the main menu, not only with a refresh: some Squarespace templates load
   pages without a full reload, and the embed must work then too.

The test page is <https://www.momsbloom.org/resources-test>. On 2026-11-06 the embed worked there,
in an Embed block on MomsBloom's current Squarespace plan, at desktop and phone widths.

## Roadmap

- [ ] Organizations management
- [ ] Programs management
- [ ] Category management
- [ ] User accounts and email notifications

## Project documents

- `docs/intent/repo-init.md`: what this repo set out to do, and for whom.
- `docs/adr/`: decisions and why we made them (ADR = Architecture Decision Record). Read these before you change how the app is built, deployed, or logged in to.
  - [0001 pnpm is the package manager](docs/adr/0001-pnpm-is-the-package-manager.md)
  - [0002 Vercel deploys from GitHub](docs/adr/0002-vercel-deploys-from-github.md)
  - [0003 Admin login by email link first](docs/adr/0003-admin-login-by-email-link-first.md)
- More to come: `CONTEXT.md` (the words we use) and `docs/specs/`.
