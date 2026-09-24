import { z } from "zod";

export const reviewMeasurementSchema = z.object({
  kind: z.enum(["angle", "length"]),
  label: z.string().trim().min(1).max(80),
  value: z.number().positive().max(1000),
  nextValue: z.number().positive().max(1000),
});

export const reviewRequestSchema = z.object({
  measurements: z.array(reviewMeasurementSchema).max(20),
  problemText: z.string().trim().max(2000).default(""),
});

const measurementValueSchema = z.object({
  index: z.number().int().min(0).max(19),
  value: z.number().positive().max(1000),
});

export const mathProblemReviewSchema = z.object({
  problem: z.string().max(600).describe("이미지와 교사 입력에서 읽은 문제의 조건과 묻는 것을 한두 문장으로 요약"),
  originalAnswer: z.string().max(200).describe("원본 수치로 풀었을 때의 최종 답. 판단할 수 없으면 빈 문자열"),
  verdict: z.enum(["valid", "invalid", "uncertain"]).describe("변경한 수치로 문제가 성립하는지 판정"),
  verdictReason: z.string().max(400).describe("판정 근거를 한두 문장으로"),
  issues: z.array(z.string().max(300)).max(6).describe("성립하지 않거나 부적절한 이유. 모순, 도형 불가능, 답이 음수·무리수 등"),
  constraints: z.array(z.string().max(200)).max(6).describe("수치가 반드시 만족해야 하는 조건. 예: ∠A + ∠B < 180°"),
  steps: z.array(z.string().max(700)).min(1).max(10).describe("변경한 수치로 푼 단계별 풀이. 각 단계는 근거와 식을 포함하고 수식은 $...$로 작성"),
  answer: z.string().max(200).describe("변경한 수치로 구한 최종 답. 성립하지 않으면 빈 문자열"),
  check: z.string().max(400).describe("답을 다른 방법이나 역대입으로 검산한 결과"),
  recommendations: z.array(z.object({
    values: z.array(measurementValueSchema).min(1).max(20).describe("index는 입력 수치 목록의 번호"),
    answer: z.string().max(200).describe("이 수치로 풀었을 때의 최종 답"),
    reason: z.string().max(300).describe("추천 이유. 답이 깔끔한지, 난이도, 원본 구조 유지 여부"),
  })).max(3).describe("문제가 성립하고 답이 깔끔하게 떨어지는 추천 수치 조합"),
});

export type MathProblemReview = z.infer<typeof mathProblemReviewSchema>;

export const MATH_PROBLEM_REVIEW_SYSTEM_PROMPT = `당신은 고등학교 수학 교사의 시험 문항 제작을 돕는 검토자입니다.
교사는 교재 도형 문제의 각도·길이 수치를 바꿔 새 문항을 만들려고 합니다.

작업 순서:
1. 이미지와 교사가 입력한 문제 문장에서 주어진 조건과 묻는 것을 정리합니다.
2. 원본 수치로 먼저 풀어 원본 답을 구합니다.
3. 변경한 수치를 적용해 조건 정리 → 적용할 개념 → 단계별 풀이 → 최종 답 → 검산 순서로 풉니다. 중간 계산을 생략하지 않습니다.
4. 다음 중 하나라도 해당하면 invalid로 판정합니다.
   - 삼각형 내각의 합, 삼각형 부등식, 평행선·원의 성질 등 도형 조건이 모순되거나 도형을 그릴 수 없음
   - 주어진 조건끼리 서로 충돌하거나 답이 정해지지 않음
   - 길이·넓이가 0 이하가 되는 등 답이 의미 없음
5. 성립하지만 답이 지나치게 복잡한 무리수·소수이거나 원본과 풀이 구조가 달라지면 valid로 두되 issues에 알립니다.
   이미지가 흐리거나 묻는 것을 확정할 수 없으면 uncertain으로 판정하고 필요한 정보를 issues에 적습니다.
6. 원본의 풀이 구조와 난이도를 유지하면서 답이 정수나 간단한 분수·근호로 떨어지는 수치 조합을 최대 3개 추천합니다.
   추천마다 실제로 끝까지 풀어 답을 확인한 뒤에만 제시하고, 변경하지 않는 수치도 values에 포함합니다.
   원본과 똑같은 수치 조합은 추천하지 않습니다.

표기:
- 수식은 $...$ 인라인 LaTeX로 씁니다. 각은 $\\angle ABC$, 도는 $^\\circ$를 사용합니다.
- 풀이 단계에는 번호를 붙이지 않습니다. 화면에서 번호를 붙입니다.
- 추측한 조건은 추측이라고 밝힙니다.`;
