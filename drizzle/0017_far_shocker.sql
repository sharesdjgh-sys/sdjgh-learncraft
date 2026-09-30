CREATE TABLE "teacher_assistant_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" text,
	"tool" text,
	"status" text NOT NULL,
	"off_topic" boolean DEFAULT false NOT NULL,
	"model_id" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teacher_assistant_events" ADD CONSTRAINT "teacher_assistant_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_assistant_events" ADD CONSTRAINT "teacher_assistant_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "teacher_assistant_events_school_created_idx" ON "teacher_assistant_events" USING btree ("school_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "teacher_assistant_events_user_created_idx" ON "teacher_assistant_events" USING btree ("user_id","created_at" DESC NULLS LAST);