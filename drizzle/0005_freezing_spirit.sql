CREATE TABLE "course_achievement_standards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"code" text NOT NULL,
	"content" text NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_source_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"publisher_name" text,
	"excerpt" text NOT NULL,
	"source_fingerprint" text NOT NULL,
	"source_model" text,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_toc_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offering_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"chapter_title" text NOT NULL,
	"chapter_order" integer NOT NULL,
	"section_title" text NOT NULL,
	"section_order" integer NOT NULL,
	"topic_title" text NOT NULL,
	"topic_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "overview" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "publisher_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "chapter_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "chapter_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "section_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "section_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "topic_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "recommended_questions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "keywords" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "common_mistakes" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "assessment_tags" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "units" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "course_achievement_standards" ADD CONSTRAINT "course_achievement_standards_offering_id_school_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."school_course_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_achievement_standards" ADD CONSTRAINT "course_achievement_standards_source_document_id_course_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."course_source_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_source_documents" ADD CONSTRAINT "course_source_documents_offering_id_school_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."school_course_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_toc_entries" ADD CONSTRAINT "course_toc_entries_offering_id_school_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."school_course_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_toc_entries" ADD CONSTRAINT "course_toc_entries_source_document_id_course_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."course_source_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_achievement_standard_offering_code_idx" ON "course_achievement_standards" USING btree ("offering_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "course_source_document_offering_kind_url_idx" ON "course_source_documents" USING btree ("offering_id","kind","url");--> statement-breakpoint
CREATE UNIQUE INDEX "course_toc_entry_offering_order_idx" ON "course_toc_entries" USING btree ("offering_id","chapter_order","section_order","topic_order");