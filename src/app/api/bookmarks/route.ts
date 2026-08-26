import { NextResponse } from "next/server";
import { z } from "zod";
import { getUnit } from "@/data/curriculum";
import { requireStudent } from "@/lib/auth";
import { createStudentBookmark, listStudentBookmarks } from "@/features/bookmarks/repository";

const createSchema = z.object({
  clientAnswerId: z.string().uuid(),
  unitId: z.string().min(1).max(100),
  answerMode: z.enum(["QUESTION", "EASIER", "DEEPER", "REVEAL", "QUIZ"]),
  title: z.string().trim().min(1).max(100),
  answerMarkdown: z.string().trim().min(1).max(12000),
});

export async function GET() {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  return NextResponse.json({ bookmarks: await listStudentBookmarks(user.id) });
}

export async function POST(request: Request) {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "저장할 답변을 확인해 주세요." } }, { status: 400 });
  const unit = getUnit(parsed.data.unitId);
  if (!unit) return NextResponse.json({ error: { code: "UNIT_NOT_AVAILABLE" } }, { status: 404 });
  const bookmark = await createStudentBookmark({
    ...parsed.data,
    studentId: user.id,
    subjectTitle: unit.subjectTitle,
    unitTitle: unit.title,
  });
  return NextResponse.json({ bookmark }, { status: 201 });
}
