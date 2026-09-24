import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { vocabularyExplanations } from "@/db/schema";
import type { z } from "zod";
import type { LearningUnit } from "@/types";
import { VOCABULARY_PROMPT_VERSION, vocabularyContext, vocabularyExplanationSchema, type VocabularyExplanation } from "./content";
import { ETYMOLOGY_PROMPT_VERSION, etymologyContext, koreanEtymologySchema, type KoreanEtymology } from "./etymology";

type CachedCard = VocabularyExplanation | KoreanEtymology;
type Cached = { explanation: CachedCard | null; lease: number; owner: string };
const demo = new Map<string, Cached>();
export function vocabularyCacheKey(schoolId: string, unit: LearningUnit, term: string) {
  return createHash("sha256").update(JSON.stringify([schoolId, unit.courseCode, unit.id, VOCABULARY_PROMPT_VERSION, vocabularyContext(unit, term)])).digest("hex");
}
export function etymologyCacheKey(schoolId: string, term: string, unit?: LearningUnit) {
  return createHash("sha256").update(JSON.stringify([schoolId, "etymology", unit?.courseCode ?? null, unit?.id ?? null, ETYMOLOGY_PROMPT_VERSION, etymologyContext(term, unit)])).digest("hex");
}
async function readCached<T extends CachedCard>(key: string, schema: z.ZodType<T>) {
  if (!db) {
    const cached = demo.get(key)?.explanation;
    return cached ? schema.parse(cached) : null;
  }
  const [row] = await db.select({ explanation: vocabularyExplanations.explanation }).from(vocabularyExplanations).where(eq(vocabularyExplanations.key, key)).limit(1);
  return row?.explanation ? schema.parse(row.explanation) : null;
}
export const readExplanation = (key: string) => readCached(key, vocabularyExplanationSchema);
export const readEtymology = (key: string) => readCached(key, koreanEtymologySchema);
export async function discardCached(key: string) {
  if (!db) return void demo.delete(key);
  await db.delete(vocabularyExplanations).where(eq(vocabularyExplanations.key, key));
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
export async function finishExplanation(key: string, owner: string, explanation: CachedCard | null) {
  if (!db) {
    if (demo.get(key)?.owner !== owner) return;
    if (explanation) demo.set(key, { owner, lease: 0, explanation }); else demo.delete(key);
    return;
  }
  const where = and(eq(vocabularyExplanations.key, key), eq(vocabularyExplanations.owner, owner));
  if (explanation) await db.update(vocabularyExplanations).set({ explanation }).where(where);
  else await db.delete(vocabularyExplanations).where(where);
}
