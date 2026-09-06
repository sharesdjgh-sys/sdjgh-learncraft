import { getSession } from "@/lib/auth";
import { deleteFeedback } from "@/features/feedback/repository";
import { z } from "zod";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !["STUDENT", "ADMIN"].includes(user.role)) return Response.json({ error: { message: "로그인이 필요해요." } }, { status: 401 });
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return Response.json({ error: { message: "피드백을 찾을 수 없어요." } }, { status: 404 });
  try {
    return await deleteFeedback(user, id) ? Response.json({ ok: true }) : Response.json({ error: { message: "피드백을 찾을 수 없어요." } }, { status: 404 });
  } catch { return Response.json({ error: { message: "삭제하지 못했어요. 다시 시도해 주세요." } }, { status: 503 }); }
}
