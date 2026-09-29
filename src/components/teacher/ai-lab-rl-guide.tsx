"use client";

import { useState, type ReactNode } from "react";
import { BookOpenText, ChevronRight, CircleHelp, Compass, Eye, Footprints, GraduationCap, Lightbulb, ListChecks, Play, School, Sigma, Target } from "lucide-react";
import { round } from "@/lib/ai-lab/random";
import type { LearnParams, Rewards } from "@/lib/ai-lab/rl";
import { cn } from "@/lib/utils";
import type { Scenario } from "./ai-lab-rl";
import { Segmented } from "./tool-panel";

/*
 * 강화학습 체험의 설명 타일. 선생님도 처음 보는 분이 많아서, 세상마다 ‘무엇을·어떤 순서로·무엇을 보며’ 체험할지와
 * 원리(Q-러닝 식, 탐험·할인율·보상 설계), 수업 활용을 함께 안내합니다. 적힌 숫자는 scripts/verify-ai-lab.ts에서 확인한 결과입니다.
 */

type Step = { title: string; detail: string; action?: { label: string; scenario: Scenario } };
type Guide = { goal: string; steps: Step[]; observe: string[]; questions: { q: string; a: string }[] };

const guides: Record<string, Guide> = {
  basic: {
    goal: "로봇이 함정(−20)을 피해 보물(+20)까지 가는 가장 짧은 길(10걸음)을 스스로 찾게 해요. 아무도 길을 알려 주지 않고, 걸음마다 받는 점수만으로 배워요.",
    steps: [
      { title: "처음 한 판을 봐요", detail: "처음에는 모든 Q값이 0이라 로봇이 아는 것이 없어요. 거의 아무렇게나 움직이고, 벽에 부딪히거나 함정에 빠지기도 해요. 오른쪽 ‘방금 한 걸음’에서 걸음마다 Q값이 어떻게 바뀌는지 보세요.", action: { label: "처음부터 한 판 보기", scenario: { fresh: true, play: true } } },
      { title: "몇 판 더 보며 초록 칸을 찾아요", detail: "보물에 처음 닿으면 보물 바로 옆 칸의 가치가 먼저 커져 초록으로 바뀌어요. 판이 쌓일수록 초록이 출발 쪽으로 한 칸씩 번져요(10판쯤에는 보물에서 3칸 안쪽, 40판쯤에는 출발 칸 부근까지).", action: { label: "10판 학습하고 가치 보기", scenario: { train: 10, view: "values" } } },
      { title: "충분히 배우게 한 뒤 학습한 길을 봐요", detail: "‘학습한 길’은 칸마다 Q값이 가장 큰 방향만 따라간 결과예요. 가장 짧은 길(10걸음)과 같아지면 제대로 배운 거예요.", action: { label: "100판 더 학습하고 학습한 길 보기", scenario: { train: 100, policy: true, view: "arrows" } } },
      { title: "한 칸의 Q값 네 개를 비교해요", detail: "‘Q값 4개’로 바꾸면 칸마다 위·오른쪽·아래·왼쪽 행동의 가치가 보여요. 가장 큰 값이 곧 화살표 방향이고, 함정 쪽 행동은 크게 음수예요.", action: { label: "Q값 4개 보기", scenario: { view: "q" } } },
    ],
    observe: [
      "오른쪽 ‘판마다 받은 보상’ 그래프가 처음에는 낮고 들쭉날쭉하다가 점점 올라가요.",
      "초록(가치가 높은 칸)은 보물 쪽에서, 빨강(가치가 낮은 칸)은 함정 주변에서 생겨요.",
      "학습이 끝나도 ε(탐험) 때문에 가끔 엉뚱한 방향으로 한 걸음 가는 판이 있어요.",
    ],
    questions: [
      { q: "왜 보물 바로 옆 칸부터 가치가 커질까요?", a: "보상(+20)을 직접 받는 것은 보물로 들어가는 마지막 걸음뿐이에요. 그 칸의 Q값이 먼저 커지고, 다음 판에 그 앞 칸이 ‘다음 칸의 가장 큰 Q값’으로 이 값을 이어받아요(γ를 곱해서). 이렇게 보상이 한 칸씩 거꾸로 전달돼요." },
      { q: "로봇은 보물 위치를 알고 있을까요?", a: "몰라요. 로봇이 아는 것은 ‘지금 칸’과 걸음마다 받는 점수뿐이에요. 여러 번 해 보며 점수가 좋았던 행동을 기억할 뿐이에요. 이것이 정답을 알려 주는 지도학습과 다른 점이에요." },
    ],
  },
  cliff: {
    goal: "아래쪽 절벽(−20)에 떨어지지 않으면서 가장 짧은 길(11걸음)을 배우는지 봐요. 강화학습 교과서에 자주 나오는 유명한 예제예요.",
    steps: [
      { title: "처음 몇 판을 봐요", detail: "처음에는 절벽에 자주 떨어져요. 절벽에 떨어지면 판이 끝나고 큰 벌점을 받아요(첫 몇 판의 보상 합계는 −20~−60 정도).", action: { label: "처음부터 한 판 보기", scenario: { fresh: true, play: true } } },
      { title: "학습한 길을 확인해요", detail: "충분히 배우면 학습한 길은 대개 절벽 바로 위 줄을 따라가는 가장 짧은 11걸음 길이 돼요(가끔 한 줄 위로 돌아가는 13걸음 길이 나오면 한 번 더 학습해 보세요). 떨어질 위험이 있어도 ‘가장 좋은 행동’만 기준으로 배우기 때문이에요.", action: { label: "처음부터 200판 학습하고 학습한 길 보기", scenario: { fresh: true, decay: false, train: 200, policy: true } } },
      { title: "학습한 뒤에도 떨어지는 판을 찾아요", detail: "ε를 0.2로 두면 학습이 끝난 뒤에도 다섯 번에 한 번꼴로 무작위 행동을 해요. 절벽 바로 옆을 걷다 보니 그때 떨어져요(확인해 보니 뒤쪽 200판 중 약 20~40%가 떨어졌어요). 보상 그래프에 가끔 크게 떨어지는 점이 보여요.", action: { label: "ε 0.2로 200판 더 학습", scenario: { params: { epsilon: 0.2 }, decay: false, train: 200 } } },
      { title: "ε를 조금씩 줄이며 다시 배워요", detail: "‘판마다 ε 줄이기’를 켜면 처음에는 많이 탐험하고 나중에는 아는 길을 주로 따라가요. 같은 200판에서 떨어지는 판이 몇 번으로 줄어요.", action: { label: "ε 줄이기 켜고 처음부터 400판", scenario: { fresh: true, params: { epsilon: 0.2 }, decay: true, train: 400, policy: true } } },
    ],
    observe: [
      "학습한 길(주황 선)이 대개 절벽 바로 위 줄을 따라가요.",
      "ε를 고정하면 보상 그래프에 −20 아래로 뚝 떨어지는 점이 계속 섞여 있어요.",
      "ε를 줄이면 그래프가 한 값 가까이에서 안정돼요.",
    ],
    questions: [
      { q: "학습한 길은 가장 짧은데, 왜 연습 중에는 자꾸 떨어질까요?", a: "Q-러닝은 실제로는 가끔 무작위로 움직이면서도(탐험), 배울 때는 ‘다음 칸에서 가장 좋은 행동을 한다’고 보고 Q값을 고쳐요. 그래서 가장 짧은 길을 배우지만, 움직일 때는 ε의 확률로 무작위 행동을 해서 절벽 옆에서 떨어져요. 탐험까지 감안해 절벽에서 한 칸 떨어진 안전한 길을 배우는 방법(SARSA)도 있어요." },
      { q: "실제 로봇이라면 어떤 문제가 생길까요?", a: "연습하다가 절벽에서 떨어지면 로봇이 망가지겠죠. 그래서 실제로는 컴퓨터 시뮬레이션에서 먼저 충분히 연습하거나, 위험한 탐험을 줄이는 방법을 함께 써요." },
    ],
  },
  choice: {
    goal: "왼쪽의 가까운 동전(+5)과 오른쪽의 먼 보물(+20) 가운데 무엇을 고르는지 봐요. 할인율 γ와 탐험 비율 ε가 선택을 바꾼다는 것을 확인해요.",
    steps: [
      { title: "ε 0.5 · γ 0.9로 배워요", detail: "먼 미래 보상도 꽤 중요하게 여기고(γ 0.9), 충분히 탐험하면(ε 0.5) 먼 보물을 골라요. 확인해 보니 여섯 번 모두 보물이었어요.", action: { label: "처음부터 300판 학습하고 학습한 길 보기", scenario: { fresh: true, params: { epsilon: 0.5, gamma: 0.9 }, decay: false, train: 300, policy: true } } },
      { title: "γ를 0.5로 낮춰요", detail: "γ가 낮으면 먼 보상을 걸음마다 크게 깎아서 생각해요. 이제 가까운 동전을 골라요(여섯 번 모두 동전).", action: { label: "γ 0.5로 처음부터 300판", scenario: { fresh: true, params: { epsilon: 0.5, gamma: 0.5 }, decay: false, train: 300, policy: true } } },
      { title: "γ는 0.9, ε는 0.2로 줄여요", detail: "탐험이 적으면 먼저 찾은 동전 쪽 길만 되풀이해서, 오른쪽 끝의 보물을 거의 발견하지 못해요(여섯 번 중 다섯 번 동전).", action: { label: "ε 0.2로 처음부터 300판", scenario: { fresh: true, params: { epsilon: 0.2, gamma: 0.9 }, decay: false, train: 300, policy: true } } },
      { title: "출발 칸의 Q값을 비교해요", detail: "‘Q값 4개’로 바꿔 출발 칸의 왼쪽·오른쪽 값을 보세요. 더 큰 쪽이 학습한 선택이에요.", action: { label: "Q값 4개 보기", scenario: { view: "q" } } },
    ],
    observe: [
      "같은 세상, 같은 보상인데 γ와 ε만 바꿔도 학습한 길이 달라져요.",
      "ε가 작을 때 보상 그래프는 동전 보상 근처에서 멈춰 더 올라가지 않아요.",
    ],
    questions: [
      { q: "γ가 작으면 왜 가까운 동전을 고를까요?", a: "먼 보상일수록 γ를 걸음 수만큼 여러 번 곱해 작게 봐요. γ가 0.5면 네 걸음 뒤 보상은 0.5 × 0.5 × 0.5 × 0.5 ≈ 0.06배로 줄어서, 먼 보물(+20)보다 가까운 동전(+5)이 더 커 보여요. ‘원리 이해’의 γ 표에서 숫자로 확인할 수 있어요." },
      { q: "ε가 작으면 왜 더 좋은 보물을 놓칠까요?", a: "동전을 먼저 찾으면 그쪽 행동의 Q값이 커지고, 로봇은 대부분 그 행동만 이용해요. 오른쪽 끝까지 가 보는 탐험을 거의 하지 않으니 보물이 있다는 것조차 몰라요. 새로운 것을 시도해 보는 탐험과 아는 것을 이용하는 것 사이의 균형이 강화학습의 핵심 고민이에요." },
    ],
  },
  maze: {
    goal: "막다른 길이 많은 미로에서 로봇이 길(13걸음)을 찾아요. 한 걸음마다 받는 작은 벌점이 새 길을 찾게 만드는 원리를 봐요.",
    steps: [
      { title: "첫 판을 봐요", detail: "첫 판에는 막다른 길을 오가며 오래 헤매요. 아래 상태 줄의 걸음 수를 기억해 두세요.", action: { label: "처음부터 한 판 보기", scenario: { fresh: true, play: true } } },
      { title: "몇 판 더 보며 걸음 수를 비교해요", detail: "가 본 행동은 벌점(−1) 때문에 Q값이 음수가 돼요. 아직 0인 안 가 본 행동이 더 좋아 보여서, 로봇이 저절로 새 길을 시도해요. 판마다 걸음 수가 줄어드는 것을 보세요.", action: { label: "한 판 더 보기", scenario: { play: true } } },
      { title: "걸음 벌점을 0으로 바꿔 비교해요", detail: "벌점이 없으면 가 본 길과 안 가 본 길의 차이가 없어져서 처음에 훨씬 오래 헤매요(확인해 보니 처음 10판의 걸음 수가 1.5배 넘게 늘었어요).", action: { label: "걸음 벌점 0으로 처음부터 한 판", scenario: { fresh: true, rewards: { step: 0 }, play: true } } },
      { title: "다시 −1로 두고 충분히 배워요", detail: "학습한 길이 가장 짧은 13걸음이 되는지 확인해요.", action: { label: "벌점 −1로 처음부터 200판 학습", scenario: { fresh: true, rewards: { step: -1 }, train: 200, policy: true } } },
    ],
    observe: [
      "막다른 길 안쪽 칸들은 학습이 끝나도 빨강(가치가 낮음)으로 남아요.",
      "걸음 벌점이 있을 때와 없을 때, 처음 몇 판의 걸음 수가 크게 달라요.",
    ],
    questions: [
      { q: "벌점을 주는데 왜 오히려 길을 더 잘 찾을까요?", a: "Q값은 모두 0에서 시작해요. 한 번 해 본 행동은 벌점 때문에 0보다 작아지니, 아직 해 보지 않은 행동(0)이 상대적으로 좋아 보여요. 그래서 로봇이 자연스럽게 안 가 본 곳을 먼저 가 봐요. 보상 설계가 탐험 방식까지 바꾼 거예요." },
      { q: "막다른 길의 칸은 왜 빨강일까요?", a: "막다른 길에 들어가면 되돌아 나와야 해서 걸음 벌점을 더 받아요. 그 칸에서 할 수 있는 가장 좋은 행동도 결국 먼 길이라 가치가 낮아요." },
    ],
  },
  empty: {
    goal: "벽도 함정도 없는 방에서 나만의 세상을 만들어 봐요. 세상을 바꾸면 로봇이 배우는 길도 달라져요.",
    steps: [
      { title: "벽·함정·보물을 그려요", detail: "왼쪽 ‘칸을 누르거나 끌어서 바꾸기’에서 붓을 고르고 격자를 눌러요. 끌면 여러 칸을 한 번에 칠해요. 세상을 바꾸면 배운 것을 지우고 처음부터 배워요." },
      { title: "배우게 하고 학습한 길을 봐요", detail: "100판 학습한 뒤 학습한 길이 가장 짧은 길(왼쪽 카드에 표시)과 같은지 확인해요. 조금 돌아가는 길이면 100판 더 학습해 보세요.", action: { label: "100판 학습하고 학습한 길 보기", scenario: { train: 100, policy: true } } },
      { title: "동전과 보물을 거리 다르게 놓아 봐요", detail: "‘동전’ 붓으로 가까운 곳에 동전을 두고 γ를 바꿔 가며 어느 쪽을 고르는지 비교해요." },
      { title: "친구와 겨뤄요", detail: "서로 어려운 세상을 만들어, 로봇이 몇 판 만에 학습한 길을 찾는지 겨뤄 봐요." },
    ],
    observe: ["벽을 많이 둘수록 초록이 번지는 속도가 느려져요.", "보물까지 가는 길이 막히면 왼쪽 카드에 ‘가장 짧은 길: 없음’이 나와요."],
    questions: [
      { q: "로봇이 절대 배울 수 없는 세상은 어떤 세상일까요?", a: "보물이 벽에 완전히 둘러싸여 한 번도 닿을 수 없는 세상이에요. 보상을 한 번도 받지 못하면 좋은 행동을 구별할 방법이 없어요. 강화학습은 보상을 경험해야만 배울 수 있어요." },
    ],
  },
};

