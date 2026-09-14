import { NextResponse } from "next/server";
import { z } from "zod";
import { getSchoolLearningUnit } from "@/data/school-curriculum";
import { requireLearner } from "@/lib/auth";
import { createStudentBookmark, deleteStudentBookmark, listStudentBookmarks } from "@/features/bookmarks/repository";
import { containsInlineImageData, learningImageIds } from "@/lib/bookmark-content";
import { observedJson } from "@/lib/observability";
import { deleteLearningImages, saveLearningImageFile } from "@/features/tutor/learning-image-storage";

const createSchema = z.object({
  clientAnswerId: z.string().uuid(),
  unitId: z.string().min(1).max(100),
  answerMode: z.enum(["QUESTION", "EASIER", "DEEPER", "REVEAL", "QUIZ"]),
  title: z.string().trim().min(1).max(100),
  answerMarkdown: z.string().trim().min(1).max(300_000)
    .refine((value) => !containsInlineImageData(value), "INLINE_IMAGE_NOT_ALLOWED"),
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(24),
  cursor: z.string().max(500).optional(),
  q: z.string().trim().max(80).optional(),
  subject: z.string().trim().max(60).optional(),
  course: z.string().trim().max(100).optional(),
  unit: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const user = await requireLearner();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const parsed = listSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_QUERY" } }, { status: 400 });
  try {
    return observedJson(await listStudentBookmarks(user.id, user.schoolId, {
      limit: parsed.data.limit,
      cursor: parsed.data.cursor,
      query: parsed.data.q,
      subjectCode: parsed.data.subject,
      courseCode: parsed.data.course,
      unitId: parsed.data.unit,
    }), { route: "bookmarks.list", budgetBytes: 64_000, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_BOOKMARK_CURSOR") {
      return NextResponse.json({ error: { code: "INVALID_CURSOR" } }, { status: 400 });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const user = await requireLearner();
  if (!user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  const uploadedImages = new Map<string, File>();
  let input: unknown;
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const payload = form?.get("payload");
    try { input = typeof payload === "string" ? JSON.parse(payload) : null; }
    catch { input = null; }
    if (form) {
      for (const [name, value] of form.entries()) {
        if (!name.startsWith("image:") || !(value instanceof File)) continue;
        const id = name.slice(6);
        if (uploadedImages.has(id)) {
          return NextResponse.json({ error: { code: "DUPLICATE_IMAGE" } }, { status: 400 });
        }
        uploadedImages.set(id, value);
      }
    }
  } else {
    input = await request.json().catch(() => null);
  }
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "저장할 답변을 확인해 주세요." } }, { status: 400 });
  const referencedImageIds = new Set(learningImageIds(parsed.data.answerMarkdown));
  const totalImageBytes = [...uploadedImages.values()].reduce((total, file) => total + file.size, 0);
  if (uploadedImages.size > 4 || totalImageBytes > 4 * 1024 * 1024
    || [...uploadedImages].some(([id, file]) => !referencedImageIds.has(id) || file.type !== "image/webp" || file.size < 1 || file.size > 1_000_000)) {
    return NextResponse.json({ error: { code: "INVALID_BOOKMARK_IMAGES" } }, { status: 400 });
  }
  const unit = await getSchoolLearningUnit(user.schoolId, parsed.data.unitId);
  if (!unit) return NextResponse.json({ error: { code: "UNIT_NOT_AVAILABLE" } }, { status: 404 });
  const savedImageIds: string[] = [];
  const created = await createStudentBookmark({
    ...parsed.data,
    studentId: user.id,
    subjectTitle: unit.subjectTitle,
    unitTitle: unit.title,
  }, user.schoolId);
  try {
    for (const [id, file] of uploadedImages) {
      await saveLearningImageFile(user, id, file);
      savedImageIds.push(id);
    }
    return observedJson({ bookmark: created.bookmark }, { route: "bookmarks.create", status: created.created ? 201 : 200, budgetBytes: 8_000 });
  } catch (error) {
    if (created.created) {
      await deleteStudentBookmark(user.id, user.schoolId, created.bookmark.id).catch(() => null);
      await deleteLearningImages(user, savedImageIds).catch((cleanupError) => {
        console.error("bookmark_image_rollback_failed", { imageIds: savedImageIds, cleanupError });
      });
    }
    if (error instanceof Error && ["INVALID_LEARNING_IMAGE", "INVALID_LEARNING_IMAGE_ID"].includes(error.message)) {
      return NextResponse.json({ error: { code: "INVALID_BOOKMARK_IMAGES" } }, { status: 400 });
    }
    if (error instanceof Error && error.message === "LEARNING_IMAGE_STORAGE_UNAVAILABLE") {
      return NextResponse.json({
        error: { code: "IMAGE_STORAGE_UNAVAILABLE", message: "이미지 저장소에 연결할 수 없어요. 잠시 후 다시 시도해 주세요." },
      }, { status: 503 });
    }
    throw error;
  }
}
