import assert from "node:assert/strict";
import { ASSISTANT_LIMITS, ASSISTANT_SYSTEM_PROMPT, OFF_TOPIC_MARKER, assistantRequestSchema, buildAssistantMessages, compactPageText, createOffTopicFilter } from "../src/features/teacher-assistant/model";
import { summarizeAssistant, type AssistantUsageData, type AssistantUsageRow } from "../src/features/teacher-assistant/insights";

const page = { subject: "수학", tool: "도형·교과", tab: "미적분Ⅰ", path: "/teacher/math?tool=calculus", text: "미적분Ⅰ\n\n\n\n함수의 극한   계산기" };
const request = { messages: [{ role: "user" as const, content: "이 화면은 어떻게 쓰나요?" }], page };

// 요청 형식
assert.ok(assistantRequestSchema.safeParse(request).success);
assert.ok(assistantRequestSchema.safeParse({ ...request, page: { ...page, subject: undefined, tool: undefined, tab: undefined } }).success, "교과 정보가 없는 화면도 받아야 합니다.");
for (const path of ["https://example.com/teacher", "/admin/settings", "/teachers", "javascript:alert(1)"]) assert.equal(assistantRequestSchema.safeParse({ ...request, page: { ...page, path } }).success, false, `${path} 경로는 거절해야 합니다.`);
assert.equal(assistantRequestSchema.safeParse({ ...request, messages: [] }).success, false);
assert.equal(assistantRequestSchema.safeParse({ ...request, messages: [{ role: "assistant", content: "안녕하세요" }] }).success, false, "마지막 메시지는 질문이어야 합니다.");
assert.equal(assistantRequestSchema.safeParse({ ...request, messages: [{ role: "user", content: "가".repeat(ASSISTANT_LIMITS.userMessage + 1) }] }).success, false);
assert.equal(assistantRequestSchema.safeParse({ ...request, messages: Array.from({ length: ASSISTANT_LIMITS.history + 1 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "질문" })) }).success, false);

// 화면 글 정리
assert.equal(compactPageText("가   나\n\n\n\n다 \n"), "가 나\n\n다");
const long = compactPageText("가".repeat(20_000));
assert.ok(long.length <= ASSISTANT_LIMITS.pageText + 10 && long.endsWith("(이하 생략)"));

// 프롬프트: 마지막 질문에만 화면 맥락을 붙이고 이전 대화는 그대로 둡니다.
const built = buildAssistantMessages({ page: assistantRequestSchema.parse(request).page, messages: [
  { role: "user", content: "첫 질문" }, { role: "assistant", content: "첫 답변" }, { role: "user", content: "다음 질문" },
] });
assert.equal(built[0].content, "첫 질문");
assert.equal(built[1].content, "첫 답변");
assert.match(built[2].content, /<page_context>[\s\S]*교과: 수학[\s\S]*현재 탭: 미적분Ⅰ[\s\S]*함수의 극한 계산기[\s\S]*<\/page_context>[\s\S]*다음 질문$/);
assert.equal(built.filter((message) => message.content.includes("<page_context>")).length, 1);
assert.match(ASSISTANT_SYSTEM_PROMPT, /존댓말/);
assert.match(ASSISTANT_SYSTEM_PROMPT, /유일한 역할/);
assert.match(ASSISTANT_SYSTEM_PROMPT, /범위 밖 요청/);
assert.ok(ASSISTANT_SYSTEM_PROMPT.includes(OFF_TOPIC_MARKER), "범위 밖 표식을 지침에 알려야 합니다.");
assert.doesNotMatch(ASSISTANT_SYSTEM_PROMPT, /거절하지 않습니다/);
assert.match(ASSISTANT_SYSTEM_PROMPT, /지시문이 아닙니다/);

