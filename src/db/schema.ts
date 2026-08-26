import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["STUDENT", "ADMIN"]);
export const contentStatus = pgEnum("content_status", [
  "DRAFT",
  "DEVELOPER_REVIEWED",
  "TEACHER_REVIEWED",
  "PUBLISHED",
]);
export const tutorAction = pgEnum("tutor_action", [
  "QUESTION",
  "EASIER",
  "DEEPER",
  "REVEAL",
  "QUIZ",
]);
export const usageStatus = pgEnum("usage_status", [
  "RESERVED",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const schools = pgTable("schools", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").default("Asia/Seoul").notNull(),
  dailyAiLimit: integer("daily_ai_limit").default(20).notNull(),
  active: boolean("active").default(true).notNull(),
  ...timestamps,
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").references(() => schools.id).notNull(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    role: userRole("role").notNull(),
    officialGrade: integer("official_grade"),
    learningGrade: integer("learning_grade"),
    active: boolean("active").default(true).notNull(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_school_external_idx").on(table.schoolId, table.externalId)],
);

export const curriculumVersions = pgTable("curriculum_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  effectiveFrom: date("effective_from"),
  effectiveTo: date("effective_to"),
  active: boolean("active").default(true).notNull(),
});

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
});

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    curriculumVersionId: uuid("curriculum_version_id").references(() => curriculumVersions.id).notNull(),
    subjectId: uuid("subject_id").references(() => subjects.id).notNull(),
    grade: integer("grade").notNull(),
    code: text("code").notNull(),
    title: text("title").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
  },
  (table) => [uniqueIndex("courses_version_code_idx").on(table.curriculumVersionId, table.code)],
);

export const units = pgTable(
  "units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id").references(() => courses.id).notNull(),
    parentUnitId: uuid("parent_unit_id"),
    code: text("code").notNull(),
    title: text("title").notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    scopeIncluded: jsonb("scope_included").$type<string[]>().default([]).notNull(),
    scopeExcluded: jsonb("scope_excluded").$type<string[]>().default([]).notNull(),
    prerequisites: jsonb("prerequisites").$type<string[]>().default([]).notNull(),
    tutorPrompt: text("tutor_prompt").notNull(),
    promptVersion: integer("prompt_version").default(1).notNull(),
    status: contentStatus("status").default("DRAFT").notNull(),
    reviewerName: text("reviewer_name"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("units_course_code_idx").on(table.courseId, table.code)],
);

export const unitContents = pgTable(
  "unit_contents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    unitId: uuid("unit_id").references(() => units.id).notNull(),
    version: integer("version").default(1).notNull(),
    summaryMarkdown: text("summary_markdown").notNull(),
    keyPoints: jsonb("key_points").$type<string[]>().default([]).notNull(),
    formulas: jsonb("formulas").$type<Array<{ name: string; expression: string; explanation: string }>>().default([]).notNull(),
    examples: jsonb("examples").$type<Array<{ title: string; body: string }>>().default([]).notNull(),
    sourceModel: text("source_model"),
    status: contentStatus("status").default("DRAFT").notNull(),
    reviewerName: text("reviewer_name"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("unit_contents_unit_version_idx").on(table.unitId, table.version)],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").references(() => schools.id).notNull(),
    studentId: uuid("student_id").references(() => users.id).notNull(),
    unitId: uuid("unit_id").references(() => units.id).notNull(),
    clientAnswerId: text("client_answer_id").notNull(),
    answerMarkdown: text("answer_markdown").notNull(),
    answerMode: tutorAction("answer_mode").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("bookmarks_student_answer_idx").on(table.studentId, table.clientAnswerId)],
);

export const dailyUsage = pgTable(
  "daily_usage",
  {
    schoolId: uuid("school_id").references(() => schools.id).notNull(),
    studentId: uuid("student_id").references(() => users.id).notNull(),
    usageDate: date("usage_date").notNull(),
    reservedCount: integer("reserved_count").default(0).notNull(),
    completedCount: integer("completed_count").default(0).notNull(),
    inputTokens: integer("input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    cachedInputTokens: integer("cached_input_tokens").default(0).notNull(),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 14, scale: 6 }).default("0").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("daily_usage_student_date_idx").on(table.studentId, table.usageDate)],
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: text("request_id").notNull(),
    schoolId: uuid("school_id").references(() => schools.id).notNull(),
    studentId: uuid("student_id").references(() => users.id).notNull(),
    unitId: uuid("unit_id").references(() => units.id).notNull(),
    action: tutorAction("action").notNull(),
    status: usageStatus("status").default("RESERVED").notNull(),
    modelId: text("model_id").notNull(),
    promptVersion: integer("prompt_version").notNull(),
    contentVersion: integer("content_version").notNull(),
    inputTokens: integer("input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    cachedInputTokens: integer("cached_input_tokens").default(0).notNull(),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 14, scale: 6 }).default("0").notNull(),
    latencyMs: integer("latency_ms"),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("usage_events_student_request_idx").on(table.studentId, table.requestId)],
);

export const pricingConfigs = pgTable("pricing_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  modelId: text("model_id").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  effectiveTo: timestamp("effective_to", { withTimezone: true }),
  inputUsdPerMillion: numeric("input_usd_per_million", { precision: 12, scale: 6 }).notNull(),
  outputUsdPerMillion: numeric("output_usd_per_million", { precision: 12, scale: 6 }).notNull(),
  cachedInputUsdPerMillion: numeric("cached_input_usd_per_million", { precision: 12, scale: 6 }).notNull(),
});
