CREATE TABLE "generated_course_contents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"offering_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"units_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"source_model" text,
	"prompt_version" integer DEFAULT 1 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"reviewer_id" uuid,
	"reviewed_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school_course_offerings" ADD COLUMN "content_course_id" uuid;--> statement-breakpoint
ALTER TABLE "generated_course_contents" ADD CONSTRAINT "generated_course_contents_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_course_contents" ADD CONSTRAINT "generated_course_contents_offering_id_school_course_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."school_course_offerings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_course_contents" ADD CONSTRAINT "generated_course_contents_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_course_contents" ADD CONSTRAINT "generated_course_contents_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "generated_course_content_offering_idx" ON "generated_course_contents" USING btree ("offering_id");--> statement-breakpoint
ALTER TABLE "school_course_offerings" ADD CONSTRAINT "school_course_offerings_content_course_id_courses_id_fk" FOREIGN KEY ("content_course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;