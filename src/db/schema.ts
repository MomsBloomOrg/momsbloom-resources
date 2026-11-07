/**
 * Database schema for the MomsBloom Resource Directory (Postgres on Neon).
 *
 * This file is the single source of truth for the database structure.
 * Drizzle (our database toolkit) reads it to create the SQL that builds the tables.
 * See docs/data-model.md for a plain-language tour and how each spreadsheet column maps here.
 *
 * The shape of the data:
 *
 *   organizations ──< programs ──< contacts
 *                        │
 *                        ├──< program_categories    >── categories ──< subcategories
 *                        ├──< program_subcategories >──────────────────┘
 *                        ├──< program_languages     >── languages
 *                        ├──< program_insurance_plans >── insurance_plans
 *                        ├──< program_audiences     >── audiences ("Who it serves")
 *                        └── one value each from: cost_options, service_formats, insurance_acceptance_options
 *
 *   organizations, programs and documents each have one value from: statuses
 *
 *   documents (stand alone; linked to categories, subcategories and languages the same way)
 *
 * "──<" means "one to many". The program_* tables in the middle are join tables.
 * They let one program have many categories (and one category have many programs),
 * which the spreadsheet did with comma-separated text.
 *
 * Programs are what families search for. Organizations hold the shared details
 * (main address, phone, website) that a program uses when its own fields are blank.
 *
 * IDs: every table uses a number that the database assigns ("generated always as identity").
 * The spreadsheet's O-001 / P-001 / D-001 codes are not stored. The import uses them only
 * to link each program to its organization, then drops them.
 */
