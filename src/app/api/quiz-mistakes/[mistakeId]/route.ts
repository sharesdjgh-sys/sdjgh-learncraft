import { NextResponse } from "next/server";
import { requireLearner } from "@/lib/auth";
import { deleteStudentQuizMistake } from "@/features/quiz-mistakes/repository";

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_request: Request, context: { params: Promise<{ mistakeId: string }> }) {
  const user = await requireLearner();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const { mistakeId } = await context.params;
  if (!idPattern.test(mistakeId) || !await deleteStudentQuizMistake(user.id, user.schoolId, mistakeId)) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
