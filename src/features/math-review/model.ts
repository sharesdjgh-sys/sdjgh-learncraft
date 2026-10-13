import { z } from "zod";

export const REVIEW_LIMITS = { files: 6, bytes: 4 * 1024 * 1024, pages: 10, questions: 30, text: 24000 } as const;
export const REVIEW_FILE_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;
export const reviewSubjects = ["자동 판단 / 여러 과목", "공통수학 1", "공통수학 2", "대수", "미적분Ⅰ", "미적분Ⅱ", "확률과 통계", "기하", "수학Ⅰ", "수학Ⅱ", "미적분", "중학교 수학", "기타"] as const;
export const reviewCurricula = ["지정 안 함", "2022 개정", "2015 개정"] as const;

export const reviewSettingsSchema = z.object({
  subject: z.enum(reviewSubjects), curriculum: z.enum(reviewCurricula), grade: z.string().trim().max(100),
});
export type ReviewSettings = z.infer<typeof reviewSettingsSchema>;

export const recognizedQuestionSchema = z.object({
  label: z.string().trim().min(1).max(80).describe("원문의 문항 번호. 없으면 문항 1 등"),
  text: z.string().trim().min(1).max(12000).describe("문제 전체를 그대로 전사. 조건, 질문, 선택지, 배점 포함. 원문 오류를 고치거나 요약하지 않음"),
  sources: z.array(z.object({
    fileIndex: z.number().int().min(0).max(REVIEW_LIMITS.files - 1),
    page: z.number().int().min(1).max(REVIEW_LIMITS.pages),
  })).max(12).describe("첨부 파일의 0부터 시작하는 번호와 1부터 시작하는 페이지. 직접 입력은 빈 배열"),
  hasDiagram: z.boolean(),
  diagram: z.string().max(6000).describe("점 이름·선분·길이·각도·눈금·직각·평행·등길이 표시와 연결 관계. 실제 표시와 외형 추측을 구분"),
  uncertainties: z.array(z.string().min(1).max(500)).max(12).describe("잘림, 흐릿함, 기호·수치·그림 해독 불확실성. 위치와 후보 표기"),
});
export type RecognizedQuestion = z.infer<typeof recognizedQuestionSchema>;
export const recognitionSchema = z.object({
  coverage: z.enum(["complete", "partial"]).describe("제공된 모든 문항을 빠짐없이 전사했을 때만 complete"),
  notes: z.array(z.string().min(1).max(500)).max(12),
  questions: z.array(recognizedQuestionSchema).max(REVIEW_LIMITS.questions),
});
export type Recognition = z.infer<typeof recognitionSchema>;

export const extractRequestSchema = z.object({
  action: z.literal("recognize"), text: z.string().trim().max(REVIEW_LIMITS.text), settings: reviewSettingsSchema,
});
export const reviewRequestSchema = z.object({
  action: z.literal("review"),
  settings: reviewSettingsSchema,
  question: recognizedQuestionSchema,
  teacherConfirmed: z.literal(true),
  clarification: z.string().trim().max(4000),
  recognitionResolved: z.boolean(),
  answer: z.string().trim().max(4000),
});
export const mathReviewRequestSchema = z.discriminatedUnion("action", [extractRequestSchema, reviewRequestSchema]);
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;

export const checkLabels = {
  definitions: "기호·대상의 정의", conditions: "조건의 일관성·존재 여부", solution: "독립 풀이·검산",
  choices: "정답의 유일성·선택지", diagram: "도형·본문의 일치", curriculum: "학습 범위",
} as const;
const checkSchema = z.object({ status: z.enum(["pass", "fail", "uncertain", "not_applicable"]), detail: z.string().min(1).max(1500) });
export const reviewOutputSchema = z.object({
  summary: z.string().min(1).max(1200),
  checks: z.object({ definitions: checkSchema, conditions: checkSchema, solution: checkSchema, choices: checkSchema, diagram: checkSchema, curriculum: checkSchema }),
  issues: z.array(z.object({
    certainty: z.enum(["confirmed", "uncertain"]),
    title: z.string().min(1).max(180), location: z.string().min(1).max(600),
    evidence: z.string().min(1).max(2400), suggestion: z.string().max(1800),
    afterFix: z.string().max(1800).describe("수정안을 실제 재검산한 결과 또는 재검산하지 못한 이유. 원문 풀이와 구분"),
  })).max(15),
  solution: z.array(z.string().min(1).max(2200)).max(15).describe("원문 그대로의 독립 풀이 또는 모순 증명"),
  answer: z.string().max(1000).describe("원문 조건에서의 답. 모순되거나 확정할 수 없으면 빈 문자열"),
  verification: z.string().min(1).max(2000),
  answerComparison: z.object({
    status: z.enum(["not_provided", "match", "mismatch", "uncertain"]), detail: z.string().min(1).max(1800),
  }),
  limitations: z.array(z.string().min(1).max(600)).max(12).describe("현재 미해결인 검토 한계만. 이미 해결한 인식 정정이나 일반 안내는 제외. 없으면 빈 배열"),
});
export type ReviewOutput = z.infer<typeof reviewOutputSchema>;
export type ReviewVerdict = "error" | "uncertain" | "clear";
export const verdictLabels: Record<ReviewVerdict, string> = { error: "오류 발견", uncertain: "확인 필요", clear: "검토 범위에서 이상 발견되지 않음" };

