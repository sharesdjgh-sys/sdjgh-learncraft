import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { updateFeedbackSchema } from "@/features/feedback/model";
import { updateFeedback } from "@/features/feedback/repository";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: { message: "관리자 권한이 필요해요." } }, { status: 403 });
  const { id } = await params;
  const parsed = updateFeedbackSchema.safeParse(await request.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return NextResponse.json({ error: { message: "처리 상태와 답변 내용을 확인해 주세요." } }, { status: 400 });
  try {
    const result = await updateFeedback(admin, id, parsed.data);
    if (result === "NOT_FOUND") return NextResponse.json({ error: { message: "피드백을 찾을 수 없어요." } }, { status: 404 });
    if (result === "CONFLICT") return NextResponse.json({ error: { message: "다른 관리자가 수정했어요. 새로고침 후 다시 확인해 주세요." } }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: { message: "저장하지 못했어요. 다시 시도해 주세요." } }, { status: 503 }); }
}
