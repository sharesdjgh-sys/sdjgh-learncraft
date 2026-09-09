import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { vocabularyExplanations } from "@/db/schema";
import type { LearningUnit } from "@/types";
import { VOCABULARY_PROMPT_VERSION, vocabularyContext, vocabularyExplanationSchema, type VocabularyExplanation } from "./content";

type Cached = { explanation: VocabularyExplanation | null; lease: number; owner: string };
const demo = new Map<string, Cached>();
export function vocabularyCacheKey(schoolId: string, unit: LearningUnit, term: string) {
  return createHash("sha256").update(JSON.stringify([schoolId, unit.courseCode, unit.id, VOCABULARY_PROMPT_VERSION, vocabularyContext(unit, term)])).digest("hex");
}
export async function readExplanation(key: string) {
  if (!db) return demo.get(key)?.explanation ?? null;
  const [row] = await db.select({ explanation: vocabularyExplanations.explanation }).from(vocabularyExplanations).where(eq(vocabularyExplanations.key, key)).limit(1);
  return row?.explanation ? vocabularyExplanationSchema.parse(row.explanation) : null;
}
export async function claimExplanation(key: string, schoolId: string) {
  const owner = randomUUID();
  if (!db) {
    const current = demo.get(key);
    if (current && (current.explanation || current.lease > Date.now())) return null;
    demo.set(key, { explanation: null, owner, lease: Date.now() + 60_000 });
    return owner;
  }
  const rows = await db.insert(vocabularyExplanations).values({ key, schoolId, owner, leaseUntil: new Date(Date.now() + 60_000) })
    .onConflictDoUpdate({ target: vocabularyExplanations.key, set: { owner, leaseUntil: new Date(Date.now() + 60_000) },
      setWhere: sql`${vocabularyExplanations.explanation} IS NULL AND ${vocabularyExplanations.leaseUntil} < now()` }).returning({ key: vocabularyExplanations.key });
  return rows.length ? owner : null;
}
export async function finishExplanation(key: string, owner: string, explanation: VocabularyExplanation | null) {
  if (!db) {
    if (demo.get(key)?.owner !== owner) return;
    if (explanation) demo.set(key, { owner, lease: 0, explanation }); else demo.delete(key);
    return;
  }
  const where = and(eq(vocabularyExplanations.key, key), eq(vocabularyExplanations.owner, owner));
  if (explanation) await db.update(vocabularyExplanations).set({ explanation }).where(where);
  else await db.delete(vocabularyExplanations).where(where);
}
