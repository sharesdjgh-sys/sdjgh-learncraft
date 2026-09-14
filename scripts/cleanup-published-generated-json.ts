import { config } from "dotenv";
import { sql } from "drizzle-orm";

async function main() {
  config({ path: ".env.local" });
  const { db } = await import("../src/db");
  if (!db) throw new Error("DATABASE_URL is required");
  const audit = await db.execute(sql`
    SELECT gcc.id,
      jsonb_array_length(gcc.units_json)::int AS json_units,
      COUNT(u.id)::int AS normalized_units
    FROM generated_course_contents gcc
    LEFT JOIN units u ON u.course_id = gcc.course_id AND u.status = 'PUBLISHED'
    WHERE gcc.status = 'PUBLISHED'
    GROUP BY gcc.id
  `);
  const rows = (audit as unknown as { rows?: Array<{ id: string; json_units: number; normalized_units: number }> }).rows ?? [];
  const unsafe = rows.filter((row) => row.json_units > 0 && row.normalized_units < row.json_units);
  const candidates = rows.filter((row) => row.json_units > 0);
  console.info(JSON.stringify({ publishedRows: rows.length, candidates: candidates.length, unsafe: unsafe.length }));
  if (unsafe.length > 0) throw new Error("Normalized unit coverage is incomplete; cleanup refused.");
  if (!process.argv.includes("--apply")) {
    console.info("Dry run only. Deploy the normalized-content fallback first, then rerun with --apply.");
    return;
  }
  if (!process.argv.includes("--deployed")) throw new Error("Add --deployed to confirm compatible application code is live.");
  const result = await db.execute(sql`UPDATE generated_course_contents SET units_json = '[]'::jsonb, updated_at = now()
    WHERE status = 'PUBLISHED' AND jsonb_array_length(units_json) > 0 RETURNING id`);
  const updated = (result as unknown as { rows?: unknown[] }).rows?.length ?? 0;
  console.info(JSON.stringify({ updated }));
}

void main();