/** 음수는 빼기 기호(−)로 씁니다. */
const num = (value: number) => String(round(value, 2)).replace("-", "−");

function Tile({ icon: Icon, title, children, className }: { icon: typeof Lightbulb; title: string; children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line bg-surface-2 p-4", className)}>
    <h3 className="flex items-center gap-1.5 text-[.9rem] font-extrabold text-ink"><Icon size={16} className="text-brand" />{title}</h3>
    <div className="mt-2 break-keep text-[.8rem] leading-6 text-ink-2">{children}</div>
  </div>;
}

function TryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-lg border border-brand/25 bg-surface px-2.5 text-[.74rem] font-bold text-brand-dark transition hover:border-brand/45 hover:bg-brand-page"><Play size={12} />{label}</button>;
}

function Question({ q, a }: { q: string; a: string }) {
  return <details className="group rounded-xl border border-line bg-surface">
    <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 py-2 text-[.8rem] font-bold text-ink [&::-webkit-details-marker]:hidden">
      <CircleHelp size={15} className="shrink-0 text-brand" /><span className="flex-1">{q}</span><ChevronRight size={15} className="shrink-0 text-ink-4 transition-transform group-open:rotate-90" />
    </summary>
    <p className="break-keep border-t border-line px-3 py-2.5 text-[.78rem] leading-6 text-ink-3">{a}</p>
  </details>;
}

