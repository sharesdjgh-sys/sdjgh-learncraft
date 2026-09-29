import { z } from "zod";

const quizText = z.string().trim().min(1).max(400);

export const learningQuizSchema = z.object({
  type: z.enum(["choice", "short"]),
  choices: z.array(quizText).min(2).max(5).optional(),
  answer: z.string().trim().min(1).max(200),
  acceptedAnswers: z.array(z.string().trim().min(1).max(200)).max(8).default([]),
  hints: z.array(quizText).max(3).default([]),
  concepts: z.array(z.string().trim().min(1).max(60)).max(4).default([]),
  explanation: z.string().trim().max(600).default(""),
}).superRefine((value, context) => {
  if (value.type !== "choice") return;
  const index = Number(value.answer);
  if (!value.choices || !Number.isInteger(index) || index < 1 || index > value.choices.length) {
    context.addIssue({ code: "custom", path: ["answer"], message: "선택형 정답 번호를 확인해 주세요." });
  }
});

export type LearningQuiz = z.infer<typeof learningQuizSchema>;

export const choiceMarks = ["①", "②", "③", "④", "⑤"] as const;

const quizBlockPattern = /```learncraft-quiz\s*\n([\s\S]*?)```/g;

export function parseLearningQuiz(source: string): LearningQuiz | null {
  try {
    const parsed = learningQuizSchema.safeParse(JSON.parse(source));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const fullWidthPattern = /[！-～]/g;

function normalizeAnswer(value: string) {
  return value
    .replace(fullWidthPattern, (character) => String.fromCharCode(character.charCodeAt(0) - 0xFEE0))
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\\left|\\right|\\,|\\;|\\!|\\displaystyle/g, "")
    .replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\\(?:cdot|times)/g, "*")
    .replace(/\\pi/g, "π")
    .replace(/[−–—]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/[$\s]/g, "")
    .replace(/^(?:정답|답)[:：]?/, "")
    .replace(/^[a-z]=(?!=)/, "")
    .replace(/[.。]$/, "")
    .replace(/^\((-?[\d.]+)\)$/, "$1");
}

function numericValue(value: string) {
  const match = /^(-?)\(?(-?\d+(?:\.\d+)?)\)?(?:\/\(?(-?\d+(?:\.\d+)?)\)?)?$/.exec(value);
  if (!match) return null;
  const numerator = Number(match[2]);
  const denominator = match[3] === undefined ? 1 : Number(match[3]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return (match[1] ? -1 : 1) * numerator / denominator;
}

function sameAnswer(left: string, right: string) {
  if (!left || !right) return false;
  if (left === right) return true;
  const leftValue = numericValue(left);
  const rightValue = numericValue(right);
  return leftValue !== null && rightValue !== null && Math.abs(leftValue - rightValue) < 1e-9;
}

/** Local grading keeps quiz checks instant and free of extra AI usage. */
export function checkQuizAnswer(quiz: LearningQuiz, response: string) {
  const trimmed = response.trim();
  if (!trimmed) return false;
  if (quiz.type === "choice") {
    const markIndex = choiceMarks.indexOf(trimmed as typeof choiceMarks[number]);
    const selected = markIndex >= 0 ? markIndex + 1 : Number(trimmed);
    return selected === Number(quiz.answer);
  }
  const normalized = normalizeAnswer(trimmed);
  return [quiz.answer, ...quiz.acceptedAnswers].some((candidate) => sameAnswer(normalized, normalizeAnswer(candidate)));
}

export function quizAnswerLabel(quiz: LearningQuiz) {
  if (quiz.type !== "choice") return quiz.answer;
  const index = Number(quiz.answer) - 1;
  return `${choiceMarks[index]} ${quiz.choices?.[index] ?? ""}`.trim();
}

/** Readable form for AI context and plain-text copies; hidden answers stay labelled. */
export function quizTextContext(markdown: string) {
  return markdown.replace(quizBlockPattern, (block, source: string) => {
    const quiz = parseLearningQuiz(source);
    if (!quiz) return block;
    const lines = [
      ...(quiz.choices ?? []).map((choice, index) => `${choiceMarks[index]} ${choice}`),
      `[확인 문제 정답 정보: 정답 ${quizAnswerLabel(quiz)}${quiz.explanation ? ` — ${quiz.explanation}` : ""}]`,
    ];
    return lines.join("\n");
  });
}

/** Problem text worth keeping in a mistake note, without answer keys or generated image data. */
export function quizProblemMarkdown(markdown: string) {
  return markdown
    .replace(quizBlockPattern, "")
    .replace(/```learncraft-visual\s*\n[\s\S]*?```/g, (block) => /data:image\/|"kind"\s*:\s*"(?:generated-image|image-slot)"/.test(block) ? "" : block)
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 6000);
}
