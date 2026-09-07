import { requireLearner } from "@/lib/auth";
import { readLearningImage } from "@/features/tutor/learning-image-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireLearner();
  if (!user) return new Response(null, { status: 401 });
  try {
    const { id } = await context.params;
    const image = await readLearningImage(user, id);
    return image ? new Response(image, { headers: {
      "Content-Type": "image/webp", "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } }) : new Response(null, { status: 404 });
  } catch { return new Response(null, { status: 503 }); }
}
