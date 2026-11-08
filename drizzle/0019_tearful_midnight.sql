-- 복합 외래키가 참조할 사용자 고유 인덱스를 먼저 만든다.
CREATE UNIQUE INDEX "users_school_id_id_unique" ON "users" USING btree ("school_id","id");--> statement-breakpoint
ALTER TABLE "smart_campus_user_bindings" ADD CONSTRAINT "smart_campus_bindings_same_school_fk" FOREIGN KEY ("school_id","user_id") REFERENCES "public"."users"("school_id","id") ON DELETE cascade ON UPDATE no action;
