/**
 * Neon PostgreSQL access — shared responsibility.
 * MVP uses in-memory sessions (`src/lib/sessions.ts`).
 * Add Drizzle/pg client here when DATABASE_URL is ready.
 */

export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL ?? null;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}
