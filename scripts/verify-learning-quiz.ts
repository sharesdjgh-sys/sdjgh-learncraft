import assert from "node:assert/strict";

import { learningTextContext } from "../src/lib/inline-learning-image";
import { checkQuizAnswer, parseLearningQuiz, quizAnswerLabel, quizProblemMarkdown } from "../src/lib/learning-quiz";

const short = parseLearningQuiz(JSON.stringify({
  type: "short",
  answer: "\frac{1}{2}",
  acceptedAnswers: ["x=0.5"],
  hints: ["분모를 먼저 보세요."],
  concepts: ["약분"],
  explanation: "약분하면 $\frac{1}{2}$이에요.",
}));
assert.ok(short);
for (const answer of ["1/2", "0.5", " x = 1/2 ", "$\frac{1}{2}$", "２/４", "(1)/(2)"]) {
  assert.equal(checkQuizAnswer(short, answer), true, answer);
}
for (const answer of ["2", "-1/2", "", "1/3"]) {
  assert.equal(checkQuizAnswer(short, answer), false, answer);
}

const word = parseLearningQuiz(JSON.stringify({ type: "short", answer: "광합성", acceptedAnswers: ["광합성 작용"] }));
assert.ok(word);
assert.equal(checkQuizAnswer(word, "광합성"), true);
assert.equal(checkQuizAnswer(word, "광합성 작용"), true);
assert.equal(checkQuizAnswer(word, "호흡"), false);

const negative = parseLearningQuiz(JSON.stringify({ type: "short", answer: "-3" }));
assert.ok(negative);
assert.equal(checkQuizAnswer(negative, "−3"), true);
assert.equal(checkQuizAnswer(negative, "x=-3"), true);
assert.equal(checkQuizAnswer(negative, "3"), false);

const choice = parseLearningQuiz(JSON.stringify({ type: "choice", choices: ["가", "나", "다"], answer: "2" }));
assert.ok(choice);
assert.equal(checkQuizAnswer(choice, "2"), true);
assert.equal(checkQuizAnswer(choice, "②"), true);
assert.equal(checkQuizAnswer(choice, "1"), false);
assert.equal(quizAnswerLabel(choice), "② 나");

assert.equal(parseLearningQuiz(JSON.stringify({ type: "choice", choices: ["가", "나"], answer: "3" })), null);
assert.equal(parseLearningQuiz("{broken"), null);

const markdown = "## 문제\n\n다음 중 옳은 것은?\n\n```learncraft-quiz\n" + JSON.stringify({ type: "choice", choices: ["가", "나", "다"], answer: "2", explanation: "나가 맞아요." }) + "\n```";
assert.equal(quizProblemMarkdown(markdown), "## 문제\n\n다음 중 옳은 것은?");
const context = learningTextContext(markdown);
assert.match(context, /① 가\n② 나\n③ 다/);
assert.match(context, /정답 ② 나 — 나가 맞아요\./);
assert.doesNotMatch(context, /learncraft-quiz/);

console.log("확인 문제 검증 완료: 단답형 표기 인정·선택형 채점·잘못된 블록 거부·문맥 변환");
