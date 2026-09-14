import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { bookmarkPreview } from "../src/lib/bookmark-content";

const visualPattern = /```learncraft-visual\s*\n([\s\S]*?)```/g;

async function main() {
  config({ path: ".env.local" });
  const apply = process.argv.includes("--apply");
  if (apply && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required so migrated images remain available in production.");
  }
  const [{ db }, { bookmarks }, { saveLearningImage }] = await Promise.all([
    import("../src/db"), import("../src/db/schema"), import("../src/features/tutor/learning-image-storage"),
  ]);
  if (!db) throw new Error("DATABASE_URL is required");
  const rows = await db.select({
    id: bookmarks.id,
    schoolId: bookmarks.schoolId,
    studentId: bookmarks.studentId,
    title: bookmarks.title,
    answerMarkdown: bookmarks.answerMarkdown,
  }).from(bookmarks);
  let affectedBookmarks = 0;
  let images = 0;
  for (const row of rows) {
    const matches = [...row.answerMarkdown.matchAll(visualPattern)];
    const migrated = new Map<string, string>();
    for (const match of matches) {
      try {
        const spec = JSON.parse(match[1]) as { kind?: string; id?: string; dataUrl?: string };
        if (spec.kind !== "generated-image" || !spec.id || !spec.dataUrl) continue;
        images += 1;
        if (apply) {
          await saveLearningImage({ id: row.studentId, schoolId: row.schoolId }, spec.id, spec.dataUrl);
          delete spec.dataUrl;
          migrated.set(match[0], `\`\`\`learncraft-visual\n${JSON.stringify(spec)}\n\`\`\``);
        }
      } catch {
        // Invalid legacy visual blocks are left unchanged for manual review.
      }
    }
    if (matches.some((match) => migrated.has(match[0]))) {
      affectedBookmarks += 1;
      const answerMarkdown = row.answerMarkdown.replace(visualPattern, (block) => migrated.get(block) ?? block);
      await db.update(bookmarks).set({ answerMarkdown, previewText: bookmarkPreview(answerMarkdown) || row.title }).where(eq(bookmarks.id, row.id));
    } else if (matches.some((match) => {
      try { return Boolean((JSON.parse(match[1]) as { dataUrl?: string }).dataUrl); } catch { return false; }
    })) affectedBookmarks += 1;
  }
  console.info(JSON.stringify({ scanned: rows.length, affectedBookmarks, images, applied: apply }));
}

void main();
