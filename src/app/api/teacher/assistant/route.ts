import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { requireTeacherTools } from "@/lib/auth";
import { env, isGeminiConfigured } from "@/lib/env";
import { checkRequestRateLimit, requestIp } from "@/lib/rate-limit";
import { ASSISTANT_SYSTEM_PROMPT, assistantRequestSchema, buildAssistantMessages, createOffTopicFilter } from "@/features/teacher-assistant/model";
import { recordAssistantEvent, type AssistantEventInput } from "@/features/teacher-assistant/repository";

export const runtime = "nodejs";
export const maxDuration = 120;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

// 교사 지원실 AI 도우미 대화입니다. 선생님이 보고 있는 화면 정보를 함께 받아 답하고, 답변은 글자 단위로 흘려 보냅니다.
// 하루 사용 횟수는 제한하지 않고, 대화마다 교과·상태·범위 밖 여부를 통계에 남깁니다(질문과 답변 내용은 저장하지 않습니다).
export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 로그인이 필요합니다." }, 403);
  const parsed = assistantRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "질문 형식을 확인해 주세요." }, 400);
  const limit = await checkRequestRateLimit({ category: "teacherAssistant", userId: user.id, schoolId: user.schoolId, ip: requestIp(request) });
  if (!limit.allowed) return json({ error: "질문이 너무 빠르게 이어지고 있어요. 잠시 후 다시 시도해 주세요." }, 429);
  if (!isGeminiConfigured) return json({ error: "AI 도우미를 지금은 사용할 수 없어요. 관리자에게 AI 설정을 확인해 달라고 요청해 주세요." }, 503);

  const { page } = parsed.data;
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  const messages = buildAssistantMessages(parsed.data);
  const modelIds = [...new Set([env.GEMINI_PRIMARY_MODEL_ID, env.GEMINI_FALLBACK_MODEL_ID].filter(Boolean))];
  const startedAt = Date.now();
  const encoder = new TextEncoder();
  const record = (event: Pick<AssistantEventInput, "status" | "offTopic" | "modelId"> & Partial<AssistantEventInput>) =>
    recordAssistantEvent({ schoolId: user.schoolId, userId: user.id, subject: page.subject, tool: page.tool, latencyMs: Date.now() - startedAt, ...event });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let emitted = false;
      let modelId = modelIds[0];
      let offTopic = false;
      for (const [attempt, id] of modelIds.entries()) {
        modelId = id;
        const filter = createOffTopicFilter();
        const send = (text: string) => { if (text) { emitted = true; controller.enqueue(encoder.encode(text)); } };
        try {
          const result = streamText({
            model: google(id),
            system: ASSISTANT_SYSTEM_PROMPT,
            messages,
            maxOutputTokens: 3000,
            abortSignal: request.signal,
            providerOptions: { google: { thinkingConfig: { thinkingLevel: "low", includeThoughts: false } } },
          });
          for await (const part of result.fullStream) {
            if (part.type === "text-delta") send(filter.push(part.text));
            else if (part.type === "error") throw part.error;
          }
          send(filter.end());
          if (!emitted) throw new Error("EMPTY_RESPONSE");
          offTopic = filter.offTopic;
          const usage = await Promise.resolve(result.usage).catch(() => undefined);
          console.info("teacher_assistant", { userId: user.id, schoolId: user.schoolId, model: id, attempts: attempt + 1, subject: page.subject, offTopic, elapsedMs: Date.now() - startedAt, usage });
          await record({ status: "SUCCEEDED", offTopic, modelId: id, inputTokens: usage?.inputTokens ?? 0, outputTokens: usage?.outputTokens ?? 0 });
          controller.close();
          return;
        } catch (error) {
          const last = attempt === modelIds.length - 1;
          const cancelled = request.signal.aborted;
          console.warn(`teacher_assistant_attempt_failed ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id, model: id, attempt: attempt + 1, emitted });
          // 이미 글이 나간 뒤에는 다른 모델로 바꾸면 답이 섞이므로 그대로 끝냅니다.
          if (emitted || cancelled || last) {
            await record({ status: cancelled ? "CANCELLED" : "FAILED", offTopic: filter.offTopic, modelId, errorCode: cancelled ? "CLIENT_ABORTED" : emitted ? "STREAM_INTERRUPTED" : error instanceof Error && error.message === "EMPTY_RESPONSE" ? "EMPTY_RESPONSE" : "AI_PROVIDER_ERROR" });
            controller.error(error);
            return;
          }
        }
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