/** 에이전트와 환경이 행동·상태·보상을 주고받는 순환 그림. */
function LoopDiagram() {
  return <svg viewBox="0 0 420 170" className="mx-auto my-1 block h-auto w-full max-w-[420px]" role="img" aria-label="에이전트는 행동을 하고, 환경은 다음 상태와 보상을 돌려주는 순환">
    <defs><marker id="rl-loop-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#6847e8" /></marker></defs>
    <rect x="20" y="55" width="120" height="60" rx="14" fill="#f3f0ff" stroke="#7048e8" strokeWidth="2" />
    <text x="80" y="82" textAnchor="middle" fontSize="15" fontWeight="800" fill="#5f3dc4" fontFamily="Pretendard, sans-serif">에이전트</text>
    <text x="80" y="101" textAnchor="middle" fontSize="11" fill="#5f3dc4" fontFamily="Pretendard, sans-serif">(로봇 · Q값 표)</text>
    <rect x="280" y="55" width="120" height="60" rx="14" fill="#ebfbee" stroke="#2f9e44" strokeWidth="2" />
    <text x="340" y="82" textAnchor="middle" fontSize="15" fontWeight="800" fill="#2b8a3e" fontFamily="Pretendard, sans-serif">환경</text>
    <text x="340" y="101" textAnchor="middle" fontSize="11" fill="#2b8a3e" fontFamily="Pretendard, sans-serif">(격자 세상)</text>
    <path d="M140,70 C200,20 220,20 278,70" fill="none" stroke="#6847e8" strokeWidth="2" markerEnd="url(#rl-loop-arrow)" />
    <text x="210" y="30" textAnchor="middle" fontSize="12" fontWeight="700" fill="#343a40" fontFamily="Pretendard, sans-serif">① 행동 (위·오른쪽·아래·왼쪽)</text>
    <path d="M280,100 C220,150 200,150 142,100" fill="none" stroke="#6847e8" strokeWidth="2" markerEnd="url(#rl-loop-arrow)" />
    <text x="210" y="160" textAnchor="middle" fontSize="12" fontWeight="700" fill="#343a40" fontFamily="Pretendard, sans-serif">② 다음 상태(칸) + 보상(점수)</text>
    <text x="210" y="82" textAnchor="middle" fontSize="11" fontWeight="700" fill="#868e96" fontFamily="Pretendard, sans-serif">③ 받은 보상으로</text>
    <text x="210" y="98" textAnchor="middle" fontSize="11" fontWeight="700" fill="#868e96" fontFamily="Pretendard, sans-serif">Q값 고치고 다시 ①</text>
  </svg>;
}

