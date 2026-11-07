# pnpm is the package manager

Status: accepted, 2026-11-06.

A package manager downloads the libraries the app uses (Next.js, React, Drizzle, and so on) into
`node_modules/`, and runs the scripts in `package.json`. We use [pnpm](https://pnpm.io). The app
skeleton came from [bikegr-calendar](https://github.com/ggrbc/bikegr-calendar), which uses pnpm, and
its lockfile and scripts came with it. The team had no strong preference, so we kept what was there.

The lockfile (`pnpm-lock.yaml`) records the exact version of every library. Commit it with any change
to `package.json`, so every computer and Vercel install the same versions.

## Considered options

- **npm.** It comes with Node.js, so nobody installs anything extra, and most tutorials use it. We
  would have had to replace the lockfile and change the commands in the scripts, configs, and
  README, for no gain in features.
- **Yarn.** No one on the team asked for it.

## Consequences

- Install pnpm once with `corepack enable` (Corepack comes with Node.js 24). The `packageManager`
  field in `package.json` picks the pnpm version.
- Use `pnpm install`, `pnpm add <package>`, and `pnpm <script>` (for example `pnpm dev`). Do not
  run `npm install` in this repo: it makes a second lockfile (`package-lock.json`) that disagrees
  with `pnpm-lock.yaml`. If you see one, delete it.
- When a tutorial says `npm install x`, use `pnpm add x`. When it says `npx x`, use `pnpm exec x`
  or `pnpm dlx x`.
- Vercel reads `pnpm-lock.yaml` and uses pnpm by itself. No setting is needed.