// 요약 문구보다 구조화된 근거를 우선하며, 불완전한 검토를 정상 판정하지 않습니다.
export function reviewVerdict(review: ReviewOutput): ReviewVerdict {
  const checks = Object.values(review.checks);
  if (review.issues.some(issue => issue.certainty === "confirmed") || checks.some(check => check.status === "fail") || review.answerComparison.status === "mismatch") return "error";
  if (review.issues.length || checks.some(check => check.status === "uncertain") || review.limitations.length || review.answerComparison.status === "uncertain") return "uncertain";
  if ([review.checks.definitions, review.checks.conditions, review.checks.solution, review.checks.choices].some(check => check.status !== "pass") || !review.answer.trim() || !review.solution.length) return "uncertain";
  return "clear";
}
export function normalizeReview(output: ReviewOutput, input: ReviewRequest): ReviewOutput {
  const review = structuredClone(output);
  if (input.settings.curriculum === "지정 안 함") review.checks.curriculum = { status: "not_applicable", detail: "교육과정이 지정되지 않아 학습 범위 적합성은 검토하지 않았습니다." };
  if (!input.answer) review.answerComparison = { status: "not_provided", detail: "정답·해설이 제공되지 않아 대조하지 않았습니다." };
  else if (review.answerComparison.status === "not_provided") review.answerComparison = { status: "uncertain", detail: "제공한 정답·해설과의 대조를 완료하지 못했습니다." };
  if (input.question.uncertainties.length && !input.recognitionResolved) review.limitations.push("인식 단계의 판독 주의 사항이 해결되지 않았습니다. 원문 또는 도형 표시를 추가로 확인해 주세요.");
  if (input.question.hasDiagram && review.checks.diagram.status === "not_applicable") review.checks.diagram = { status: "uncertain", detail: "도형이 포함되어 있지만 도형과 본문의 일치 여부를 확인하지 못했습니다." };
  review.limitations = [...new Set(review.limitations)].slice(-12);
  return review;
}

export type SourceFile = { name: string; type: string; size: number; pages: number };
export function uploadError(files: readonly { name: string; type: string; size: number }[]) {
  if (files.length > REVIEW_LIMITS.files) return "파일은 " + REVIEW_LIMITS.files + "개까지 첨부할 수 있습니다.";
  if (files.some(file => !(REVIEW_FILE_TYPES as readonly string[]).includes(file.type) || file.size === 0)) return "내용이 있는 PNG, JPG, WebP 이미지 또는 PDF를 선택해 주세요.";
  if (files.reduce((sum, file) => sum + file.size, 0) > REVIEW_LIMITS.bytes) return "첨부 파일의 합계는 4MB 이하여야 합니다. PDF를 나누거나 이미지 용량을 줄여 주세요.";
  return null;
}
export function invalidSources(question: RecognizedQuestion, files: readonly SourceFile[]) {
  return question.sources.some(ref => !files[ref.fileIndex] || ref.page > files[ref.fileIndex].pages);
}

export function reviewReport(label: string, question: RecognizedQuestion, review: ReviewOutput) {
  return [
    label + " — " + verdictLabels[reviewVerdict(review)], "[교사가 확인한 인식문]", question.text,
    question.hasDiagram ? "[확인한 도형 정보]\n" + question.diagram : "", review.summary,
    ...Object.entries(checkLabels).map(([key, name]) => name + ": " + review.checks[key as keyof typeof checkLabels].detail),
    ...review.issues.map(issue => "[" + (issue.certainty === "confirmed" ? "오류 발견" : "확인 필요") + "] " + issue.title + "\n위치: " + issue.location + "\n근거: " + issue.evidence + "\n수정 제안: " + issue.suggestion + "\n수정 후: " + issue.afterFix),
    "[원문 조건의 풀이]", ...review.solution, "답: " + (review.answer || "확정할 수 없음"), "검산: " + review.verification,
    "정답·해설 대조: " + review.answerComparison.detail,
    ...review.limitations.map(item => "검토 제한: " + item),
    "AI 검토는 오류를 놓칠 수 있습니다. 출제 전 근거와 원문을 최종 확인해 주세요.",
  ].filter(Boolean).join("\n\n");
}
