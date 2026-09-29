/* 영어: 단어 시험지·독해 어휘 목록의 빈 뜻(우리말)과 예문을 Gemini로 채웁니다. 교사가 적은 뜻·예문은 덮어쓰지 않고, 받은 결과는 길이·한글·단어 포함 여부를 검사해 어긋난 것은 버립니다. */
import { z } from "zod";
import { findWord, WORD_LIMITS } from "./wordlist";

export const WORD_FILL_MAX = 30;
const wordText = z.string().trim().min(1).max(WORD_LIMITS.word).regex(/^[A-Za-z][A-Za-z'’ .-]*$/, "영어 단어만 넣어 주세요.");
export const wordFillRequestSchema = z.object({
  words: z.array(wordText).min(1, "채울 단어가 없어요.").max(WORD_FILL_MAX, `한 번에 ${WORD_FILL_MAX}개까지 채울 수 있어요.`),
  meaning: z.boolean(),
  example: z.boolean(),
  /** 독해 지문처럼 뜻을 고를 맥락(선택) */
  context: z.string().max(8000).optional(),
}).refine(input => input.meaning || input.example, "뜻이나 예문 중 하나는 골라 주세요.");
export type WordFillRequest = z.infer<typeof wordFillRequestSchema>;

export const wordFillSchema = z.object({
  items: z.array(z.object({ word: z.string(), meaning: z.string(), example: z.string() })),
});
export type WordFillItem = { word: string; meaning: string; example: string };

export const WORD_FILL_PROMPT = `당신은 한국 고등학교 영어 교사를 돕는 어휘 편집자입니다. 주어진 영어 단어·어구마다 단어 시험지에 실을 우리말 뜻과 영어 예문을 씁니다.
- meaning: 고등학생 수준의 짧은 우리말 뜻. 품사가 여러 개면 자주 쓰는 것 두 개까지 '; '로 나눕니다(예: "영향; 영향을 주다"). 30자 이내, 설명문·영어·괄호 속 품사 표시는 쓰지 않습니다.
- example: 단어를 그대로 또는 규칙 변화형(-s, -ed, -ing 등)으로 한 번 포함한 자연스러운 영어 문장 하나. 8~16단어, 고등학교 교과서 수준, 실존 인물·상표·민감한 주제는 피합니다. 저작권이 있는 글을 옮기지 않고 새로 씁니다.
- context가 있으면 그 글에서 쓰인 뜻을 meaning으로 고르고, example은 context와 다른 새 문장으로 씁니다.
- 요청에서 쓰지 않기로 한 칸은 빈 문자열로 둡니다.
- items는 입력한 단어 순서대로, word는 입력과 똑같이 적습니다.`;

export function wordFillTask(input: WordFillRequest) {
  return JSON.stringify({
    words: input.words,
    fill: { meaning: input.meaning, example: input.example },
    ...(input.context?.trim() ? { context: input.context.trim().slice(0, 8000) } : {}),
  });
}

const key = (word: string) => word.trim().toLowerCase().replace(/’/g, "'");
/** 받은 결과를 입력 단어에 맞춰 고르고 검사합니다. 뜻은 한글이 있어야 하고, 예문은 그 단어(변화형)를 포함해야 합니다. */
export function normalizeWordFill(input: WordFillRequest, items: WordFillItem[]) {
  const byWord = new Map(items.map(item => [key(item.word), item]));
  let rejected = 0;
  const filled: WordFillItem[] = input.words.map(word => {
    const item = byWord.get(key(word));
    let meaning = input.meaning ? item?.meaning.replace(/\s+/g, " ").trim() ?? "" : "";
    let example = input.example ? item?.example.replace(/\s+/g, " ").trim() ?? "" : "";
    if (meaning && (!/[가-힣]/.test(meaning) || meaning.length > WORD_LIMITS.meaning)) { meaning = ""; rejected += 1; }
    if (example && (example.length > WORD_LIMITS.example || /[가-힣]/.test(example) || !findWord(example, word))) { example = ""; rejected += 1; }
    return { word, meaning, example };
  });
  return { items: filled, rejected };
}
