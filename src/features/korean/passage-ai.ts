/* 국어 · 독서: 교사가 붙여 넣은 지문으로 문단 요약 참고 답, 어휘 후보, 지문 맞춤 질문 초안을 Gemini로 만듭니다.
   결과는 교사가 고칠 수 있는 입력 칸에만 채우고, 문단 수·길이·지문에 실제로 있는 낱말인지 검사해 어긋난 것은 버립니다. */
import { z } from "zod";

export const PASSAGE_AI_MAX_PARAGRAPHS = 30;
export const passageAiRequestSchema = z.object({
  title: z.string().max(80).optional(),
  paragraphs: z.array(z.string().trim().min(1).max(3000)).min(1, "지문을 넣어 주세요.").max(PASSAGE_AI_MAX_PARAGRAPHS, `문단은 ${PASSAGE_AI_MAX_PARAGRAPHS}개까지 다룰 수 있어요.`),
  summaries: z.boolean(),
  words: z.boolean(),
  questions: z.boolean(),
}).refine(input => input.summaries || input.words || input.questions, "만들 것을 하나 이상 골라 주세요.")
  .refine(input => input.paragraphs.join("").length <= 8000, "지문은 8000자까지 다룰 수 있어요.");
export type PassageAiRequest = z.infer<typeof passageAiRequestSchema>;

export const passageAiSchema = z.object({
  summaries: z.array(z.string()),
  words: z.array(z.string()),
  questions: z.array(z.object({ kind: z.string(), text: z.string() })),
});

export const PASSAGE_AI_PROMPT = `당신은 한국 고등학교 국어(독서) 교사를 돕는 학습지 편집자입니다. 교사가 준 지문으로 학습지 초안을 만듭니다.
- summaries: 문단마다 중심 내용을 한 문장(60자 이내, '~다.'로 끝나는 평서문)으로 씁니다. 입력 문단 수와 개수·순서가 같아야 합니다. 지문에 없는 내용은 덧붙이지 않습니다.
- words: 고등학생이 뜻을 사전에서 찾아볼 만한 어려운 낱말·한자어·개념어 6~10개. 지문에 쓰인 형태 그대로(활용형이면 기본형 말고 지문 속 형태) 적고, 조사는 뗍니다.
- questions: 이 지문에만 맞는 서술형 질문 3개. kind는 '사실적', '추론적', '비판적' 중 하나로 하나씩 씁니다. 문단은 [2]처럼 번호로 가리킬 수 있습니다. 질문은 '~쓰시오.' 또는 '~설명하시오.'로 끝냅니다.
- 요청에서 만들지 않기로 한 항목은 빈 배열로 둡니다.`;

export function passageAiTask(input: PassageAiRequest) {
  return JSON.stringify({
    title: input.title?.trim() || undefined,
    paragraphs: input.paragraphs.map((text, index) => `[${index + 1}] ${text.replace(/[[\]]/g, "")}`),
    make: { summaries: input.summaries, words: input.words, questions: input.questions },
  });
}

const KINDS = ["사실적", "추론적", "비판적"];
/** 받은 결과를 검사합니다. 요약은 문단 수에 맞추고, 어휘는 지문에 실제로 있는 것만, 질문은 세 가지 읽기 방법으로 한정합니다. */
export function normalizePassageAi(input: PassageAiRequest, output: z.infer<typeof passageAiSchema>) {
  const clean = (text: string) => text.replace(/\s+/g, " ").trim();
  const body = input.paragraphs.join(" ").replace(/[[\]]/g, "");
  const summaries = input.summaries ? input.paragraphs.map((_, index) => clean(output.summaries[index] ?? "").slice(0, 300)) : [];
  const words = input.words ? [...new Set(output.words.map(word => clean(word).replace(/[,.·]/g, "")).filter(word => word.length >= 2 && word.length <= 20 && body.includes(word)))].slice(0, 12) : [];
  const questions = input.questions ? output.questions
    .map(item => ({ kind: KINDS.find(kind => item.kind.includes(kind)) ?? "", text: clean(item.text).slice(0, 200) }))
    .filter(item => item.kind && item.text.length >= 8).slice(0, 3) : [];
  const dropped = (input.words ? output.words.length - words.length : 0) + (input.questions ? output.questions.length - questions.length : 0);
  return { summaries, words, questions, dropped: Math.max(0, dropped) };
}
