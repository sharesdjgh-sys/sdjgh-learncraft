import { NextResponse } from "next/server";
import { getSession, requireLearner } from "@/lib/auth";
import { createFeedbackSchema, feedbackQuerySchema } from "@/features/feedback/model";
import { createFeedback, findFeedback, listFeedback } from "@/features/feedback/repository";
import { ImageInputError, normalizeImage, saveImage, removeImage } from "@/features/feedback/image-storage";
import type { StoredFeedbackImage } from "@/features/feedback/model";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user || !["STUDENT", "TEACHER", "ADMIN"].includes(user.role)) return NextResponse.json({ error: { message: "로그인이 필요해요." } }, { status: 401 });
  const url = new URL(request.url);
  const query = feedbackQuerySchema.safeParse({ page: url.searchParams.get("page") ?? undefined, status: url.searchParams.get("status") ?? undefined });
  if (!query.success) return NextResponse.json({ error: { message: "조회 조건을 확인해 주세요." } }, { status: 400 });
  try { return NextResponse.json(await listFeedback(user, query.data), { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return NextResponse.json({ error: { message: "피드백을 불러오지 못했어요. 다시 시도해 주세요." } }, { status: 503 }); }
}

export async function POST(request: Request) {
  const user = await requireLearner();
  if (!user) return NextResponse.json({ error: { message: "학생 또는 선생님 로그인이 필요해요." } }, { status: 401 });
  // Bound the actual stream too: Content-Length can be absent or forged.
  let payload: unknown;
  let files: File[] = [];
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    if (reader) while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 3 * 1024 * 1024 + 64 * 1024) { await reader.cancel(); return NextResponse.json({ error: { message: "첨부 용량이 너무 커요. 이미지를 줄여 주세요." } }, { status: 413 }); }
      chunks.push(value);
    }
    const body = new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "application/json" } });
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const form = await body.formData();
      if ([...form.keys()].some((key) => !["payload", "images"].includes(key)) || form.getAll("payload").length !== 1) throw new ImageInputError("입력 내용을 확인해 주세요.");
      payload = JSON.parse(String(form.get("payload")));
      const attachments = form.getAll("images");
      if (attachments.length > 3 || attachments.some((file) => !(file instanceof File))) throw new ImageInputError("이미지는 최대 3장까지 첨부할 수 있어요.");
      files = attachments as File[];
    } else payload = await body.json();
  } catch (error) { return NextResponse.json({ error: { message: error instanceof ImageInputError ? error.message : "입력 내용을 확인해 주세요." } }, { status: 400 }); }
  const parsed = createFeedbackSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: { message: "유형, 제목(100자 이내), 내용(3,000자 이내)을 확인해 주세요." } }, { status: 400 });
  const saved: StoredFeedbackImage[] = [];
  try {
    const existing = await findFeedback(user, parsed.data.requestId, true);
    if (existing) return NextResponse.json({ item: await createFeedback(user, parsed.data) }, { status: 201 });
    if (files.length && process.env.NODE_ENV === "production" && !process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: { message: "이미지 저장소 연결이 필요해요. 학교 관리자에게 알려주세요." } }, { status: 503 });
    const normalized = [];
    for (const file of files) normalized.push(await normalizeImage(file));
    for (const image of normalized) saved.push(await saveImage(image));
    const item = await createFeedback(user, parsed.data, saved);
    // Concurrent retries may have inserted first; discard only this request's unused objects.
    await Promise.all(saved.filter((image) => !item.images.some((used) => used.id === image.id)).map(removeImage));
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    // An interrupted DB response may still have committed. Never delete a referenced image.
    try {
      const existing = await findFeedback(user, parsed.data.requestId, true);
      await Promise.all(saved.filter((image) => !existing?.images.some((used) => used.id === image.id)).map(removeImage));
    } catch { console.error("Feedback attachment cleanup needs retry", parsed.data.requestId); }
    return NextResponse.json({ error: { message: error instanceof ImageInputError ? error.message : "등록하지 못했어요. 입력 내용은 유지되니 다시 시도해 주세요." } }, { status: error instanceof ImageInputError ? 400 : 503 });
  }
}
