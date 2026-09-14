import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { bookmarkPreview } from "../src/lib/bookmark-content";

async function main() {
  config({ path: ".env.local" });
  const [{ db }, { bookmarks }] = await Promise.all([import("../src/db"), import("../src/db/schema")]);
  if (!db) throw new Error("DATABASE_URL is required");
  const rows = await db.select({ id: bookmarks.id, title: bookmarks.title, answerMarkdown: bookmarks.answerMarkdown }).from(bookmarks);
  let updated = 0;
  for (const row of rows) {
    await db.update(bookmarks).set({ previewText: bookmarkPreview(row.answerMarkdown) || row.title }).where(eq(bookmarks.id, row.id));
    updated += 1;
  }
  console.info(JSON.stringify({ scanned: rows.length, updated }));
}

void main();
