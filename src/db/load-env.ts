import { existsSync } from "node:fs";

/**
 * Loads `.env.local`, then `.env`, for scripts that run outside Next.js (drizzle-kit, the seed).
 * Next.js loads them itself for the app. The first value set wins, so the environment beats
 * `.env.local`, and `.env.local` beats `.env` (the same order as Next.js).
 */
export function loadLocalEnv(): void {
  for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);
}
