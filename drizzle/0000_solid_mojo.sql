-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "contacts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contacts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"program_id" integer NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"specialty" text,
	"email" text,
	"phone" text,
	"show_on_website" boolean DEFAULT false NOT NULL,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "programs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"search_keywords" text,
	"street_address" text,
	"suite" text,
	"city" text,
	"state" text,
	"zip" text,
	"latitude" double precision,
	"longitude" double precision,
	"phone" text,
	"website" text,
	"service_format_id" integer,
	"hours" text,
	"cost_option_id" integer,
	"insurance_acceptance_id" integer,
	"eligibility_notes" text,
	"last_verified" date,
	"status_id" integer NOT NULL,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"description" text,
	"search_keywords" text,
	"url" text NOT NULL,
	"last_verified" date,
	"status_id" integer NOT NULL,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organizations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"about" text,
	"website" text,
	"email" text,
	"phone" text,
	"street_address" text,
	"suite" text,
	"city" text,
	"state" text,
	"zip" text,
	"county" text,
	"latitude" double precision,
	"longitude" double precision,
	"last_verified" date,
	"status_id" integer NOT NULL,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subcategories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "subcategories_category_name_unique" UNIQUE("name","category_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "languages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "languages_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "insurance_plans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "insurance_plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "insurance_plans_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "audiences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audiences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "audiences_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "cost_options" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cost_options_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cost_options_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "service_formats" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "service_formats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "service_formats_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "insurance_acceptance_options" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "insurance_acceptance_options_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "insurance_acceptance_options_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "statuses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "statuses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"show_on_site" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "statuses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "document_categories" (
	"document_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "document_categories_document_id_category_id_pk" PRIMARY KEY("document_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "document_subcategories" (
	"document_id" integer NOT NULL,
	"subcategory_id" integer NOT NULL,
	CONSTRAINT "document_subcategories_document_id_subcategory_id_pk" PRIMARY KEY("subcategory_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "document_languages" (
	"document_id" integer NOT NULL,
	"language_id" integer NOT NULL,
	CONSTRAINT "document_languages_document_id_language_id_pk" PRIMARY KEY("language_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "program_categories" (
	"program_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "program_categories_program_id_category_id_pk" PRIMARY KEY("program_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "program_subcategories" (
	"program_id" integer NOT NULL,
	"subcategory_id" integer NOT NULL,
	CONSTRAINT "program_subcategories_program_id_subcategory_id_pk" PRIMARY KEY("subcategory_id","program_id")
);
--> statement-breakpoint
CREATE TABLE "program_languages" (
	"program_id" integer NOT NULL,
	"language_id" integer NOT NULL,
	CONSTRAINT "program_languages_program_id_language_id_pk" PRIMARY KEY("program_id","language_id")
);
--> statement-breakpoint
CREATE TABLE "program_insurance_plans" (
	"program_id" integer NOT NULL,
	"insurance_plan_id" integer NOT NULL,
	CONSTRAINT "program_insurance_plans_program_id_insurance_plan_id_pk" PRIMARY KEY("program_id","insurance_plan_id")
);
--> statement-breakpoint
CREATE TABLE "program_audiences" (
	"program_id" integer NOT NULL,
	"audience_id" integer NOT NULL,
	CONSTRAINT "program_audiences_program_id_audience_id_pk" PRIMARY KEY("program_id","audience_id")
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_service_format_id_service_formats_id_fk" FOREIGN KEY ("service_format_id") REFERENCES "public"."service_formats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_cost_option_id_cost_options_id_fk" FOREIGN KEY ("cost_option_id") REFERENCES "public"."cost_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_insurance_acceptance_id_insurance_acceptance_options_i" FOREIGN KEY ("insurance_acceptance_id") REFERENCES "public"."insurance_acceptance_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_status_id_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."statuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_status_id_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."statuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_status_id_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."statuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_subcategories" ADD CONSTRAINT "document_subcategories_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_subcategories" ADD CONSTRAINT "document_subcategories_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_languages" ADD CONSTRAINT "document_languages_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_languages" ADD CONSTRAINT "document_languages_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_categories" ADD CONSTRAINT "program_categories_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_categories" ADD CONSTRAINT "program_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_subcategories" ADD CONSTRAINT "program_subcategories_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_subcategories" ADD CONSTRAINT "program_subcategories_subcategory_id_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_languages" ADD CONSTRAINT "program_languages_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_languages" ADD CONSTRAINT "program_languages_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_insurance_plans" ADD CONSTRAINT "program_insurance_plans_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_insurance_plans" ADD CONSTRAINT "program_insurance_plans_insurance_plan_id_insurance_plans_id_fk" FOREIGN KEY ("insurance_plan_id") REFERENCES "public"."insurance_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_audiences" ADD CONSTRAINT "program_audiences_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_audiences" ADD CONSTRAINT "program_audiences_audience_id_audiences_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."audiences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_program_id_idx" ON "contacts" USING btree ("program_id" int4_ops);--> statement-breakpoint
CREATE INDEX "programs_organization_id_idx" ON "programs" USING btree ("organization_id" int4_ops);--> statement-breakpoint
CREATE INDEX "programs_status_id_idx" ON "programs" USING btree ("status_id" int4_ops);--> statement-breakpoint
CREATE INDEX "program_categories_category_id_idx" ON "program_categories" USING btree ("category_id" int4_ops);--> statement-breakpoint
CREATE INDEX "program_subcategories_subcategory_id_idx" ON "program_subcategories" USING btree ("subcategory_id" int4_ops);--> statement-breakpoint
CREATE INDEX "program_languages_language_id_idx" ON "program_languages" USING btree ("language_id" int4_ops);--> statement-breakpoint
CREATE INDEX "program_insurance_plans_insurance_plan_id_idx" ON "program_insurance_plans" USING btree ("insurance_plan_id" int4_ops);--> statement-breakpoint
CREATE INDEX "program_audiences_audience_id_idx" ON "program_audiences" USING btree ("audience_id" int4_ops);
*/