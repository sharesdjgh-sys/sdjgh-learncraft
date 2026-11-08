CREATE TABLE "smart_campus_user_bindings" (
	"school_id" uuid NOT NULL,
	"platform_user_id" text NOT NULL,
	"registration_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "smart_campus_user_bindings_school_id_platform_user_id_pk" PRIMARY KEY("school_id","platform_user_id")
);
--> statement-breakpoint
ALTER TABLE "smart_campus_user_bindings" ADD CONSTRAINT "smart_campus_user_bindings_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_campus_user_bindings" ADD CONSTRAINT "smart_campus_user_bindings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "smart_campus_bindings_school_registration_idx" ON "smart_campus_user_bindings" USING btree ("school_id","registration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "smart_campus_bindings_user_idx" ON "smart_campus_user_bindings" USING btree ("user_id");