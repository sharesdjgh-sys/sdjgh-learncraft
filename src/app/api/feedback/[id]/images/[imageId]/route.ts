import { getSession } from "@/lib/auth";
import { findFeedback } from "@/features/feedback/repository";
import { readImage } from "@/features/feedback/image-storage";
import { z } from "zod";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const user = await getSession();
  if (!user) return new Response(null, { status: 401 });
  const { id, imageId } = await params;
  if (!z.string().uuid().safeParse(id).success || !z.string().uuid().safeParse(imageId).success) return new Response(null, { status: 404 });
  try {
    const row = await findFeedback(user, id);
    const image = row?.images.find((item) => item.id === imageId);
    if (!image) return new Response(null, { status: 404 });
    const body = await readImage(image);
    if (!body) return new Response(null, { status: 404 });
    return new Response(body, { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": 'inline; filename="feedback.webp"' } });
  } catch { return new Response(null, { status: 503 }); }
}
