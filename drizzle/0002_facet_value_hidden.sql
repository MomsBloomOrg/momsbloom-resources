-- Facet values that staff hide (admin-pages, facet-settings). IF EXISTS: the directory tables were made
-- outside the migrations (0000 is a comment), so a fresh local or test database has none of them yet;
-- `drizzle-kit push` or the test DDL then makes them with this column. On Neon the tables exist.
ALTER TABLE IF EXISTS "audiences" ADD COLUMN IF NOT EXISTS "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "categories" ADD COLUMN IF NOT EXISTS "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "cost_options" ADD COLUMN IF NOT EXISTS "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "insurance_plans" ADD COLUMN IF NOT EXISTS "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "languages" ADD COLUMN IF NOT EXISTS "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "service_formats" ADD COLUMN IF NOT EXISTS "hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "subcategories" ADD COLUMN IF NOT EXISTS "hidden" boolean DEFAULT false NOT NULL;
