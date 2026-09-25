import assert from "node:assert/strict";
import {
  combineReview, formatIssues, generatedQuestionsSchema, generateRequestSchema, generationTask, questionClipboard, questionReviewSchema, questionTypeKeys,
  QUESTION_GENERATION_PROMPT, reviewRequestSchema, reviewTask, splitUnderlines, type EnglishQuestion, type QuestionReview,
} from "../src/features/english-questions/content";

const passage = "Many people believe that shopping decisions are made rationally. ".repeat(5);
const numbers = ["①", "②", "③", "④", "⑤"];

// 입력 검증
assert(generateRequestSchema.safeParse({ passage, types: ["topic"], difficulty: "standard" }).success);
assert(!generateRequestSchema.safeParse({ passage: "short", types: ["topic"], difficulty: "standard" }).success, "Short passages are rejected");
assert(!generateRequestSchema.safeParse({ passage, types: [], difficulty: "standard" }).success, "At least one type is required");
assert(!generateRequestSchema.safeParse({ passage, types: ["topic", "topic"], difficulty: "standard" }).success, "Duplicate types are rejected");
assert(!generateRequestSchema.safeParse({ passage, types: questionTypeKeys.slice(0, 6), difficulty: "standard" }).success, "Too many types are rejected");
assert(questionTypeKeys.every(type => QUESTION_GENERATION_PROMPT.includes(`- ${type}(`)), "Every type has a generation guide");
assert(generationTask(generateRequestSchema.parse({ passage, types: ["grammar"], difficulty: "challenge" })).includes("도전"));
console.log("PASS english questions: request validation and prompt coverage");

// 밑줄 표시와 형식 점검
assert.deepEqual(splitUnderlines("It ①[was] fine and ②[looks] good."), [{ text: "It " }, { mark: "①", text: "was" }, { text: " fine and " }, { mark: "②", text: "looks" }, { text: " good." }]);
const grammar: EnglishQuestion = {
  type: "grammar", instruction: "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?", intro: null, box: null,
  passage: "People ①[who] shop ②[are] often ③[influenced] by ④[what] they ⑤[sees].", choices: [...numbers],
  answer: 5, explanation: "주어 they에 맞춰 see가 되어야 한다.", evidence: "what they sees", intent: "수 일치",
};
assert(generatedQuestionsSchema.safeParse({ questions: [grammar] }).success);
assert.deepEqual(formatIssues(grammar), []);
assert.equal(formatIssues({ ...grammar, passage: "People ①[who] shop ②[are] often." }).length, 1, "Missing underline marks are reported");
const insertion = { ...grammar, type: "insertion" as const, box: "However, this is not always true.", passage: "A. ( ① ) B. ( ② ) C. ( ③ ) D. ( ④ ) E. ( ⑤ )" };
assert.deepEqual(formatIssues(insertion), []);
assert(formatIssues({ ...insertion, box: null }).includes("주어진 문장이 없습니다."));
const order = { ...grammar, type: "order" as const, intro: "Intro.", passage: "(A) one\n\n(B) two\n\n(C) three", choices: ["(A) - (C) - (B)", "(B) - (A) - (C)", "(B) - (C) - (A)", "(C) - (A) - (B)", "(C) - (B) - (A)"] };
assert.deepEqual(formatIssues(order), []);
assert(formatIssues({ ...order, choices: [...order.choices.slice(0, 4), order.choices[0]] }).includes("같은 선택지가 두 번 이상 있습니다."));
assert.equal(formatIssues({ ...grammar, type: "blank", passage: "No blank here." }).length, 1);
assert.deepEqual(formatIssues({ ...grammar, type: "blank", passage: "The key is __________." }), []);
assert.deepEqual(formatIssues({ ...grammar, type: "summary", box: "People (A) ______ when they (B) ______." }), []);
assert.equal(formatIssues({ ...grammar, type: null, passage: "Anything" }).length, 0, "Untyped drafts only get generic checks");
console.log("PASS english questions: underline parsing and format checks");

// 복사
const copy = questionClipboard(grammar, 3, true);
assert(copy.text.startsWith("3. 다음 글의"));
assert(copy.text.includes("① who") && !copy.text.includes("["), "Plain text removes bracket markers");
assert(copy.text.includes("①   ②   ③   ④   ⑤"), "Number-only choices are laid out on one line");
assert(copy.text.includes("정답: ⑤"));
assert(copy.html.includes("①<u>who</u>"), "HTML keeps underlines for word processors");
assert(!questionClipboard({ ...grammar, passage: "<script>x</script> ①[a]" }, 1, false).html.includes("<script>"), "HTML is escaped");
assert(!questionClipboard(grammar, 1, false).text.includes("정답"));
console.log("PASS english questions: clipboard text and html");

// 검토: 정답을 AI에게 보내지 않고 서버에서 비교
const request = reviewRequestSchema.parse({ question: { type: "grammar", instruction: grammar.instruction, passage: grammar.passage, choices: numbers }, intendedAnswer: 5 });
assert(!reviewTask(request).includes("intended") && !reviewTask(request).includes("\"answer\""), "Intended answer is never sent to the model");
assert(!reviewRequestSchema.safeParse({ question: { instruction: "x", passage: "y", choices: ["a", "b", "c", "d"] } }).success, "Five choices are required");
const base: QuestionReview = questionReviewSchema.parse({
  task: "어법상 틀린 것 찾기", answer: 5, evidence: "they sees", verdict: "valid", verdictReason: "틀린 곳이 하나입니다.",
  choices: numbers.map((_, index) => ({ judgment: index === 4 ? "correct" : "incorrect", reason: "근거" })),
  issues: [], languageErrors: [], fixes: [], difficulty: "medium",
});
assert.equal(combineReview(base, 5).verdict, "valid");
assert.equal(combineReview(base, 5).match, true);
const mismatch = combineReview(base, 2);
assert.equal(mismatch.verdict, "invalid");
assert.equal(mismatch.match, false);
assert(mismatch.issues[0].includes("⑤") && mismatch.issues[0].includes("②"));
const arguable = combineReview({ ...base, choices: base.choices.map((choice, index) => index === 1 ? { ...choice, judgment: "arguable" as const } : choice) }, 5);
assert.equal(arguable.verdict, "uncertain", "Arguable second answers downgrade a valid verdict");
assert.equal(combineReview({ ...base, answer: null }, 5).verdict, "uncertain");
assert.equal(combineReview(base, null).match, null);
assert.equal(combineReview({ ...base, verdict: "invalid" }, 5).verdict, "invalid");
console.log("PASS english questions: blind review comparison and verdict combination");
