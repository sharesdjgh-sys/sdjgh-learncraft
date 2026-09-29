import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { requireLearner } from "@/lib/auth";
import { env, isGeminiConfigured } from "@/lib/env";
import { REPORT_GUIDE, reportSchema } from "@/features/learning-progress/model";
import { buildLearningReportInput } from "@/features/learning-progress/report-input";
import { claimReport, finishReport, getLearningProgress } from "@/features/learning-progress/repository";
import { checkRequestRateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;
const inputSchema = z.object({ days: z.union([z.literal(7), z.literal(30)]) }).strict();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  // Ownership comes exclusively from the authenticated session, never from the request.
  const user = await requireLearner();
  if (!user) return json({ error: "로그인이 필요해요." }, 401);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "분석 기간만 지정할 수 있어요. 본인의 기록만 분석합니다." }, 400);
  const days = parsed.data.days;
  let owner: string | null = null;
  let date = "";
  try {
    const data = await getLearningProgress(user, days);
    date = data.date;
    if (data.report) return json(data.report);
    const input = buildLearningReportInput(data, user);
    if (!input.units.length) return json({ error: "질문이나 성찰 기록을 먼저 남겨 주세요." }, 400);
    if (!isGeminiConfigured) return json({ error: "AI 분석 연결이 준비되지 않았어요. 학습 기록은 계속 이용할 수 있어요." }, 503);
    const rateLimit = await checkRequestRateLimit({ category: "check", userId: user.id, schoolId: user.schoolId, ip: requestIp(request) });
    if (!rateLimit.allowed) return json({ error: "요청이 많아요. 잠시 후 다시 시도해 주세요." }, 429);
    owner = await claimReport(user, days, date);
    if (!owner) return json({ error: "분석을 생성 중이에요. 잠시 후 새로고침해 주세요." }, 409);
    const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
    const result = await generateText({
      model: google(env.GEMINI_PRIMARY_MODEL_ID), maxRetries: 0, maxOutputTokens: 3500,
      abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]),
      output: Output.object({ schema: reportSchema }), system: REPORT_GUIDE, prompt: JSON.stringify(input),
    });
    const content = reportSchema.parse(result.output);
    await finishReport(user, days, date, owner, content);
    console.info("learning_report_generated", { model: env.GEMINI_PRIMARY_MODEL_ID, usage: result.usage });
    return json({ content, createdAt: new Date().toISOString() });
  } catch {
    if (owner) await finishReport(user, days, date, owner, null).catch(() => undefined);
    return json({ error: "AI 분석을 완성하지 못했어요. 기록은 보관되어 있으니 다시 시도해 주세요." }, 502);
  }
}
