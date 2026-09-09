CREATE TABLE "vocabulary_explanations" (
	"key" text PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"owner" uuid NOT NULL,
	"lease_until" timestamp with time zone NOT NULL,
	"explanation" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vocabulary_explanations" ADD CONSTRAINT "vocabulary_explanations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;