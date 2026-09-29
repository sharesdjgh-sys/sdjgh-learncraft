import { z } from "zod";
import { requireTeacherTools } from "@/lib/auth";
import { parseAiFigureDoc } from "@/lib/ai-figure/model";
import { buildImagePrompt, imageSizes, imageStyles, MAX_IMAGE_REQUEST } from "@/lib/ai-figure/image-prompt";
import { env, isOpenAiImageConfigured } from "@/lib/env";
import { geminiAspectRatios, isGeminiImageReady, requestGeminiImage } from "@/lib/gemini-image";
import { requestOpenAiImage } from "@/lib/openai-image";
import { checkRequestRateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
// 자세한 그림은 GPT·Gemini가 1~2분쯤 걸릴 수 있습니다.
export const maxDuration = 180;

const MAX_FIGURE_BYTES = 8 * 1024 * 1024;
const inputSchema = z.object({
  provider: z.enum(["gpt", "gemini"]).default("gpt"),
  mode: z.enum(["figure", "free"]),
  style: z.enum(imageStyles.map((style) => style.id) as [string, ...string[]]),
  size: z.enum(Object.keys(imageSizes) as [keyof typeof imageSizes, ...(keyof typeof imageSizes)[]]),
  large: z.boolean(),
  request: z.string().max(MAX_IMAGE_REQUEST),
});

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);

  const form = await request.formData().catch(() => null);
  const parsed = inputSchema.safeParse({
    provider: form?.get("provider") ?? undefined,
    mode: form?.get("mode"),
    style: form?.get("style"),
    size: form?.get("size"),
    large: form?.get("large") === "true",
    request: typeof form?.get("request") === "string" ? form.get("request") : "",
  });
  if (!parsed.success) return json({ error: "그림 요청 내용을 확인해 주세요." }, 400);
  const input = parsed.data;

  let figure: File | null = null;
  let doc = null;
  if (input.mode === "figure") {
    const file = form?.get("figure");
    const docText = form?.get("doc");
    try { doc = typeof docText === "string" ? parseAiFigureDoc(JSON.parse(docText)) : null; } catch { doc = null; }
    if (!doc || !(file instanceof File) || file.type !== "image/png" || file.size === 0 || file.size > MAX_FIGURE_BYTES) {
      return json({ error: "다시 그릴 그림을 읽지 못했어요. 그림을 확인한 뒤 다시 시도해 주세요." }, 400);
    }
    figure = file;
  } else if (input.request.trim().length < 4) {
    return json({ error: "어떤 그림을 만들지 조금 더 자세히 적어 주세요." }, 400);
  }

  if (input.provider === "gpt" && !isOpenAiImageConfigured) return json({ error: "서버에 OpenAI API 키(OPENAI_API_KEY)가 설정되지 않았습니다." }, 503);
  if (input.provider === "gemini" && !isGeminiImageReady()) return json({ error: "서버에서 Gemini 그림 만들기를 쓸 수 없습니다(GEMINI_API_KEY·GEMINI_IMAGE_ENABLED 확인)." }, 503);
  const rateLimit = await checkRequestRateLimit({ category: "teacherImage", userId: user.id, schoolId: user.schoolId, ip: requestIp(request) });
  if (!rateLimit.allowed) return json({ error: "그림 요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, 429);

  const prompt = buildImagePrompt({ mode: input.mode, style: input.style as (typeof imageStyles)[number]["id"], request: input.request, doc });
  const gemini = input.provider === "gemini";
  const size = gemini ? `${geminiAspectRatios[input.size]} · ${input.large ? "2K" : "1K"}` : imageSizes[input.size][input.large ? "large" : "normal"];
  const started = Date.now();
  // 선생님이 그린 그림이 있으면 참고 이미지로 보내 구조·글자·숫자를 그대로 따르게 합니다. GPT·Gemini 모두 같은 설명을 보냅니다.
  const result = gemini
    ? await requestGeminiImage({ prompt, aspect: input.size, large: input.large, signal: request.signal, reference: figure })
    : await requestOpenAiImage({ prompt, size, signal: request.signal, reference: figure });
  if (!result.ok) {
    console.error("teacher_ai_figure_image_failure", { userId: user.id, provider: input.provider, model: gemini ? env.GEMINI_IMAGE_MODEL_ID : env.OPENAI_IMAGE_MODEL_ID, ...result.detail });
    return json({ error: result.error }, result.status);
  }
  console.info("teacher_ai_figure_image", { userId: user.id, provider: input.provider, mode: input.mode, style: input.style, size, model: result.model, ...(!gemini && { quality: env.OPENAI_IMAGE_QUALITY }), seconds: Math.round((Date.now() - started) / 1000) });
  return json({ image: result.image, prompt, size, model: result.model });
}
