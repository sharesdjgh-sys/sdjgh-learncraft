ALTER TABLE "bookmarks" ADD COLUMN "preview_text" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "bookmarks_student_school_created_id_idx" ON "bookmarks" USING btree ("student_id","school_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feedback_school_status_created_id_idx" ON "feedback" USING btree ("school_id","status","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "generated_course_school_status_course_idx" ON "generated_course_contents" USING btree ("school_id","status","course_id");--> statement-breakpoint
CREATE INDEX "pricing_model_effective_idx" ON "pricing_configs" USING btree ("model_id","effective_from" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "school_curriculum_published_idx" ON "school_curriculum_versions" USING btree ("school_id","published_at" DESC NULLS LAST) WHERE "school_curriculum_versions"."status" = 'PUBLISHED';--> statement-breakpoint
CREATE INDEX "usage_events_school_status_created_idx" ON "usage_events" USING btree ("school_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "usage_events_student_school_status_created_idx" ON "usage_events" USING btree ("student_id","school_id","status","created_at" DESC NULLS LAST);