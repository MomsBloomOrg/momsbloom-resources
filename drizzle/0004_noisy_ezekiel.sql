-- Custom fields (src/custom-fields/README.md). IF EXISTS on the record tables, like 0002: the directory
-- tables were made outside the migrations (0000 is a comment), so a fresh local or test database has
-- none of them yet; `drizzle-kit push` or the test DDL then makes them with this column.
CREATE TABLE IF NOT EXISTS "custom_fields" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "custom_fields_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entity" text NOT NULL,
	"label" text NOT NULL,
	"help_text" text,
	"type" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"show_on_website" boolean DEFAULT false NOT NULL,
	"filterable" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_fields_entity_check" CHECK ("custom_fields"."entity" in ('organization', 'program', 'contact', 'document')),
	CONSTRAINT "custom_fields_type_check" CHECK ("custom_fields"."type" in ('text', 'longText', 'number', 'yesNo', 'date', 'choice', 'multiChoice', 'link', 'phone', 'email'))
);
--> statement-breakpoint
ALTER TABLE IF EXISTS "contacts" ADD COLUMN IF NOT EXISTS "custom" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "documents" ADD COLUMN IF NOT EXISTS "custom" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "organizations" ADD COLUMN IF NOT EXISTS "custom" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE IF EXISTS "programs" ADD COLUMN IF NOT EXISTS "custom" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_fields_entity_idx" ON "custom_fields" USING btree ("entity" text_ops);