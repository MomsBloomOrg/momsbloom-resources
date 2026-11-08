-- Staff admin role (issue #73). staff_admins is made by migration 0001, so no IF EXISTS. The default
-- 'admin' keeps every existing Staff admin's access.
-- Migrations do not run on deploy: run `pnpm db:migrate` on Neon dev and prod BEFORE merge, or no one can open the Admin.
ALTER TABLE "staff_admins" ADD COLUMN "role" text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_admins" ADD CONSTRAINT "staff_admins_role_check" CHECK ("staff_admins"."role" in ('admin', 'editor'));
