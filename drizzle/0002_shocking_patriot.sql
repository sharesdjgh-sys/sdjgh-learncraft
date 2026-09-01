CREATE TABLE "school_course_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"catalog_key" text NOT NULL,
	"academic_year" integer NOT NULL,
	"grade" integer NOT NULL,
	"subject_code" text NOT NULL,
	"course_title" text NOT NULL,
	"publisher_name" text NOT NULL,
	"content_course_code" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school_course_selections" ADD CONSTRAINT "school_course_selections_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "school_course_selection_idx" ON "school_course_selections" USING btree ("school_id","academic_year","catalog_key");