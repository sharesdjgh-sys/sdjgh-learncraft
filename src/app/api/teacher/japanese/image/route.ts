import { requireTeacherTools } from "@/lib/auth";
import { imageSizes } from "@/lib/ai-figure/image-prompt";
import { env, isOpenAiImageConfigured } from "@/lib/env";
import { geminiAspectRatios, isGeminiImageReady, requestGeminiImage } from "@/lib/gemini-image";
import { requestOpenAiImage } from "@/lib/openai-image";
import { checkRequestRateLimit, requestIp } from "@/lib/rate-limit";
import { buildCultureImagePrompt, cultureImageRequestSchema } from "@/features/japanese/culture-image";

export const runtime = "nodejs";
// 자세한 그림은 GPT·Gemini가 1~2분쯤 걸릴 수 있습니다.
export const maxDuration = 180;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const parsed = cultureImageRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "그림 요청 내용을 확인해 주세요." }, 400);
  const input = parsed.data;
  if (input.provider === "gpt" && !isOpenAiImageConfigured) return json({ error: "서버에 OpenAI API 키(OPENAI_API_KEY)가 설정되지 않았습니다." }, 503);
  if (input.provider === "gemini" && !isGeminiImageReady()) return json({ error: "서버에서 Gemini 그림 만들기를 쓸 수 없습니다(GEMINI_API_KEY·GEMINI_IMAGE_ENABLED 확인)." }, 503);
  const rateLimit = await checkRequestRateLimit({ category: "teacherImage", userId: user.id, schoolId: user.schoolId, ip: requestIp(request) });
  if (!rateLimit.allowed) return json({ error: "그림 요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, 429);

  const prompt = buildCultureImagePrompt(input);
  const gemini = input.provider === "gemini";
  const size = gemini ? `${geminiAspectRatios[input.size]} · ${input.large ? "2K" : "1K"}` : imageSizes[input.size][input.large ? "large" : "normal"];
  const started = Date.now();
  const result = gemini
    ? await requestGeminiImage({ prompt, aspect: input.size, large: input.large, signal: request.signal })
    : await requestOpenAiImage({ prompt, size, signal: request.signal });
  if (!result.ok) {
    console.error("teacher_japanese_image_failure", { userId: user.id, provider: input.provider, model: gemini ? env.GEMINI_IMAGE_MODEL_ID : env.OPENAI_IMAGE_MODEL_ID, topicId: input.topicId, ...result.detail });
    return json({ error: result.error }, result.status);
  }
  console.info("teacher_japanese_image", { userId: user.id, provider: input.provider, topicId: input.topicId, style: input.style, text: input.text, size, model: result.model, ...(!gemini && { quality: env.OPENAI_IMAGE_QUALITY }), seconds: Math.round((Date.now() - started) / 1000) });
  return json({ image: result.image, prompt, size, model: result.model });
}