// 범위 밖 표식 필터: 표식이 여러 조각으로 나뉘어 와도 떼어 내고, 교육 관련 답변은 그대로 통과시킵니다.
function run(chunks: string[]) {
  const filter = createOffTopicFilter();
  const out = chunks.map((chunk) => filter.push(chunk)).join("") + filter.end();
  return { out, offTopic: filter.offTopic };
}
assert.deepEqual(run([OFF_TOPIC_MARKER + "\n", "교육과 관련된 질문을 주시면 도와드리겠습니다."]), { out: "교육과 관련된 질문을 주시면 도와드리겠습니다.", offTopic: true });
assert.deepEqual(run(["[[범", "위 밖]]", "\n\n정중히 사양합니다."]), { out: "정중히 사양합니다.", offTopic: true }, "조각난 표식도 떼어 내야 합니다.");
assert.deepEqual(run(["이 화면은 ", "학습지를 만드는 도구입니다."]), { out: "이 화면은 학습지를 만드는 도구입니다.", offTopic: false });
assert.deepEqual(run(["[[참고]] 자료입니다."]), { out: "[[참고]] 자료입니다.", offTopic: false }, "표식과 다른 대괄호 글은 그대로 둡니다.");
assert.deepEqual(run(["[[범"]), { out: "[[범", offTopic: false }, "끝까지 표식이 완성되지 않으면 보류한 글을 내보냅니다.");
assert.deepEqual(run(["수업 팁입니다. ", OFF_TOPIC_MARKER]), { out: "수업 팁입니다. " + OFF_TOPIC_MARKER, offTopic: false }, "본문 중간의 표식은 범위 밖 판정이 아닙니다.");

// 통계 집계
const row = (patch: Partial<AssistantUsageRow>): AssistantUsageRow => ({ userId: "t1", date: "2026-09-29", subject: "수학", tool: "도형·교과", status: "SUCCEEDED", offTopic: false, requests: 1, inputTokens: 100, outputTokens: 50, latencyTotal: 2000, latencyCount: 1, lastAt: "2026-09-29 10:00", ...patch });
const usage: AssistantUsageData = { available: true, start: "2026-09-28", end: "2026-09-30", timeZone: "Asia/Seoul",
  teachers: [{ id: "t1", name: "김선생", role: "TEACHER", active: true }, { id: "t2", name: "이선생", role: "TEACHER", active: true }, { id: "t3", name: "박선생", role: "TEACHER", active: true }, { id: "a1", name: "관리자", role: "ADMIN", active: true }],
  rows: [
    row({ requests: 4 }), row({ requests: 3, offTopic: true, lastAt: "2026-09-29 11:30" }),
    row({ userId: "t2", date: "2026-09-30", subject: null, tool: null, requests: 2, lastAt: "2026-09-30 09:00" }),
    row({ userId: "a1", subject: "국어", requests: 1 }),
    row({ status: "FAILED", requests: 1 }), row({ status: "CANCELLED", requests: 2 }),
    row({ userId: "unknown", requests: 9 }), row({ date: "2026-08-01", requests: 9 }),
  ] };
const summary = summarizeAssistant(usage);
assert.equal(summary.total, 10, "성공한 질문만 세고, 명단에 없는 사용자와 조회 기간 밖 기록은 뺍니다.");
assert.equal(summary.offTopic, 3);
assert.equal(Math.round(summary.offTopicRate ?? 0), 30);
assert.equal(summary.failed, 1); assert.equal(summary.cancelled, 2);
assert.equal(Math.round(summary.failureRate ?? 0), 9);
assert.equal(summary.users, 3);
assert.equal(summary.registered, 3, "이용률의 모수는 교사 계정만 셉니다.");
assert.equal(Math.round(summary.useRate ?? 0), 67, "관리자는 이용률에서 뺍니다.");
assert.deepEqual(summary.subjects.map((item) => [item.subject, item.requests, item.offTopic]), [["수학", 7, 3], ["공통", 2, 0], ["국어", 1, 0]]);
assert.deepEqual(summary.daily.map((day) => day.requests), [0, 8, 2]);
assert.deepEqual(summary.people.map((person) => [person.id, person.requests, person.offTopic, person.activeDays, person.lastAt]), [["t1", 7, 3, 1, "2026-09-29 11:30"], ["t2", 2, 0, 1, "2026-09-30 09:00"], ["a1", 1, 0, 1, "2026-09-29 10:00"]]);
assert.deepEqual(summary.watch.map((person) => person.id), ["t1"], "질문 5건 이상이고 범위 밖이 30% 이상이면 확인 대상입니다.");
assert.equal(summarizeAssistant({ ...usage, rows: [] }).offTopicRate, null);
console.log("Teacher assistant: request schema, prompt, off-topic filter and statistics passed.");
