/**
 * Throws unless the database URL points at this machine. Seed scripts call it so they can never write
 * to Neon. A `host` query parameter is refused too: some drivers let it override the hostname.
 */
export function assertLocalUrl(databaseUrl: string): void {
  const url = new URL(databaseUrl);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.searchParams.has("host")) {
    throw new Error("Refusing to seed: DATABASE_URL is not a local database.");
  }
}
