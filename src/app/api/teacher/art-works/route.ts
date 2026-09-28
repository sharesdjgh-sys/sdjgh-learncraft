import { z } from "zod";
import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { requireTeacherTools } from "@/lib/auth";
import { env, isGeminiConfigured } from "@/lib/env";
import { checkRequestRateLimit, requestIp } from "@/lib/rate-limit";
import { getCommonsImagesByFile, getProtectedWorkImages, searchCommonsImages } from "@/lib/commons-media";
import { artWorks, findMovement, findTerm, findWork } from "@/lib/art-works/catalog";
import { artLevels, TERM_GUIDE, termExplanationSchema, termPrompt, WORK_GUIDE, workExplanationSchema, workPrompt, type WorkContext } from "@/lib/art-works/explanation";

export const runtime = "nodejs";
export const maxDuration = 60;

const IMAGE_WIDTH = 1280;
const level = z.enum(["middle", "high"] satisfies (keyof typeof artLevels)[]).default("high");
const short = (max: number) => z.string().trim().max(max).optional();
const inputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("work"), level, regenerate: z.boolean().optional(),
    workId: z.string().max(60).optional(),
    // 검색으로 찾은 작품은 Commons 정보로 해설합니다.
    work: z.object({ title: z.string().trim().min(1).max(240), artist: z.string().trim().min(1).max(300), year: short(60), description: short(600) }).optional(),
  }),
  z.object({ kind: z.literal("term"), level, regenerate: z.boolean().optional(), term: z.string().trim().min(1).max(40), termId: z.string().max(60).optional() }),
]);

// 이용 조건 검사를 건너뛰는 저작권 작품 이미지는 카탈로그에 등록한 파일만 받습니다.
const protectedFiles = new Set(artWorks.flatMap(work => work.wikiFile ? [work.wikiFile] : []));

const json = (data: unknown, status = 200, cache = "private, no-store") => Response.json(data, { status, headers: { "Cache-Control": cache } });

// 같은 작품·용어 해설은 서버가 켜져 있는 동안 다시 쓰고, 같은 요청이 겹치면 하나만 만듭니다.
const explanationCache = new Map<string, { until: number; value: Promise<unknown> }>();
function cached<T>(key: string, regenerate: boolean, make: () => Promise<T>): Promise<T> {
  const existing = explanationCache.get(key);
  if (!regenerate && existing && existing.until > Date.now()) return existing.value as Promise<T>;
  const value = make();
  if (explanationCache.size >= 400) explanationCache.delete(explanationCache.keys().next().value!);
  explanationCache.set(key, { until: Date.now() + 12 * 3600_000, value });
  value.catch(() => { if (explanationCache.get(key)?.value === value) explanationCache.delete(key); });
  return value;
}

async function explain<T>(schema: z.ZodType<T>, system: string, prompt: string, userId: string, kind: string) {
  const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
  const result = await generateText({
    model: google(env.GEMINI_PRIMARY_MODEL_ID), maxRetries: 1, maxOutputTokens: 5000,
    abortSignal: AbortSignal.timeout(50_000),
    output: Output.object({ schema }),
    system, prompt,
  });
  console.info("art_explanation_generation", { userId, kind, model: env.GEMINI_PRIMARY_MODEL_ID, usage: result.usage });
  return schema.parse(result.output);
}

export async function GET(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim().slice(0, 120);
  const files = params.get("files")?.split("\n").map(file => file.trim()).filter(Boolean) ?? [];
  if (!query && !files.length) return json({ error: "찾을 작품이나 파일을 알려 주세요." }, 400);
  try {
    const images = query ? await searchCommonsImages(query, { limit: 24, width: IMAGE_WIDTH }) : (await Promise.all([
      getCommonsImagesByFile(files.filter(file => !protectedFiles.has(file)), IMAGE_WIDTH),
      getProtectedWorkImages(files.filter(file => protectedFiles.has(file)), IMAGE_WIDTH),
    ])).flat();
    return json({ images }, 200, "private, max-age=3600");
  } catch (error) {
    return json({ error: error instanceof Error && error.message.includes("요청 제한") ? error.message : "작품 이미지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, 502);
  }
}

export async function POST(request: Request) {
  const user = await requireTeacherTools();
  if (!user) return json({ error: "교사 또는 관리자 권한이 필요합니다." }, 403);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "해설할 작품이나 용어를 확인해 주세요." }, 400);
  const input = parsed.data;

  let key: string;
  let make: () => Promise<unknown>;
  if (input.kind === "work") {
    const catalogWork = input.workId ? findWork(input.workId) : undefined;
    let context: WorkContext;
    if (catalogWork) {
      const { title, original, artist, year, place, medium, point } = catalogWork;
      context = { title, original, artist, year, place, medium, point, movement: findMovement(catalogWork.movementId)?.name };
    } else if (input.work) context = input.work;
    else return json({ error: "해설할 작품을 골라 주세요." }, 400);
    key = JSON.stringify(["work", catalogWork?.id ?? [context.title, context.artist], input.level]);
    make = () => explain(workExplanationSchema, WORK_GUIDE, workPrompt(context, input.level), user.id, input.kind);
  } else {
    const catalogTerm = input.termId ? findTerm(input.termId) : undefined;
    const term = catalogTerm?.term ?? input.term;
    key = JSON.stringify(["term", catalogTerm?.id ?? term.toLowerCase(), input.level]);
    make = () => explain(termExplanationSchema, TERM_GUIDE, termPrompt(term, input.level, catalogTerm), user.id, input.kind);
  }

  if (!isGeminiConfigured) return json({ error: "Gemini API 키가 설정되지 않았습니다." }, 503);
  const rateLimit = await checkRequestRateLimit({ category: "tutor", userId: user.id, schoolId: user.schoolId, ip: requestIp(request) });
  if (!rateLimit.allowed) return json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, 429);
  try {
    const explanation = await cached(key, Boolean(input.regenerate), make);
    return json({ explanation });
  } catch (error) {
    console.error(`art_explanation_failure ${error instanceof Error ? `${error.name}: ${error.message}` : "UnknownError"}`, { userId: user.id, kind: input.kind });
    return json({ error: request.signal.aborted ? "요청이 취소되었습니다." : "AI 해설을 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
