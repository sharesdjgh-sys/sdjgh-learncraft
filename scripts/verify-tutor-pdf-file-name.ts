import assert from "node:assert/strict";

import { answerTopicForPdfFileName, makeAnswerPdfFileName } from "../src/lib/tutor-pdf-file-name";

const createdAt = new Date(2026, 8, 11, 14, 30);

assert.equal(
  answerTopicForPdfFileName("## 1. 시간의 시각화: 원자의 진동과 1초\n\n세슘 원자의 진동을 이용해 1초를 정의합니다."),
  "시간의 시각화 원자의 진동과 1초",
);
assert.equal(
  answerTopicForPdfFileName("## 핵심 정리\n\n## 이차함수의 최댓값과 최솟값\n\n그래프를 이용해 알아봅시다."),
  "이차함수의 최댓값과 최솟값",
);
assert.equal(
  answerTopicForPdfFileName("좋아요! 광합성은 빛에너지를 화학 에너지로 바꾸는 과정입니다. 이어서 살펴볼게요."),
  "광합성은 빛에너지를 화학 에너지로 바꾸는 과정입니다",
);
assert.equal(
  makeAnswerPdfFileName("## 핵심 개념: 원자의 진동과 1초", createdAt),
  "LearnCraft_원자의 진동과 1초_260911",
);
assert.equal(
  makeAnswerPdfFileName("## 1. 시간의 시각화: 원자의 진동과 $1\\,\\text{초}$", createdAt),
  "LearnCraft_시간의 시각화 원자의 진동과 1초_260911",
);

console.log("PDF 파일명 검증 완료: 답변 제목·일반 제목 제외·첫 핵심 문장·날짜 형식");
