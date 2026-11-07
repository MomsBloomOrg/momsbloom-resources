# Vercel deploys from GitHub; we do not use a GitHub Action to deploy

Status: accepted, 2026-11-06.

The app is hosted on [Vercel](https://vercel.com/docs). Vercel's GitHub integration watches this
repo. Each time someone pushes, Vercel builds the app and deploys it:

- A push to `main` goes live at `resources.momsbloom.org`.
- A pull request gets its own preview link: a separate copy of the site with that branch's changes.
  Vercel posts the link in the pull request. By default Vercel protects preview links, so only
  members of the Vercel team can open them. The project owner can turn that off or share a link.

We chose this because it needs no setup beyond connecting the repo, and the preview links help a
volunteer team: a reviewer can open a link and check the work on a phone, without running the code.

## Considered options

- **A GitHub Action that builds and deploys to Vercel.** This was on the first whiteboard. An Action
  is a script that GitHub runs for us. It gives full control over each step, but someone must write
  and look after the workflow file, and keep a Vercel token in the GitHub secrets. The Vercel
  integration does the same work with no file and no token.
- **Another host (Netlify, GitHub Pages).** GitHub Pages serves only static files, and this app has
  a server and a database. Netlify could work, but the reference app runs on Vercel, so its setup
  and lessons carry over.

## Consequences

- The README section "Put it online" has the one-time setup: import the repo in Vercel, then add
  the `resources` DNS record in Squarespace.
- Secrets (the database connection string, the Resend key) go in the Vercel project settings under
  Environment Variables, never in the repo.
- Vercel runs `pnpm build`. If the build fails, the deploy stops and the live site stays as it was.
- We can still add a GitHub Action later for checks only (`pnpm lint`, `pnpm typecheck`,
  `pnpm test`) on each pull request. Vercel would still do the deploys.
