/**
 * The database tables, pulled from the database with `drizzle-kit pull` (2026-11-07). The database is
 * the source: the team made the tables outside this repo. drizzle/0000_*.sql (all commented out) and
 * drizzle/meta/ are the migration baseline, so `pnpm db:generate` writes only the changes.
 *
 * To change a table: edit this file, then `pnpm db:generate` and `pnpm db:migrate`. If someone changes
 * the database directly, pull again (into a temp `out`) and copy the new schema.ts over this file.
 */
import { pgTable, index, foreignKey, integer, text, boolean, timestamp, doublePrecision, date, unique, primaryKey } from "drizzle-orm/pg-core"

export const contacts = pgTable("contacts", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "contacts_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	programId: integer("program_id").notNull(),
	name: text().notNull(),
	title: text(),
	specialty: text(),
	email: text(),
	phone: text(),
	showOnWebsite: boolean("show_on_website").default(false).notNull(),
	internalNotes: text("internal_notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("contacts_program_id_idx").using("btree", table.programId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [programs.id],
			name: "contacts_program_id_programs_id_fk"
		}).onDelete("cascade"),
]);

export const programs = pgTable("programs", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "programs_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	organizationId: integer("organization_id").notNull(),
	name: text().notNull(),
	description: text(),
	searchKeywords: text("search_keywords"),
	streetAddress: text("street_address"),
	suite: text(),
	city: text(),
	state: text(),
	zip: text(),
	latitude: doublePrecision(),
	longitude: doublePrecision(),
	phone: text(),
	website: text(),
	serviceFormatId: integer("service_format_id"),
	hours: text(),
	costOptionId: integer("cost_option_id"),
	insuranceAcceptanceId: integer("insurance_acceptance_id"),
	eligibilityNotes: text("eligibility_notes"),
	lastVerified: date("last_verified"),
	statusId: integer("status_id").notNull(),
	internalNotes: text("internal_notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("programs_organization_id_idx").using("btree", table.organizationId.asc().nullsLast().op("int4_ops")),
	index("programs_status_id_idx").using("btree", table.statusId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "programs_organization_id_organizations_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.serviceFormatId],
			foreignColumns: [serviceFormats.id],
			name: "programs_service_format_id_service_formats_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.costOptionId],
			foreignColumns: [costOptions.id],
			name: "programs_cost_option_id_cost_options_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.insuranceAcceptanceId],
			foreignColumns: [insuranceAcceptanceOptions.id],
			name: "programs_insurance_acceptance_id_insurance_acceptance_options_i"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.statusId],
			foreignColumns: [statuses.id],
			name: "programs_status_id_statuses_id_fk"
		}).onDelete("restrict"),
]);

export const documents = pgTable("documents", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "documents_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	title: text().notNull(),
	description: text(),
	searchKeywords: text("search_keywords"),
	url: text().notNull(),
	lastVerified: date("last_verified"),
	statusId: integer("status_id").notNull(),
	internalNotes: text("internal_notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.statusId],
			foreignColumns: [statuses.id],
			name: "documents_status_id_statuses_id_fk"
		}).onDelete("restrict"),
]);

export const organizations = pgTable("organizations", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "organizations_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	about: text(),
	website: text(),
	email: text(),
	phone: text(),
	streetAddress: text("street_address"),
	suite: text(),
	city: text(),
	state: text(),
	zip: text(),
	county: text(),
	latitude: doublePrecision(),
	longitude: doublePrecision(),
	lastVerified: date("last_verified"),
	statusId: integer("status_id").notNull(),
	internalNotes: text("internal_notes"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.statusId],
			foreignColumns: [statuses.id],
			name: "organizations_status_id_statuses_id_fk"
		}).onDelete("restrict"),
]);

export const subcategories = pgTable("subcategories", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "subcategories_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	categoryId: integer("category_id").notNull(),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "subcategories_category_id_categories_id_fk"
		}).onDelete("cascade"),
	unique("subcategories_category_name_unique").on(table.name, table.categoryId),
]);

export const categories = pgTable("categories", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "categories_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	unique("categories_name_unique").on(table.name),
]);

export const languages = pgTable("languages", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "languages_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	unique("languages_name_unique").on(table.name),
]);

export const insurancePlans = pgTable("insurance_plans", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "insurance_plans_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	unique("insurance_plans_name_unique").on(table.name),
]);

