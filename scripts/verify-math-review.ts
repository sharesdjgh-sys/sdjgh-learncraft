import assert from "node:assert/strict";
import { invalidSources, mathReviewRequestSchema, normalizeReview, recognitionSchema, REVIEW_LIMITS, reviewOutputSchema, reviewReport, reviewRequestSchema, reviewVerdict, uploadError, type RecognizedQuestion, type ReviewRequest } from "../src/features/math-review/model";

const question: RecognizedQuestion = {
  label: "1", text: "점 A(3,1)과 직선 (k-2)x+(1-3k)y+10=0 사이의 거리는 k=m일 때 최댓값 r을 갖는다. 원 (x-3)^2+(y-1)^2=r^2과 직선 y=mx의 두 교점 A,B에 대하여 선분 AB의 중점을 M(x_1,y_1)이라 할 때 x_1+y_1의 값은?",
  sources: [], hasDiagram: false, diagram: "", uncertainties: [],
};
const request: ReviewRequest = reviewRequestSchema.parse({ action: "review", question, teacherConfirmed: true, recognitionResolved: false });
assert(mathReviewRequestSchema.safeParse(request).success);
assert(mathReviewRequestSchema.safeParse({ action: "recognize" }).success);
assert(!mathReviewRequestSchema.safeParse({ ...request, teacherConfirmed: false }).success, "Unconfirmed OCR cannot enter review");
const { teacherConfirmed: _confirmed, ...missingConfirmation } = request;
void _confirmed;
assert(!mathReviewRequestSchema.safeParse(missingConfirmation).success, "Confirmation is mandatory on the server");
assert(!mathReviewRequestSchema.safeParse({ ...request, question: { ...question, text: " " } }).success);
const recognized = recognitionSchema.parse({ coverage: "complete", notes: [], questions: [question] });
assert.equal(recognized.questions[0].text, question.text, "Original duplicate A is preserved, not silently repaired");

const pass = { status: "pass" as const, detail: "독립 풀이와 역대입으로 확인했습니다." };
const base = reviewOutputSchema.parse({
  summary: "원문 조건에서 유일한 해를 확인했습니다.",
  checks: { definitions: pass, conditions: pass, solution: pass, choices: pass, diagram: { status: "not_applicable", detail: "첨부 도형 없음" } },
  issues: [], solution: ["x+1=2에서 x=1입니다."], answer: "$1$", verification: "1+1=2",
  answerComparison: { status: "not_provided", detail: "미제공" }, limitations: [],
});
assert.equal(reviewVerdict(base), "clear");
assert.equal(reviewVerdict({ ...base, solution: [] }), "uncertain", "No solution is not a clean bill of health");
assert.equal(reviewVerdict({ ...base, answer: "" }), "uncertain", "No answer cannot be treated as verified");
assert.equal(reviewVerdict({ ...base, checks: { ...base.checks, definitions: { status: "not_applicable", detail: "누락" } } }), "uncertain");
assert.equal(reviewVerdict({ ...base, checks: { ...base.checks, conditions: { status: "fail", detail: "0=10이라는 모순" } } }), "error");
assert.equal(reviewVerdict({ ...base, answerComparison: { status: "mismatch", detail: "제공 정답과 불일치" } }), "error");
assert.equal(reviewVerdict({ ...base, limitations: ["분모를 읽지 못함"] }), "uncertain");
const symbolError = {
  ...base, answer: "",
  issues: [{ certainty: "confirmed" as const, title: "점 A의 정의 충돌", location: "점 A(3,1) / 두 교점 A,B", evidence: "r²=10인 원에 A(3,1)을 대입하면 0=10", suggestion: "첫 점 A를 C로 변경", afterFix: "수정 후 답은 21/5" }],
};
assert.equal(reviewVerdict(symbolError), "error");
assert(reviewReport("1번", question, symbolError).includes("21/5"));
assert(reviewReport("1번", question, symbolError).includes("답: 확정할 수 없음"), "Conditional repaired answer is not presented as the original answer");

const geometry = { ...request, question: { ...question, hasDiagram: true, diagram: "삼각형 ABC, A=80°, B=70°, C=40°" } };
assert.equal(reviewVerdict(normalizeReview(base, geometry)), "uncertain", "A diagram must actually be checked");
assert.equal(reviewVerdict(normalizeReview(base, { ...request, question: { ...question, uncertainties: ["각도 숫자가 흐릿함"] } })), "uncertain");
assert.equal(reviewVerdict(normalizeReview(base, { ...request, recognitionResolved: true, question: { ...question, uncertainties: ["수정 전 판독 주의"] } })), "clear", "Teacher-resolved OCR warnings should not invalidate a corrected transcription");
assert.equal(normalizeReview(base, { ...request, answer: "2" }).answerComparison.status, "uncertain", "Provided answer cannot be silently ignored");
assert.equal(normalizeReview({ ...base, answerComparison: { status: "match", detail: "잘못된 대조" } }, request).answerComparison.status, "not_provided");

assert.equal(uploadError([]), null);
assert(uploadError([{ name: "x.svg", type: "image/svg+xml", size: 100 }]));
assert(uploadError([{ name: "empty.png", type: "image/png", size: 0 }]));
assert(uploadError([{ name: "huge.png", type: "image/png", size: REVIEW_LIMITS.bytes + 1 }]));
assert(uploadError(Array.from({ length: 7 }, () => ({ name: "x.jpg", type: "image/jpeg", size: 1 }))));
assert(uploadError([{ name: "x.pdf", type: "application/pdf", size: 100 }]));
assert.equal(uploadError([{ name: "capture.png", type: "image/png", size: REVIEW_LIMITS.bytes }]), null);
const files = [{ name: "시험지.png", type: "image/png", size: 100, pages: 1 }];
assert.equal(invalidSources({ ...question, sources: [{ fileIndex: 0, page: 1 }] }, files), false);
assert.equal(invalidSources({ ...question, sources: [{ fileIndex: 1, page: 1 }] }, files), true);
assert.equal(invalidSources({ ...question, sources: [{ fileIndex: 0, page: 3 }] }, files), true);
console.log("PASS math review: teacher confirmation, original preservation, conservative verdicts, diagram/OCR uncertainty, upload bounds and source references");
