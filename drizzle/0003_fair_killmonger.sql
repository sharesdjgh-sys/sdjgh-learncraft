CREATE TYPE "public"."curriculum_import_status" AS ENUM('REVIEW', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."school_curriculum_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "curriculum_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"academic_year" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_hash" text NOT NULL,
	"page_count" integer NOT NULL,
	"extracted_count" integer DEFAULT 0 NOT NULL,
	"status" "curriculum_import_status" DEFAULT 'REVIEW' NOT NULL,
	"uploaded_by" uuid,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_course_offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"row_key" text NOT NULL,
	"grade" integer NOT NULL,
	"subject_code" text NOT NULL,
	"subject_title" text NOT NULL,
	"course_title" text NOT NULL,
	"publisher_name" text DEFAULT '' NOT NULL,
	"textbook_title" text,
	"content_course_code" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"review_required" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_curriculum_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"academic_year" integer NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"status" "school_curriculum_status" DEFAULT 'DRAFT' NOT NULL,
	"source_file_name" text,
	"created_by" uuid,
	"published_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "curriculum_imports" ADD CONSTRAINT "curriculum_imports_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_imports" ADD CONSTRAINT "curriculum_imports_version_id_school_curriculum_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."school_curriculum_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_imports" ADD CONSTRAINT "curriculum_imports_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_course_offerings" ADD CONSTRAINT "school_course_offerings_version_id_school_curriculum_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."school_curriculum_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_curriculum_versions" ADD CONSTRAINT "school_curriculum_versions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_curriculum_versions" ADD CONSTRAINT "school_curriculum_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_curriculum_versions" ADD CONSTRAINT "school_curriculum_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "school_course_offering_idx" ON "school_course_offerings" USING btree ("version_id","row_key");--> statement-breakpoint
CREATE UNIQUE INDEX "school_curriculum_version_idx" ON "school_curriculum_versions" USING btree ("school_id","academic_year","revision");
--> statement-breakpoint
INSERT INTO "school_curriculum_versions" (
  "id",
  "school_id",
  "academic_year",
  "revision",
  "title",
  "status",
  "source_file_name",
  "published_at"
)
SELECT
  md5("school_id"::text || ':' || "academic_year"::text)::uuid,
  "school_id",
  "academic_year",
  1,
  "academic_year"::text || '학년도 교육과정',
  'PUBLISHED',
  '기존 교육과정 데이터',
  now()
FROM "school_course_selections"
GROUP BY "school_id", "academic_year"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "school_course_offerings" (
  "version_id",
  "row_key",
  "grade",
  "subject_code",
  "subject_title",
  "course_title",
  "publisher_name",
  "content_course_code",
  "enabled",
  "confidence",
  "review_required",
  "display_order"
)
SELECT
  md5("school_id"::text || ':' || "academic_year"::text)::uuid,
  "catalog_key",
  "grade",
  "subject_code",
  CASE "subject_code"
    WHEN 'KOREAN' THEN '국어'
    WHEN 'ENGLISH' THEN '영어'
    WHEN 'MATH' THEN '수학'
    WHEN 'SOCIAL' THEN '사회'
    WHEN 'SCIENCE' THEN '과학'
    WHEN 'ARTS' THEN '예체능'
    ELSE '기타'
  END,
  "course_title",
  "publisher_name",
  "content_course_code",
  "enabled",
  100,
  false,
  (row_number() OVER (
    PARTITION BY "school_id", "academic_year"
    ORDER BY "grade", "subject_code", "catalog_key"
  ) - 1)::integer
FROM "school_course_selections"
ON CONFLICT DO NOTHING;
