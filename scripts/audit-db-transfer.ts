import { config } from "dotenv";
import { sql } from "drizzle-orm";

type QueryResult<T> = { rows?: T[] };
const rows = <T>(result: unknown) => (result as QueryResult<T>).rows ?? [];

async function main() {
  config({ path: ".env.local" });
  const { db } = await import("../src/db");
  if (!db) throw new Error("DATABASE_URL is required");
  const [database, generated, bookmarks, indexes] = await Promise.all([
    db.execute(sql`SELECT pg_database_size(current_database())::bigint AS bytes`),
    db.execute(sql`SELECT COUNT(*)::int AS rows,
      COALESCE(SUM(pg_column_size(units_json)), 0)::bigint AS stored_bytes,
      COALESCE(SUM(CASE WHEN status = 'PUBLISHED' THEN pg_column_size(units_json) ELSE 0 END), 0)::bigint AS published_bytes
      FROM generated_course_contents`),
    db.execute(sql`SELECT COUNT(*)::int AS rows,
      COALESCE(SUM(octet_length(answer_markdown)), 0)::bigint AS detail_bytes,
      COALESCE(SUM(octet_length(title) + octet_length(preview_text) + 64), 0)::bigint AS list_bytes,
      COUNT(*) FILTER (WHERE preview_text = '')::int AS blank_previews,
      COUNT(*) FILTER (WHERE answer_markdown ~* 'data:image/[a-z0-9.+-]+;base64,')::int AS inline_images
      FROM bookmarks`),
    db.execute(sql`SELECT indexname FROM pg_indexes WHERE schemaname = current_schema()
      AND indexname IN (
        'bookmarks_student_school_created_id_idx',
        'feedback_school_status_created_id_idx',
        'generated_course_school_status_course_idx',
        'pricing_model_effective_idx',
        'school_curriculum_published_idx',
        'usage_events_school_status_created_idx',
        'usage_events_student_school_status_created_idx'
      ) ORDER BY indexname`),
  ]);
  console.info(JSON.stringify({
    database: rows(database)[0],
    generatedCourseContents: rows(generated)[0],
    bookmarks: rows(bookmarks)[0],
    optimizationIndexes: rows<{ indexname: string }>(indexes).map((row) => row.indexname),
  }, null, 2));
}

void main();