export function RlGuide({ exampleId, params, rewards, onScenario }: { exampleId: string; params: LearnParams; rewards: Rewards; onScenario: (scenario: Scenario) => void }) {
  const [tab, setTab] = useState<"guide" | "principle" | "class">("guide");
  const guide = guides[exampleId] ?? guides.basic;
  const { alpha, gamma, epsilon } = params;
  // 식 읽기 예시: 보물 바로 옆 칸 → 그 앞 칸 순서로 처음 두 번 고칠 때의 숫자(지금 설정값으로 계산).
  const lastReward = rewards.step + rewards.goal;
  const nearGoal = alpha * lastReward;
  const beforeTarget = rewards.step + gamma * nearGoal;
  const beforeGoal = alpha * beforeTarget;
  const gammas = [...new Set([round(gamma, 2), 0.9, 0.5])];

  return <section className="rounded-[18px] border border-line bg-surface shadow-[var(--lift-1)]">
    <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
      <h2 className="flex items-center gap-1.5 text-[.98rem] font-extrabold text-ink"><BookOpenText size={17} className="text-brand" /> 강화학습 이해하기</h2>
      <div className="ml-auto min-w-[18rem]">
        <Segmented label="설명 고르기" value={tab} onChange={setTab} options={[{ value: "guide", label: "이 세상 체험 안내" }, { value: "principle", label: "원리 이해" }, { value: "class", label: "수업에서 활용" }]} />
      </div>
    </div>

    {tab === "guide" && <div className="grid gap-3 p-4 lg:grid-cols-2">
      <Tile icon={Target} title="이 체험의 목표" className="lg:col-span-2"><p>{guide.goal}</p></Tile>
      <Tile icon={Footprints} title="이렇게 체험해 보세요" className="lg:col-span-2">
        <ol className="grid gap-2.5 md:grid-cols-2">
          {guide.steps.map((step, index) => <li key={step.title} className="rounded-xl border border-line bg-surface p-3">
            <p className="flex items-start gap-2 text-[.82rem] font-extrabold text-ink"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[.7rem] text-white">{index + 1}</span>{step.title}</p>
            <p className="mt-1 text-[.78rem] leading-6 text-ink-3">{step.detail}</p>
            {step.action && <TryButton label={step.action.label} onClick={() => onScenario({ ...step.action!.scenario, note: `${index + 1}단계: ${step.action!.label}` })} />}
          </li>)}
        </ol>
      </Tile>
      <Tile icon={Eye} title="눈여겨볼 점">
        <ul className="list-disc space-y-1 pl-4">{guide.observe.map((item) => <li key={item}>{item}</li>)}</ul>
      </Tile>
      <Tile icon={CircleHelp} title="생각해 볼 질문 (눌러서 해설 보기)">
        <div className="space-y-2">{guide.questions.map((item) => <Question key={item.q} {...item} />)}</div>
      </Tile>
    </div>}

    {tab === "principle" && <div className="grid gap-3 p-4 lg:grid-cols-2">
      <Tile icon={Compass} title="강화학습은 이렇게 배워요" className="lg:col-span-2">
        <LoopDiagram />
        <p>에이전트(로봇)는 지금 상태(칸)에서 행동을 하나 골라요. 환경(격자 세상)은 그 결과로 다음 상태와 보상을 돌려줘요. 에이전트는 받은 보상으로 ‘이 칸에서 이 행동은 얼마나 좋은가’(Q값)를 고치고, 다시 행동을 골라요. 이 순환을 수백 번 되풀이하며 보상을 가장 많이 받는 행동 규칙(정책)을 익혀요. 누구도 정답 행동을 알려 주지 않는다는 것이 핵심이에요.</p>
      </Tile>
      <Tile icon={ListChecks} title="지도·비지도·강화학습 비교" className="lg:col-span-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-[.76rem]">
            <thead><tr className="text-ink-4"><th className="py-1.5 pr-2 font-bold">구분</th><th className="py-1.5 pr-2 font-bold">배우는 재료</th><th className="py-1.5 pr-2 font-bold">무엇을 배우나</th><th className="py-1.5 font-bold">예</th></tr></thead>
            <tbody className="align-top">
              <tr className="border-t border-line"><td className="py-1.5 pr-2 font-bold text-ink">지도학습</td><td className="py-1.5 pr-2">정답이 붙은 자료</td><td className="py-1.5 pr-2">입력 → 정답을 맞히는 규칙</td><td className="py-1.5">회귀, 분류(스팸 메일 거르기)</td></tr>
              <tr className="border-t border-line"><td className="py-1.5 pr-2 font-bold text-ink">비지도학습</td><td className="py-1.5 pr-2">정답 없는 자료</td><td className="py-1.5 pr-2">자료 속 비슷한 무리·구조</td><td className="py-1.5">군집(고객 나누기)</td></tr>
              <tr className="border-t border-line"><td className="py-1.5 pr-2 font-bold text-brand-dark">강화학습</td><td className="py-1.5 pr-2">행동 뒤에 받는 보상</td><td className="py-1.5 pr-2">보상을 가장 많이 받는 행동 순서(정책)</td><td className="py-1.5">게임 AI, 로봇 제어</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2">강화학습은 한 번의 행동이 아니라 <b>여러 걸음에 걸친 결정</b>을 배우고, 좋은 결과가 나중에야 나타나도(보물은 마지막에야 받음) 앞선 행동의 가치를 거꾸로 계산해 낸다는 점이 특별해요.</p>
      </Tile>
      <Tile icon={Sigma} title="Q값이란?">
        <p><b>Q(상태, 행동)</b>은 ‘이 칸에서 이 방향으로 가면, 그 뒤로 계속 잘 움직였을 때 받을 보상의 합(할인된 값)’을 추정한 점수예요. 보상 한 번의 크기가 아니라 <b>앞으로의 합계</b>라는 점이 중요해요.</p>
        <p className="mt-1.5">칸 16개 × 행동 4개면 Q값도 64개예요. 이 표를 ‘Q 테이블’이라고 부르고, 화면의 ‘Q값 4개’ 보기가 바로 이 표예요. 화살표는 각 칸에서 가장 큰 Q값의 방향이에요.</p>
        <TryButton label="Q값 4개로 보기" onClick={() => onScenario({ view: "q" })} />
      </Tile>
      <Tile icon={Sigma} title="Q-러닝 식 한 줄씩 읽기">
        <p className="figure rounded-lg bg-surface px-2.5 py-2 text-center text-[.8rem] font-bold text-ink">새 Q = 옛 Q + α × (보상 + γ × 다음 칸의 가장 큰 Q − 옛 Q)</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li><b>보상 + γ × 다음 칸의 가장 큰 Q</b> = 이번 경험으로 본 ‘목표값’(방금 받은 점수 + 앞으로 받을 점수의 추정)</li>
          <li><b>목표값 − 옛 Q</b> = 생각보다 좋았는지(+) 나빴는지(−)</li>
          <li><b>α</b> = 그 차이를 얼마만큼 반영할지</li>
        </ul>
        <p className="mt-2 font-bold text-ink">지금 설정(α {alpha}, γ {gamma})으로 계산해 보면</p>
        <p className="figure mt-1 rounded-lg bg-surface px-2.5 py-1.5 text-[.76rem]">① 보물 옆 칸 → 보물: 보상 {num(lastReward)}, 끝났으니 다음 Q는 0 → 새 Q = 0 + {alpha} × ({num(lastReward)} − 0) = {num(nearGoal)}</p>
        <p className="figure mt-1 rounded-lg bg-surface px-2.5 py-1.5 text-[.76rem]">② 그 앞 칸 → 보물 옆 칸: 목표값 = {num(rewards.step)} + {gamma} × {num(nearGoal)} = {num(beforeTarget)} → 새 Q = 0 + {alpha} × {num(beforeTarget)} = {num(beforeGoal)}</p>
        <p className="mt-1.5 text-[.76rem] text-ink-3">이렇게 보물의 보상이 한 칸씩 앞 칸으로 전해져요. 오른쪽 ‘방금 한 걸음’ 카드가 이 계산을 실제 걸음마다 보여 줘요.</p>
      </Tile>
      <Tile icon={Lightbulb} title="탐험과 이용 — ε">
        <p>ε는 ‘무작위로 해 볼 확률’이에요. 지금 ε가 {epsilon}이면 대략 {epsilon > 0 ? `${Math.round(1 / epsilon)}번에 1번` : "한 번도"} 아무 행동이나 해 보고(탐험), 나머지는 지금까지 가장 좋았던 행동을 해요(이용).</p>
        <p className="mt-1.5">탐험이 너무 적으면 처음 찾은 그럭저럭 좋은 길에 안주하고, 너무 많으면 다 배운 뒤에도 실수가 잦아요. 그래서 처음엔 많이, 나중엔 적게 탐험하도록 ε를 줄여 가는 방법을 많이 써요.</p>
        <TryButton label="‘가까운 동전 vs 먼 보물’에서 ε 0.2로 300판" onClick={() => onScenario({ example: "choice", params: { epsilon: 0.2, gamma: 0.9 }, decay: false, train: 300, policy: true })} />
      </Tile>
      <Tile icon={Lightbulb} title="할인율 — γ">
        <p>γ는 ‘미래 보상을 한 걸음마다 몇 배로 줄여서 생각할지’예요. 보물 보상 {rewards.goal}점을 몇 걸음 뒤에 받느냐에 따라 지금 느끼는 크기는 이렇게 달라요.</p>
        <table className="mt-2 w-full text-center text-[.76rem]">
          <thead><tr className="text-ink-4"><th className="py-1 font-bold">γ</th>{[1, 3, 5, 10].map((steps) => <th key={steps} className="py-1 font-bold">{steps}걸음 뒤</th>)}</tr></thead>
          <tbody>{gammas.map((value) => <tr key={value} className={cn("border-t border-line", value === round(gamma, 2) && "bg-brand-page font-bold text-brand-dark")}>
            <td className="py-1">{value}{value === round(gamma, 2) ? " (지금)" : ""}</td>
            {[1, 3, 5, 10].map((steps) => <td key={steps} className="figure py-1">{round(rewards.goal * value ** (steps - 1), 2)}</td>)}
          </tr>)}</tbody>
        </table>
        <p className="mt-1.5 text-[.76rem] text-ink-3">γ가 1에 가까우면 먼 보상도 중요하게, 0에 가까우면 당장 받을 보상만 봐요.</p>
      </Tile>
      <Tile icon={Lightbulb} title="학습률 — α">
        <p>α는 새 경험을 한 번에 얼마나 믿을지예요. α가 1이면 이전 기억을 버리고 방금 경험으로 바꿔 버리고, 0.1처럼 작으면 조금씩 천천히 고쳐요. 이 격자 세상처럼 결과가 늘 같은 환경에서는 큰 α도 잘 배우지만, 결과가 들쭉날쭉한 환경에서는 작은 α가 더 안정적이에요.</p>
      </Tile>
      <Tile icon={Lightbulb} title="보상 설계 — 무엇을 보상하느냐가 곧 무엇을 배우느냐">
        <p>에이전트는 우리가 준 점수만 믿고 배워요. 점수를 잘못 주면 엉뚱한 요령을 배워요. 예를 들어 보물·함정 점수를 모두 0으로 두고 걸음 벌점만 남기면, 판을 빨리 끝낼수록 벌점이 적으니 로봇은 가까운 함정에 스스로 뛰어드는 법을 배워요(보물 찾기 세상에서 3걸음 만에 함정으로 가요).</p>
        <TryButton label="보물·함정 0점으로 처음부터 300판" onClick={() => onScenario({ example: "basic", rewards: { goal: 0, trap: 0 }, decay: true, train: 300, policy: true })} />
      </Tile>
      <Tile icon={BookOpenText} title="용어 정리" className="lg:col-span-2">
        <dl className="grid gap-x-5 gap-y-1.5 md:grid-cols-2">
          {[
            ["에이전트", "스스로 행동을 고르며 배우는 주인공(로봇)."], ["환경", "에이전트가 행동하는 세상(격자). 행동의 결과와 보상을 돌려줘요."],
            ["상태", "에이전트가 놓인 상황(로봇이 있는 칸)."], ["행동", "상태에서 고를 수 있는 선택(위·오른쪽·아래·왼쪽)."],
            ["보상", "행동 뒤에 받는 점수. 좋고 나쁨만 알려 주고 정답은 알려 주지 않아요."], ["에피소드", "출발부터 보물·동전·함정에 닿을 때까지의 한 판."],
            ["정책", "상태마다 어떤 행동을 할지 정한 규칙. 학습한 길은 Q값이 가장 큰 행동만 따른 정책이에요."], ["Q 테이블", "모든 칸·행동의 Q값을 모은 표."],
          ].map(([term, text]) => <div key={term}><dt className="inline font-extrabold text-ink">{term}</dt> <dd className="inline text-ink-3">— {text}</dd></div>)}
        </dl>
      </Tile>
    </div>}

    {tab === "class" && <div className="grid gap-3 p-4 lg:grid-cols-2">
      <Tile icon={School} title="추천 수업 흐름 (45분)" className="lg:col-span-2">
        <ol className="space-y-2">
          {[
            { time: "도입 5분", text: "‘강아지에게 손 주기를 가르칠 때 정답을 말로 설명하나요, 간식을 주나요?’로 보상으로 배우는 방식을 떠올려요. 지도·비지도학습과 무엇이 다른지 짧게 비교해요." },
            { time: "체험 1 · 10분", text: "‘보물 찾기’에서 한 판 보기 → 10판 → 100판 순서로 초록이 보물에서 출발 쪽으로 번지는 모습과 보상 그래프가 올라가는 모습을 봐요.", scenario: { example: "basic", play: true } as Scenario, label: "보물 찾기 열고 한 판 보기" },
            { time: "체험 2 · 10분", text: "‘가까운 동전 vs 먼 보물’에서 γ와 ε를 바꿔 선택이 달라지는 것을 모둠별로 예측하고 확인해요.", scenario: { example: "choice" } as Scenario, label: "동전 vs 보물 열기" },
            { time: "체험 3 · 10분", text: "보상을 바꿔 보기: 걸음 벌점 0, 보물·함정 0점 등으로 바꾸면 어떤 행동을 배우는지 예측해 보고 확인해요(보상 해킹).", scenario: { example: "basic", rewards: { goal: 0, trap: 0 }, decay: true, train: 300, policy: true } as Scenario, label: "보상 해킹 해 보기" },
            { time: "정리 10분", text: "‘보상만 주고 정답은 안 알려 줘도 배울 수 있는 이유’, ‘보상을 잘못 설계하면 생기는 문제’를 자기 말로 정리하고, 게임·로봇·자율주행 등 쓰임새와 연결해요." },
          ].map((item) => <li key={item.time} className="rounded-xl border border-line bg-surface p-3">
            <p className="text-[.8rem] font-extrabold text-brand-dark">{item.time}</p>
            <p className="mt-0.5 text-[.78rem] leading-6 text-ink-3">{item.text}</p>
            {item.scenario && <TryButton label={item.label!} onClick={() => onScenario({ ...item.scenario!, note: item.label })} />}
          </li>)}
        </ol>
      </Tile>
      <Tile icon={CircleHelp} title="핵심 발문">
        <ul className="list-disc space-y-1 pl-4">
          <li>로봇에게 보물 위치를 알려 준 적이 없는데 어떻게 길을 알게 되었을까?</li>
          <li>화살표는 누가 정했을까? (로봇이 받은 점수로 스스로 정했어요)</li>
          <li>당장의 작은 보상과 나중의 큰 보상 중 무엇을 고르게 할지는 무엇으로 정할 수 있을까? (γ)</li>
          <li>새로운 방법을 시도해 보는 것(탐험)과 아는 방법을 쓰는 것(이용), 공부할 때는 어떤 균형이 좋을까?</li>
          <li>게임 점수만 보상으로 주면 AI가 규칙의 빈틈을 이용할 수도 있을까?</li>
        </ul>
      </Tile>
      <Tile icon={GraduationCap} title="학생들이 자주 헷갈리는 점">
        <ul className="list-disc space-y-1 pl-4">
          <li><b>‘화살표가 정답이다’</b> — 정답이 아니라 지금까지의 경험으로 추정한 최선이에요. 덜 배우면 틀린 화살표도 있어요.</li>
          <li><b>‘Q값 = 보상’</b> — Q값은 한 번의 보상이 아니라 앞으로 받을 보상 합계의 추정이에요.</li>
          <li><b>‘학습한 길이 최단이 아니면 고장’</b> — 판 수가 적거나, γ·ε·보상 설정 때문일 수 있어요. 설정을 바꿔 원인을 찾는 것이 좋은 탐구예요.</li>
          <li><b>‘탐험은 낭비’</b> — 탐험이 없으면 더 좋은 길을 영영 모를 수 있어요(동전 vs 보물 예시).</li>
        </ul>
      </Tile>
      <Tile icon={BookOpenText} title="교과서 단원 연결" className="lg:col-span-2">
        <p>인공지능 기초 ‘Ⅱ. 인공지능과 학습 → 기계학습의 이해와 원리 → 기계학습의 유형과 알고리즘’에서 지도학습·비지도학습과 함께 강화학습을 다룰 때 활용할 수 있어요. 같은 메뉴의 ‘지도·비지도학습 체험’과 이어서 쓰면 세 가지 학습 방법을 한 차시 안에서 비교할 수 있어요.</p>
        <p className="mt-1.5 text-[.76rem] text-ink-4">이 체험은 원리를 보여 주기 위해 단순화한 모형이에요. 실제 강화학습(예: 바둑·게임 AI)은 Q 테이블 대신 신경망으로 가치를 추정하는 등 훨씬 복잡한 방법을 써요.</p>
      </Tile>
    </div>}
  </section>;
}
