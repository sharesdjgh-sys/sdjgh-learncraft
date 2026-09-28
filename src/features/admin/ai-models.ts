/** 운영 설정의 AI 모델 정보 타입과 계산. 클라이언트에서도 가져다 쓰므로 서버 전용 모듈을 import하지 않습니다. */
export type AiModelSlot = {
  key: "primary" | "fallback" | "image" | "openaiImage";
  role: string; provider: string; modelId: string;
  /** 값을 읽은 환경 변수. 설정되지 않았으면 코드 기본값을 씁니다. */
  envVar: string; fromEnv: boolean;
  status: "ready" | "off" | "missingKey" | "sameAsPrimary";
  note: string; uses: string[];
};
export type AiModelUsage = { modelId: string; succeeded: number; failed: number; cost: number; lastAt: string | null };
/** 지금 적용되는 100만 토큰당 USD 단가. 없는 모델은 예상 비용이 0으로 계산됩니다. */
export type AiModelPrice = { modelId: string; input: number; output: number; cachedInput: number; until: string | null };
/** prices는 DB가 없으면 null입니다. */
export type AiOverview = { models: AiModelSlot[]; usage: AiModelUsage[]; usageDays: number; prices: AiModelPrice[] | null };
/** 최근 기간 사람·날짜별 직접 질문 수(reserved_count) 분포: count회 쓴 사람·일이 n번 */
export type LimitStats = { days: number; dist: { count: number; n: number }[] };

/** 한도를 limit으로 했을 때 한도에 닿았을(= 더 못 물었을) 사람·일 수와 전체 이용 사람·일 수 */
export function limitImpact(stats: LimitStats, limit: number) {
  const total = stats.dist.reduce((sum, row) => sum + row.n, 0);
  const hit = stats.dist.filter((row) => row.count >= limit).reduce((sum, row) => sum + row.n, 0);
  const max = stats.dist.reduce((value, row) => Math.max(value, row.count), 0);
  return { total, hit, max, rate: total ? hit / total * 100 : 0 };
}