import {
  pgTable,
  integer,
  text,
  boolean,
  date,
  doublePrecision,
  timestamp,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Managed lists (one table per column on the spreadsheet's Lists tab) */
/* Staff add, rename and remove these values in the admin area.        */
/* Each table has the same basic shape: id, name, sort_order.          */
/* ------------------------------------------------------------------ */

/**
 * Status, for example "Active", "Needs review", "Inactive". Used by organizations, programs and documents.
 *
 * The app decides what to show by `show_on_site`, never by the status name.
 * That way staff can rename "Inactive" to "Hidden" without changing what the public sees.
 */
export const statuses = pgTable("statuses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  /** true = listings with this status appear on the public site. */
  showOnSite: boolean("show_on_site").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Service format, for example "In person", "Virtual", "In person and virtual". */
export const serviceFormats = pgTable("service_formats", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** "Accepts insurance", for example "Yes", "No", "Not applicable". */
export const insuranceAcceptanceOptions = pgTable("insurance_acceptance_options", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Top-level filter, for example "Therapist" or "Basic Needs". */
export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  /** Controls the order in the filter menu. Lower numbers come first. */
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Second-level filter that belongs to exactly one category,
 * for example "PMAD Specialist" under "Therapist".
 * The same name can appear under two categories ("Grief & Loss" is under Therapist and Support Group),
 * so a name only has to be unique inside its own category.
 */
export const subcategories = pgTable(
  "subcategories",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [unique("subcategories_category_name_unique").on(t.categoryId, t.name)],
);

/** Languages a program is offered in, for example "English", "Spanish". */
export const languages = pgTable("languages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Insurance plans, for example "Priority Health". */
export const insurancePlans = pgTable("insurance_plans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** "Who it serves", for example "Pregnant" or "Parents of young children". */
export const audiences = pgTable("audiences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/**
 * Cost, for example "Free", "Sliding scale", "Insurance or self-pay".
 * A program has one cost value. It is a table (not an enum) because staff edit the list.
 */
export const costOptions = pgTable("cost_options", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ------------------------------------------------------------------ */
/* Columns every main table shares                                     */
/* ------------------------------------------------------------------ */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Fields that track whether a listing is still accurate. Same meaning on every tab of the sheet.
 * This is a function so each table gets its own copy of the columns.
 */
const verification = () => ({
  /** The date someone last confirmed this listing is correct. */
  lastVerified: date("last_verified"),
  /**
   * Required. "restrict" means a status can't be deleted while any listing still uses it;
   * staff must move those listings to another status first.
   */
  statusId: integer("status_id")
    .notNull()
    .references(() => statuses.id, { onDelete: "restrict" }),
  /** Staff-only notes. Never send this field to the public site. */
  internalNotes: text("internal_notes"),
});

/* ------------------------------------------------------------------ */
/* Organizations                                                       */
/* ------------------------------------------------------------------ */

export const organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  /** "About this organization" */
  about: text("about"),
  website: text("website"),
  email: text("email"),
  /** Main phone. Stored as text so formatting like "(616) 555-0142" is kept. */
  phone: text("phone"),
  streetAddress: text("street_address"),
  suite: text("suite"),
  city: text("city"),
  /** Two-letter state code, for example "MI". */
  state: text("state"),
  /** Text, not a number, so ZIP codes that start with 0 keep their leading zero. */
  zip: text("zip"),
  county: text("county"),
  /** Map position. Filled in by the MomsBloom or Code for Good team. */
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  ...verification(),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* Programs (what families search for)                                 */
/* ------------------------------------------------------------------ */

export const programs = pgTable(
  "programs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    /**
     * The organization that runs this program.
     * "restrict" means the database refuses to delete an organization that still has programs.
     * To hide an organization, set its status to inactive instead.
     */
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    description: text("description"),
    /**
     * Extra words a parent might type that are not in the name or description
     * (for example "PPD, baby blues"). Kept as one comma-separated text field because it only feeds search.
     */
    searchKeywords: text("search_keywords"),

    // Location and contact overrides. Leave blank to use the organization's value.
    streetAddress: text("street_address"),
    suite: text("suite"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    phone: text("phone"),
    website: text("website"),

    // Single-choice lists. "set null" means deleting a list value blanks this field instead of failing.
    serviceFormatId: integer("service_format_id").references(() => serviceFormats.id, {
      onDelete: "set null",
    }),
    /** Free text because hours are written many ways ("Mon to Fri 9am to 5pm", "Saturdays 10am"). */
    hours: text("hours"),
    costOptionId: integer("cost_option_id").references(() => costOptions.id, {
      onDelete: "set null",
    }),
    insuranceAcceptanceId: integer("insurance_acceptance_id").references(
      () => insuranceAcceptanceOptions.id,
      { onDelete: "set null" },
    ),
    eligibilityNotes: text("eligibility_notes"),
    ...verification(),
    ...timestamps,
  },
  (t) => [
    index("programs_organization_id_idx").on(t.organizationId),
    index("programs_status_id_idx").on(t.statusId),
  ],
);

/* ------------------------------------------------------------------ */
/* Contacts                                                            */
/* ------------------------------------------------------------------ */

/**
 * The person to reach about a program.
 * The spreadsheet allows one main contact per program (columns on the Programs tab).
 * This table allows more than one so we do not need a schema change later.
 * The old "Contacts" tab is not used.
 */
export const contacts = pgTable(
  "contacts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** For example "DC" or "Yoga instructor". */
    title: text("title"),
    /** For example "anxiety, mood disorders". */
    specialty: text("specialty"),
    email: text("email"),
    phone: text("phone"),
    /**
     * "Show contact on website?" Defaults to false (hidden) so we never show
     * a person publicly by accident. Staff must turn it on.
     */
    showOnWebsite: boolean("show_on_website").notNull().default(false),
    internalNotes: text("internal_notes"),
    ...timestamps,
  },
  (t) => [index("contacts_program_id_idx").on(t.programId)],
);

/* ------------------------------------------------------------------ */
/* Documents (downloadable PDFs; they do not belong to an organization) */
/* ------------------------------------------------------------------ */

export const documents = pgTable("documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description"),
  searchKeywords: text("search_keywords"),
  /** "PDF link" */
  url: text("url").notNull(),
  ...verification(),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/* Join tables                                                         */
/* Each row says "this program (or document) has this value".          */
/* The pair of IDs is the primary key, so the same pair can't repeat.  */
/* Deleting a program or a list value removes its join rows too.       */
/* ------------------------------------------------------------------ */

export const programCategories = pgTable(
  "program_categories",
  {
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.programId, t.categoryId] }),
    index("program_categories_category_id_idx").on(t.categoryId),
  ],
);

export const programSubcategories = pgTable(
  "program_subcategories",
  {
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    subcategoryId: integer("subcategory_id")
      .notNull()
      .references(() => subcategories.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.programId, t.subcategoryId] }),
    index("program_subcategories_subcategory_id_idx").on(t.subcategoryId),
  ],
);

export const programLanguages = pgTable(
  "program_languages",
  {
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    languageId: integer("language_id")
      .notNull()
      .references(() => languages.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.programId, t.languageId] }),
    index("program_languages_language_id_idx").on(t.languageId),
  ],
);

export const programInsurancePlans = pgTable(
  "program_insurance_plans",
  {
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    insurancePlanId: integer("insurance_plan_id")
      .notNull()
      .references(() => insurancePlans.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.programId, t.insurancePlanId] }),
    index("program_insurance_plans_insurance_plan_id_idx").on(t.insurancePlanId),
  ],
);

export const programAudiences = pgTable(
  "program_audiences",
  {
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    audienceId: integer("audience_id")
      .notNull()
      .references(() => audiences.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.programId, t.audienceId] }),
    index("program_audiences_audience_id_idx").on(t.audienceId),
  ],
);

export const documentCategories = pgTable(
  "document_categories",
  {
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.categoryId] })],
);

export const documentSubcategories = pgTable(
  "document_subcategories",
  {
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    subcategoryId: integer("subcategory_id")
      .notNull()
      .references(() => subcategories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.subcategoryId] })],
);

export const documentLanguages = pgTable(
  "document_languages",
  {
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    languageId: integer("language_id")
      .notNull()
      .references(() => languages.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.languageId] })],
);
