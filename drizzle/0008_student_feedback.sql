CREATE TYPE "public"."feedback_category" AS ENUM('BUG', 'IMPROVEMENT', 'QUESTION');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('RECEIVED', 'IN_PROGRESS', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"category" "feedback_category" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"status" "feedback_status" DEFAULT 'RECEIVED' NOT NULL,
	"reply" text DEFAULT '' NOT NULL,
	"handled_by" uuid,
	"completed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_student_request_idx" ON "feedback" USING btree ("student_id","request_id");--> statement-breakpoint
CREATE INDEX "feedback_school_created_idx" ON "feedback" USING btree ("school_id","created_at");--> statement-breakpoint
CREATE INDEX "feedback_student_created_idx" ON "feedback" USING btree ("student_id","created_at");