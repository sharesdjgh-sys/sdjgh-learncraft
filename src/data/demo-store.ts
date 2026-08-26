import type { Bookmark, TutorAction } from "@/types";

type UsageRecord = { count: number; limit: number; completed: number };

declare global {
  var __learncraftBookmarks: Bookmark[] | undefined;
  var __learncraftUsage: Map<string, UsageRecord> | undefined;
  var __learncraftDailyLimit: number | undefined;
}

const bookmarkStore = globalThis.__learncraftBookmarks ?? [];
const usageStore = globalThis.__learncraftUsage ?? new Map<string, UsageRecord>();

globalThis.__learncraftBookmarks = bookmarkStore;
globalThis.__learncraftUsage = usageStore;
globalThis.__learncraftDailyLimit ??= 20;

function usageKey(studentId: string) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  return `${studentId}:${date}`;
}

export function getUsage(studentId: string) {
  const current = usageStore.get(usageKey(studentId));
  return current
    ? { ...current, limit: globalThis.__learncraftDailyLimit! }
    : { count: 0, completed: 0, limit: globalThis.__learncraftDailyLimit! };
}

export function getDailyLimit() {
  return globalThis.__learncraftDailyLimit!;
}

export function setDailyLimit(limit: number) {
  globalThis.__learncraftDailyLimit = limit;
  return limit;
}

export function reserveUsage(studentId: string) {
  const key = usageKey(studentId);
  const current = getUsage(studentId);
  if (current.count >= current.limit) return { ok: false as const, remaining: 0 };
  const next = { ...current, count: current.count + 1 };
  usageStore.set(key, next);
  return { ok: true as const, remaining: next.limit - next.count };
}

export function completeUsage(studentId: string) {
  const key = usageKey(studentId);
  const current = getUsage(studentId);
  usageStore.set(key, { ...current, completed: current.completed + 1 });
}

export function refundUsage(studentId: string) {
  const key = usageKey(studentId);
  const current = getUsage(studentId);
  usageStore.set(key, { ...current, count: Math.max(0, current.count - 1) });
}

export function listBookmarks(studentId: string) {
  return bookmarkStore
    .filter((item) => item.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addBookmark(input: Omit<Bookmark, "id" | "createdAt">) {
  const existing = bookmarkStore.find(
    (item) => item.studentId === input.studentId && item.clientAnswerId === input.clientAnswerId,
  );
  if (existing) return existing;
  const bookmark: Bookmark = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  bookmarkStore.push(bookmark);
  return bookmark;
}

export function deleteBookmark(studentId: string, bookmarkId: string) {
  const index = bookmarkStore.findIndex(
    (item) => item.id === bookmarkId && item.studentId === studentId,
  );
  if (index < 0) return false;
  bookmarkStore.splice(index, 1);
  return true;
}

export function makeDemoAnswer(action: TutorAction, question: string, unitTitle: string) {
  const prompt = question.trim() || `${unitTitle}의 핵심 내용을 알려 주세요.`;
  if (action === "EASIER") {
    return `어려웠던 부분을 더 작게 나눠 볼게요. **${unitTitle}**에서는 먼저 **무엇이 변하고 무엇이 그대로인지** 찾으면 훨씬 편해져요.\n\n새로운 용어를 바로 외우려고 하지 않아도 괜찮아요. 직전 설명에서 막혔던 용어 하나를 평소 쓰는 말로 바꿔 보면 개념의 모양이 보이기 시작해요.\n\n“${prompt.slice(0, 36)}”에서 이미 알고 있는 조건부터 하나만 찾아볼까요?`;
  }
  if (action === "DEEPER") {
    return `이번에는 **${unitTitle}**을 한 단계 더 깊게 연결해 볼게요. 결과만 보는 대신, 그 결과가 나오는 조건을 추적하는 거예요.\n\n1. 정의가 정확히 무엇인지 확인해요.\n2. 성립하는 경우와 성립하지 않는 경우를 나란히 비교해요.\n3. 같은 원리가 다른 문제에서 어떻게 다시 나타나는지 찾아봐요.\n\n이 연결이 보이면 처음 보는 문제도 훨씬 덜 낯설어져요.`;
  }
  if (action === "REVEAL") {
    return `답과 함께 풀이의 길도 펼쳐 볼게요. 중간 과정이 보여야 다음 문제를 혼자 풀 수 있으니까요.\n\n1. 문제의 **주어진 정보**와 **구할 것**을 나눠요.\n2. ${unitTitle}에서 배운 핵심 원리를 골라요.\n3. 조건을 원리에 연결하고, 각 단계가 가능한 이유를 확인해요.\n4. 나온 결과를 원래 조건에 다시 넣어 검산해요.\n\n직전 질문 “${prompt.slice(0, 50)}”도 이 흐름을 따라가면 해결할 수 있어요.`;
  }
  if (action === "QUIZ") {
    return `### 미니 퀴즈\n\n**${unitTitle}에서 가장 먼저 확인해야 할 것은 무엇일까요?**\n\nA. 답의 모양만 외운다  \nB. 문제의 조건과 적용할 개념을 연결한다  \nC. 가장 긴 선택지를 고른다  \nD. 계산부터 시작한다\n\n정답을 마음속으로 고른 뒤 **답 보기**를 눌러 이유까지 확인해 보세요.`;
  }
  return `이 질문은 **${unitTitle}**에서 무엇이 주어졌고 무엇을 찾아야 하는지 나누면 실마리가 보여요.\n\n“${prompt}”에서 이미 아는 정보와 아직 모르는 것을 먼저 갈라 보세요. 그다음 이 단원의 핵심 개념 중 둘을 이어 주는 것이 무엇인지 찾으면 돼요.\n\n먼저 **가장 중요한 조건 하나**를 짚어 볼까요? 그 조건이 풀이의 출발점이에요.`;
}
