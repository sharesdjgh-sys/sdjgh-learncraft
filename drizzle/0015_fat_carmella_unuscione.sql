CREATE TABLE "learning_reflections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"learning_date" date NOT NULL,
	"minutes" integer NOT NULL,
	"confidence" integer NOT NULL,
	"learned" text NOT NULL,
	"difficulty" text DEFAULT '' NOT NULL,
	"next_step" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"report_date" date NOT NULL,
	"days" integer NOT NULL,
	"report" jsonb,
	"model_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_reflections" ADD CONSTRAINT "learning_reflections_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_reflections" ADD CONSTRAINT "learning_reflections_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_reflections" ADD CONSTRAINT "learning_reflections_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_reports" ADD CONSTRAINT "learning_reports_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_reports" ADD CONSTRAINT "learning_reports_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "learning_reflection_student_unit_date_idx" ON "learning_reflections" USING btree ("student_id","school_id","unit_id","learning_date");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_report_student_date_period_idx" ON "learning_reports" USING btree ("student_id","school_id","report_date","days");