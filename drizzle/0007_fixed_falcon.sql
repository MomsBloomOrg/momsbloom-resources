-- A Document may belong to one Organization (optional). IF EXISTS / IF NOT EXISTS, like 0002, 0004 and 0006: a fresh
-- local or test database has no directory tables yet, and the test DDL makes them with this column.
-- Migrations do not run on deploy: run `pnpm db:migrate` on Neon dev and prod BEFORE merge.
ALTER TABLE IF EXISTS "documents" ADD COLUMN IF NOT EXISTS "organization_id" integer CONSTRAINT "documents_organization_id_organizations_id_fk" REFERENCES "public"."organizations"("id") ON DELETE set null;
