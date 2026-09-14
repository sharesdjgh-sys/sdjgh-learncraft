import { NextResponse } from "next/server";
import { requireLearner } from "@/lib/auth";
import { deleteStudentBookmark, getStudentBookmark } from "@/features/bookmarks/repository";
import { observedJson } from "@/lib/observability";
import { deleteLearningImages } from "@/features/tutor/learning-image-storage";
import { learningImageIds } from "@/lib/bookmark-content";

export async function GET(_request: Request, context: { params: Promise<{ bookmarkId: string }> }) {
  const user = await requireLearner();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const { bookmarkId } = await context.params;
  const bookmark = await getStudentBookmark(user.id, user.schoolId, bookmarkId);
  if (!bookmark) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  return observedJson({ bookmark }, { route: "bookmarks.detail", budgetBytes: 350_000, headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ bookmarkId: string }> }) {
  const user = await requireLearner();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const { bookmarkId } = await context.params;
  const answerMarkdown = await deleteStudentBookmark(user.id, user.schoolId, bookmarkId);
  if (!answerMarkdown) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
  const imageIds = learningImageIds(answerMarkdown);
  if (imageIds.length) {
    try { await deleteLearningImages(user, imageIds); }
    catch (error) { console.error("bookmark_image_cleanup_failed", { bookmarkId, imageIds, error }); }
  }
  return NextResponse.json({ ok: true });
}
