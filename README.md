# Moms Bloom Resources

A resource directory for [momsbloom.org](https://momsbloom.org), where organizations list their programs and visitors can browse them by category. The app is hosted at **resources.momsbloom.org** and embedded in the main Squarespace site.

## Architecture

```
GitHub (code) ──▶ GitHub Action ──▶ Build ──▶ Vercel (host)
                                                  │
                                    resources.momsbloom.org
                                                  │
                         embedded in ──▶ Squarespace (momsbloom.org)
```

| Concern | Service |
| --- | --- |
| Source code | GitHub |
| CI / build | GitHub Actions |
| Hosting | Vercel |
| Framework | Next.js |
| UI | React + TypeScript |
| Database | Neon (Postgres) |
| Email | Resend |
| Marketing site | Squarespace (momsbloom.org) |

## How it fits together

- The main site, `momsbloom.org`, lives on **Squarespace**.
- This app is deployed to **Vercel** and served at `resources.momsbloom.org`.
- The Squarespace site embeds the resources app (for example, in an embed/iframe block) so it appears inside the main site.

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
- [GitHub Actions](https://github.com/features/actions) for CI/CD

## Getting started

### Prerequisites

- Node.js (LTS)
- A Neon database
- A Resend API key

### Install

```bash
git clone <repo-url>
cd <repo-name>
npm install
```

### Environment variables

Create a `.env.local` file:

```bash
DATABASE_URL=        # Neon connection string
RESEND_API_KEY=      # Resend API key
```

### Run locally

```bash
npm run dev
```

Open <http://localhost:3000>.

## Deployment

1. Push to GitHub.
2. A GitHub Action runs and builds the project.
3. The build is deployed to Vercel and served at `resources.momsbloom.org`.
4. Squarespace (`momsbloom.org`) embeds the deployed app.

Set the same environment variables in the Vercel project settings.

## Roadmap

- [ ] Organizations management
- [ ] Programs management
- [ ] Category management
- [ ] User accounts and email notifications
