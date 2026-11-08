-- Verified by: the Staff admin's email. IF EXISTS / IF NOT EXISTS, like 0002 and 0004: a fresh local or
-- test database has no directory tables yet, and the test DDL makes them with this column.
-- Migrations do not run on deploy: run `pnpm db:migrate` on Neon dev and prod BEFORE merge.
ALTER TABLE IF EXISTS "documents" ADD COLUMN IF NOT EXISTS "last_verified_by" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "last_verified_by" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "programs" ADD COLUMN IF NOT EXISTS "last_verified_by" text;
