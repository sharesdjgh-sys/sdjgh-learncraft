import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth";
import { deleteStudentBookmark } from "@/features/bookmarks/repository";

export async function DELETE(_request: Request, context: { params: Promise<{ bookmarkId: string }> }) {
  const user = await requireStudent();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const { bookmarkId } = await context.params;
  if (!(await deleteStudentBookmark(user.id, bookmarkId))) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
