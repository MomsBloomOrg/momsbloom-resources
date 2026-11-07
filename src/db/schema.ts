/**
 * The database tables, pulled from the database with `drizzle-kit pull` (2026-11-07). The database is
 * the source: the team made the tables outside this repo. drizzle/0000_*.sql (all commented out) and
 * drizzle/meta/ are the migration baseline, so `pnpm db:generate` writes only the changes.
 *
 * To change a table: edit this file, then `pnpm db:generate` and `pnpm db:migrate`. If someone changes
 * the database directly, pull again (into a temp `out`) and copy the new schema.ts over this file.
 */
import { pgTable, index, foreignKey, integer, text, boolean, timestamp, doublePrecision, date, unique, primaryKey, jsonb, uuid, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
// Type-only (erased at runtime), and a relative path because drizzle-kit does not know the "@/" alias.
import type { CustomFieldOption, CustomValues } from "../custom-fields/types"

/** Custom field values on a record, keyed by custom_fields.id (src/custom-fields/README.md). */
const custom = () => jsonb().$type<CustomValues>().default({}).notNull()

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
	custom: custom(),
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
	custom: custom(),
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
	custom: custom(),
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
	custom: custom(),
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
	hidden: boolean().default(false).notNull(),
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
	hidden: boolean().default(false).notNull(),
}, (table) => [
	unique("categories_name_unique").on(table.name),
]);

export const languages = pgTable("languages", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "languages_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	hidden: boolean().default(false).notNull(),
}, (table) => [
	unique("languages_name_unique").on(table.name),
]);

export const insurancePlans = pgTable("insurance_plans", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "insurance_plans_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	hidden: boolean().default(false).notNull(),
}, (table) => [
	unique("insurance_plans_name_unique").on(table.name),
]);

export const audiences = pgTable("audiences", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "audiences_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	hidden: boolean().default(false).notNull(),
}, (table) => [
	unique("audiences_name_unique").on(table.name),
]);

export const costOptions = pgTable("cost_options", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "cost_options_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	hidden: boolean().default(false).notNull(),
}, (table) => [
	unique("cost_options_name_unique").on(table.name),
]);

export const serviceFormats = pgTable("service_formats", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "service_formats_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	hidden: boolean().default(false).notNull(),
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

/**
 * Fields that Staff admins add themselves (src/custom-fields/README.md). The values live in the `custom`
 * column of each record table, keyed by this id. Rows are archived (archived_at), never deleted.
 * The checks below are a safety net; the rules are in src/custom-fields/definitions.ts.
 */
export const customFields = pgTable("custom_fields", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "custom_fields_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	entity: text().notNull(),
	label: text().notNull(),
	helpText: text("help_text"),
	type: text().notNull(),
	options: jsonb().$type<CustomFieldOption[]>().default([]).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	showOnWebsite: boolean("show_on_website").default(false).notNull(),
	filterable: boolean().default(false).notNull(),
	archivedAt: timestamp("archived_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("custom_fields_entity_idx").using("btree", table.entity.asc().nullsLast().op("text_ops")),
	check("custom_fields_entity_check", sql`${table.entity} in ('organization', 'program', 'contact', 'document')`),
	check("custom_fields_type_check", sql`${table.type} in ('text', 'longText', 'number', 'yesNo', 'date', 'choice', 'multiChoice', 'link', 'phone', 'email')`),
]);

// ---------------------------------------------------------------------------------------------
// Admin login (Auth.js). Written here, not pulled: the column names follow @auth/drizzle-adapter.
// A Staff admin row is made at the first login of an Owner (an address on ADMIN_EMAILS), or when a
// Staff admin adds an address in the Admin (src/admin/staff-admins.ts; then `added_at` is set).
// No accounts table: the email link is the only login (ADR 0003), and Auth.js's email flow never
// reads or writes accounts.

export const staffAdmins = pgTable("staff_admins", {
	id: uuid().primaryKey().defaultRandom(),
	email: text().notNull().unique(),
	name: text(),
	emailVerified: timestamp("email_verified", { withTimezone: true, mode: 'date' }),
	image: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).defaultNow().notNull(),
	// Set when a Staff admin adds the address in the Admin. Null for a row that an Owner's first login
	// made: that row is allowed only while its address is on ADMIN_EMAILS.
	addedAt: timestamp("added_at", { withTimezone: true, mode: 'date' }),
}, (table) => [
	check("staff_admins_email_lowercase", sql`${table.email} = lower(${table.email})`),
]);

export const authSessions = pgTable("auth_sessions", {
	sessionToken: text("session_token").primaryKey(),
	userId: uuid("user_id").notNull().references(() => staffAdmins.id, { onDelete: "cascade" }),
	expires: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
}, (table) => [
	index("auth_sessions_user_idx").on(table.userId),
]);

export const authVerificationTokens = pgTable("auth_verification_tokens", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.identifier, table.token] }),
]);

// Rate limits (src/rate-limit). One row per bucket and key: a fixed window and its hit count. The key
// is an HMAC, never a raw IP or email.
export const rateLimits = pgTable("rate_limits", {
	bucket: text().notNull(),
	keyHash: text("key_hash").notNull(),
	windowStart: timestamp("window_start", { withTimezone: true, mode: 'date' }).notNull(),
	hits: integer().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'date' }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.bucket, table.keyHash] }),
	index("rate_limits_expires_idx").on(table.expiresAt),
	check("rate_limits_hits_positive", sql`${table.hits} >= 1`),
]);

// Site content (src/admin/help-box.ts): editable text, one row per key. A blank field has no row, so
// the default shows.
export const siteContent = pgTable("site_content", {
	key: text().primaryKey().notNull(),
	value: text().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
