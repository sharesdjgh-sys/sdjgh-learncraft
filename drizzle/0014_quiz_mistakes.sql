CREATE TABLE "quiz_mistakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"client_quiz_id" text NOT NULL,
	"problem_markdown" text NOT NULL,
	"student_answer" text NOT NULL,
	"correct_answer" text NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"confusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quiz_mistakes" ADD CONSTRAINT "quiz_mistakes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_mistakes" ADD CONSTRAINT "quiz_mistakes_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_mistakes" ADD CONSTRAINT "quiz_mistakes_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_mistakes_student_quiz_idx" ON "quiz_mistakes" USING btree ("student_id","client_quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_mistakes_student_school_created_idx" ON "quiz_mistakes" USING btree ("student_id","school_id","created_at" DESC NULLS LAST);