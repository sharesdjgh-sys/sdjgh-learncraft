CREATE TABLE "shared_course_source_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_fingerprint" text NOT NULL,
	"curriculum_revision" text DEFAULT '2022' NOT NULL,
	"course_title" text NOT NULL,
	"publisher_name" text NOT NULL,
	"textbook_title" text,
	"bundle_json" jsonb NOT NULL,
	"source_model" text,
	"research_excerpt" text DEFAULT '' NOT NULL,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shared_course_source_bundle_fingerprint_idx" ON "shared_course_source_bundles" USING btree ("source_fingerprint");