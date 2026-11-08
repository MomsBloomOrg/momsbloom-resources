/** "host:port/database" of a connection string, for a log line. Never includes the user or the password. */
export function describeDatabase(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return "(unreadable DATABASE_URL)";
  }
}
