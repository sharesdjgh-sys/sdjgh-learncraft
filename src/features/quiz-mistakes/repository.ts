import { and, desc, eq, sql } from "drizzle-orm";
import {
  deleteQuizMistake as deleteDemoQuizMistake,
  listQuizMistakes as listDemoQuizMistakes,
  saveQuizMistake as saveDemoQuizMistake,
} from "@/data/demo-store";
import { db } from "@/db";
import { courses, quizMistakes, subjects, units } from "@/db/schema";
import type { QuizMistake } from "@/types";

export type QuizMistakeInput = Omit<QuizMistake, "id" | "createdAt" | "updatedAt" | "resolvedAt" | "unitTitle" | "subjectTitle"> & {
  resolved: boolean;
};

function serialize(row: Omit<QuizMistake, "createdAt" | "updatedAt" | "resolvedAt"> & { createdAt: Date; updatedAt: Date; resolvedAt: Date | null }): QuizMistake {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

export async function listStudentQuizMistakes(studentId: string, schoolId: string, limit = 50): Promise<QuizMistake[]> {
  if (!db) {
    const items = listDemoQuizMistakes(studentId).slice(0, limit);
    const { getSchoolLearningUnits } = await import("@/data/school-curriculum");
    const unitById = new Map((await getSchoolLearningUnits(schoolId, { outlineOnly: true })).map((unit) => [unit.id, unit]));
    return items.map((item) => ({
      ...item,
      unitTitle: unitById.get(item.unitId)?.title,
      subjectTitle: unitById.get(item.unitId)?.subjectTitle,
    }));
  }
  const rows = await db.select({
    id: quizMistakes.id,
    unitId: quizMistakes.unitId,
    clientQuizId: quizMistakes.clientQuizId,
    problemMarkdown: quizMistakes.problemMarkdown,
    studentAnswer: quizMistakes.studentAnswer,
    correctAnswer: quizMistakes.correctAnswer,
    attempts: quizMistakes.attempts,
    hintsUsed: quizMistakes.hintsUsed,
    confusions: quizMistakes.confusions,
    note: quizMistakes.note,
    resolvedAt: quizMistakes.resolvedAt,
    createdAt: quizMistakes.createdAt,
    updatedAt: quizMistakes.updatedAt,
    unitTitle: units.title,
    subjectTitle: subjects.title,
  }).from(quizMistakes)
    .innerJoin(units, eq(units.id, quizMistakes.unitId))
    .innerJoin(courses, eq(courses.id, units.courseId))
    .innerJoin(subjects, eq(subjects.id, courses.subjectId))
    .where(and(eq(quizMistakes.studentId, studentId), eq(quizMistakes.schoolId, schoolId)))
    .orderBy(desc(quizMistakes.createdAt))
    .limit(limit);
  return rows.map(serialize);
}

export async function saveStudentQuizMistake(studentId: string, schoolId: string, input: QuizMistakeInput): Promise<QuizMistake> {
  if (!db) {
    return saveDemoQuizMistake(studentId, input);
  }
  const { resolved, ...fields } = input;
  const now = new Date();
  const [row] = await db.insert(quizMistakes).values({
    ...fields,
    schoolId,
    studentId,
    resolvedAt: resolved ? now : null,
  }).onConflictDoUpdate({
    target: [quizMistakes.studentId, quizMistakes.clientQuizId],
    set: {
      studentAnswer: fields.studentAnswer,
      attempts: fields.attempts,
      hintsUsed: fields.hintsUsed,
      confusions: fields.confusions,
      note: fields.note,
      resolvedAt: resolved ? sql`coalesce(${quizMistakes.resolvedAt}, now())` : null,
      updatedAt: now,
    },
    setWhere: eq(quizMistakes.schoolId, schoolId),
  }).returning({
    id: quizMistakes.id,
    unitId: quizMistakes.unitId,
    clientQuizId: quizMistakes.clientQuizId,
    problemMarkdown: quizMistakes.problemMarkdown,
    studentAnswer: quizMistakes.studentAnswer,
    correctAnswer: quizMistakes.correctAnswer,
    attempts: quizMistakes.attempts,
    hintsUsed: quizMistakes.hintsUsed,
    confusions: quizMistakes.confusions,
    note: quizMistakes.note,
    resolvedAt: quizMistakes.resolvedAt,
    createdAt: quizMistakes.createdAt,
    updatedAt: quizMistakes.updatedAt,
  });
  if (!row) throw new Error("QUIZ_MISTAKE_SAVE_FAILED");
  return serialize(row);
}

export async function deleteStudentQuizMistake(studentId: string, schoolId: string, id: string) {
  if (!db) return deleteDemoQuizMistake(studentId, id);
  const deleted = await db.delete(quizMistakes).where(and(
    eq(quizMistakes.id, id),
    eq(quizMistakes.studentId, studentId),
    eq(quizMistakes.schoolId, schoolId),
  )).returning({ id: quizMistakes.id });
  return deleted.length > 0;
}