export const audiences = pgTable("audiences", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "audiences_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	unique("audiences_name_unique").on(table.name),
]);

export const costOptions = pgTable("cost_options", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "cost_options_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	unique("cost_options_name_unique").on(table.name),
]);

export const serviceFormats = pgTable("service_formats", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "service_formats_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	unique("service_formats_name_unique").on(table.name),
]);

export const insuranceAcceptanceOptions = pgTable("insurance_acceptance_options", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "insurance_acceptance_options_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	unique("insurance_acceptance_options_name_unique").on(table.name),
]);

export const statuses = pgTable("statuses", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "statuses_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	showOnSite: boolean("show_on_site").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	unique("statuses_name_unique").on(table.name),
]);

export const documentCategories = pgTable("document_categories", {
	documentId: integer("document_id").notNull(),
	categoryId: integer("category_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "document_categories_document_id_documents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "document_categories_category_id_categories_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.documentId, table.categoryId], name: "document_categories_document_id_category_id_pk"}),
]);

export const documentSubcategories = pgTable("document_subcategories", {
	documentId: integer("document_id").notNull(),
	subcategoryId: integer("subcategory_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "document_subcategories_document_id_documents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.subcategoryId],
			foreignColumns: [subcategories.id],
			name: "document_subcategories_subcategory_id_subcategories_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.subcategoryId, table.documentId], name: "document_subcategories_document_id_subcategory_id_pk"}),
]);

export const documentLanguages = pgTable("document_languages", {
	documentId: integer("document_id").notNull(),
	languageId: integer("language_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "document_languages_document_id_documents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.languageId],
			foreignColumns: [languages.id],
			name: "document_languages_language_id_languages_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.languageId, table.documentId], name: "document_languages_document_id_language_id_pk"}),
]);

export const programCategories = pgTable("program_categories", {
	programId: integer("program_id").notNull(),
	categoryId: integer("category_id").notNull(),
}, (table) => [
	index("program_categories_category_id_idx").using("btree", table.categoryId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [programs.id],
			name: "program_categories_program_id_programs_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "program_categories_category_id_categories_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.programId, table.categoryId], name: "program_categories_program_id_category_id_pk"}),
]);

export const programSubcategories = pgTable("program_subcategories", {
	programId: integer("program_id").notNull(),
	subcategoryId: integer("subcategory_id").notNull(),
}, (table) => [
	index("program_subcategories_subcategory_id_idx").using("btree", table.subcategoryId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [programs.id],
			name: "program_subcategories_program_id_programs_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.subcategoryId],
			foreignColumns: [subcategories.id],
			name: "program_subcategories_subcategory_id_subcategories_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.subcategoryId, table.programId], name: "program_subcategories_program_id_subcategory_id_pk"}),
]);

export const programLanguages = pgTable("program_languages", {
	programId: integer("program_id").notNull(),
	languageId: integer("language_id").notNull(),
}, (table) => [
	index("program_languages_language_id_idx").using("btree", table.languageId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [programs.id],
			name: "program_languages_program_id_programs_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.languageId],
			foreignColumns: [languages.id],
			name: "program_languages_language_id_languages_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.programId, table.languageId], name: "program_languages_program_id_language_id_pk"}),
]);

export const programInsurancePlans = pgTable("program_insurance_plans", {
	programId: integer("program_id").notNull(),
	insurancePlanId: integer("insurance_plan_id").notNull(),
}, (table) => [
	index("program_insurance_plans_insurance_plan_id_idx").using("btree", table.insurancePlanId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [programs.id],
			name: "program_insurance_plans_program_id_programs_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.insurancePlanId],
			foreignColumns: [insurancePlans.id],
			name: "program_insurance_plans_insurance_plan_id_insurance_plans_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.programId, table.insurancePlanId], name: "program_insurance_plans_program_id_insurance_plan_id_pk"}),
]);

export const programAudiences = pgTable("program_audiences", {
	programId: integer("program_id").notNull(),
	audienceId: integer("audience_id").notNull(),
}, (table) => [
	index("program_audiences_audience_id_idx").using("btree", table.audienceId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [programs.id],
			name: "program_audiences_program_id_programs_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.audienceId],
			foreignColumns: [audiences.id],
			name: "program_audiences_audience_id_audiences_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.programId, table.audienceId], name: "program_audiences_program_id_audience_id_pk"}),
]);
