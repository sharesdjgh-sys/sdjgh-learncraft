"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CornerDownLeft, FilePlus2, Lightbulb, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseScore, type ScoreSettings } from "@/lib/music-score/notation";
import { renderScore } from "@/lib/music-score/render";

type Example = { text: string; caption?: string; settings?: Partial<ScoreSettings> };
type Lesson = {
  title: string; summary: string;
  rules?: { write: string; mean: string }[];
  examples?: Example[];
  tips?: string[];
  mistakes?: { wrong: string; right: string; why: string }[];
  steps?: string[];
};

const previewSettings: ScoreSettings = { title: "", composer: "", lyricist: "", clef: "treble", key: "C", time: "4/4", tempo: 90, lyrics: "", perLine: 4, labels: "solfege" };

export const musicGuideLessons: Lesson[] = [
  {
    title: "한눈에 보기",
    summary: "음표 하나는 ‘계이름 + 길이 숫자’로 붙여 쓰고, 음표 사이는 띄어 씁니다. 마디는 | 로 나눠요.",
    rules: [
      { write: "도4", mean: "도, 4분음표(1박)" },
      { write: "레8 미8", mean: "8분음표 두 개(반 박씩)" },
      { write: "솔2 · 파1", mean: "2분음표(2박) · 온음표(4박)" },
      { write: "도4.", mean: "점4분음표(1박 반)" },
      { write: "쉼4", mean: "4분쉼표" },
      { write: "|", mean: "마디 나누기" },
      { write: "높은도4 · 낮은솔4", mean: "한 옥타브 위·아래 음" },
      { write: "파#4 · 시b4", mean: "올림표 · 내림표" },
      { write: "도2~ 도4", mean: "붙임줄로 이어 소리 내기" },
      { write: "[C]도4", mean: "음표 위에 코드 이름 C" },
    ],
    examples: [{ text: "[C]도4 레8 미8 파4. 솔8 | [G7]라2~ 라4 쉼4 | [C]높은도4 시4 라4 파#4 | 솔1 |", caption: "위 규칙을 모두 쓴 예" }],
    tips: ["처음에는 ‘예시 불러오기’로 비슷한 악보를 불러와 고쳐 쓰면 가장 쉬워요.", "건반으로 입력하면 이 문법이 입력창에 자동으로 적혀요. 적힌 글을 보며 익혀 보세요."],
  },
  {
    title: "1. 계이름과 음표 길이",
    summary: "도·레·미·파·솔·라·시 뒤에 길이 숫자를 붙입니다. 숫자는 ‘몇 분음표’인지를 뜻해요.",
    rules: [
      { write: "1", mean: "온음표 · 4박" },
      { write: "2", mean: "2분음표 · 2박" },
      { write: "4", mean: "4분음표 · 1박" },
      { write: "8", mean: "8분음표 · 반 박" },
      { write: "16", mean: "16분음표 · 반의반 박" },
    ],
    examples: [
      { text: "도1 | 레2 미2 | 파4 솔4 라4 시4 | 도8 레8 미8 파8 솔8 라8 시8 높은도8 |", caption: "길이별로 적어 보기" },
      { text: "도8 레 미 파 솔 라 시 높은도 |", caption: "숫자를 빼면 앞 음표 길이를 그대로 써요" },
    ],
    tips: ["8분음표·16분음표는 박자에 맞춰 자동으로 묶여(빔) 그려져요.", "붙여 써도 읽어요: 도4레4미2 → 도4 레4 미2"],
  },
  {
    title: "2. 점음표와 쉼표",
    summary: "길이 숫자 뒤에 점(.)을 찍으면 원래 길이의 1.5배가 됩니다. 쉼표는 ‘쉼’ 뒤에 길이를 적어요.",
    rules: [
      { write: "도2.", mean: "점2분음표 · 3박" },
      { write: "도4.", mean: "점4분음표 · 1박 반" },
      { write: "도8.", mean: "점8분음표 · 반 박 + 반의반 박" },
      { write: "쉼1 · 쉼2 · 쉼4 · 쉼8", mean: "온쉼표 · 2분쉼표 · 4분쉼표 · 8분쉼표" },
      { write: "쉼4.", mean: "점4분쉼표" },
    ],
    examples: [
      { text: "도4. 레8 미2 | 쉼4 솔4 쉼2 | 파8. 미16 레4 도2 |", caption: "점음표와 쉼표 섞기" },
    ],
    tips: ["점16분음표(16.)는 쓸 수 없어요."],
  },
  {
    title: "3. 마디와 박자",
    summary: "| 로 마디를 나눕니다. 한 마디 안 음표 길이의 합이 박자표와 같아야 해요. 맞지 않으면 그 마디가 빨간색으로 표시돼요.",
    rules: [
      { write: "4/4박자", mean: "한 마디 = 4분음표 4개" },
      { write: "3/4박자", mean: "한 마디 = 4분음표 3개" },
      { write: "6/8박자", mean: "한 마디 = 8분음표 6개" },
      { write: "2/4박자", mean: "한 마디 = 4분음표 2개" },
    ],
    examples: [
      { text: "솔4 | 도2 미4 | 솔2. | 파4 미4 레4 | 도2 |", caption: "3/4박자 · 첫 마디와 끝 마디가 짧은 못갖춘마디", settings: { time: "3/4" } },
      { text: "도8 레8 미8 파4. | 솔4. 쉼4. |", caption: "6/8박자", settings: { time: "6/8" } },
    ],
    tips: ["첫 마디나 마지막 마디가 짧으면 오류가 아니라 ‘못갖춘마디’ 안내가 나와요.", "건반으로 입력하면 마디가 꽉 찰 때 | 가 자동으로 붙어요."],
  },
  {
    title: "4. 높은 음과 낮은 음",
    summary: "그냥 적은 계이름은 가운데 옥타브(도~시)입니다. 그보다 높거나 낮은 음은 앞에 ‘높은’, ‘낮은’을 붙여요.",
    rules: [
      { write: "도4 … 시4", mean: "가운데 옥타브" },
      { write: "높은도4", mean: "가운데 도보다 한 옥타브 위" },
      { write: "낮은솔4", mean: "가운데 도 아래의 솔" },
      { write: "높은높은도4", mean: "두 옥타브 위" },
    ],
    examples: [
      { text: "낮은솔4 낮은라4 낮은시4 도4 | 레4 미4 파4 솔4 | 라4 시4 높은도4 높은레4 | 높은미1 |", caption: "낮은 솔부터 높은 미까지 올라가기" },
    ],
    mistakes: [{ wrong: "솔4 라4 시4 도4", right: "낮은솔4 낮은라4 낮은시4 도4", why: "‘솔라시도’로 올라가려면 도 아래의 솔·라·시는 ‘낮은’을 붙여야 해요. 안 붙이면 도가 뚝 떨어져요." }],
  },
  {
    title: "5. 올림표와 내림표",
    summary: "계이름 뒤, 길이 숫자 앞에 #(올림) 또는 b(내림)를 붙입니다.",
    rules: [
      { write: "파#4", mean: "파를 반음 올림" },
      { write: "시b4", mean: "시를 반음 내림" },
      { write: "높은도#8", mean: "높은 도를 반음 올린 8분음표" },
    ],
    examples: [{ text: "도4 도#4 레4 레#4 | 미4 파4 파#4 솔4 | 솔4 솔b4 파4 미4 | 미b4 레4 레b4 도4 |", caption: "반음씩 오르내리기" }],
    tips: ["조표에 붙은 올림·내림은 계이름에 이미 들어 있어요. 예를 들어 사장조의 ‘시’는 자동으로 올림바(F#)로 그려져요.", "같은 마디 안에서 다시 제자리로 돌아오면 제자리표가 자동으로 붙어요."],
  },
  {
    title: "6. 붙임줄",
    summary: "음표 끝에 ~ 를 붙이면 바로 뒤의 같은 음과 이어져 한 번만 소리 납니다. 마디를 넘어 이을 때 많이 써요.",
    rules: [
      { write: "도2~ 도4", mean: "2박 + 1박 = 3박 동안 한 번 소리" },
      { write: "미4.~ 미8", mean: "점4분음표와 8분음표 잇기" },
    ],
    examples: [{ text: "도4 레4 미2~ | 미2 레4 도4~ | 도1 |", caption: "마디를 넘는 붙임줄" }],
    tips: ["붙임줄은 같은 음끼리만 이어요. 다른 음을 잇는 이음줄(슬러)은 아직 지원하지 않아요.", "가사는 붙임줄 뒤 음표를 건너뛰고 다음 음표에 붙어요."],
  },
  {
    title: "7. 코드 이름",
    summary: "음표 앞에 [코드]를 적으면 그 음표 위에 코드 이름이 표시됩니다. 띄어 써도 괜찮아요.",
    rules: [
      { write: "[C]도4", mean: "도 위에 C" },
      { write: "[G7] 레4", mean: "띄어 써도 레 위에 G7" },
      { write: "[Am]라2", mean: "단조 코드" },
    ],
    examples: [{ text: "[C]도4 미4 솔4 미4 | [F]파4 라4 높은도4 라4 | [G7]솔4 시4 높은레4 시4 | [C]높은도1 |", caption: "주요 3화음 진행" }],
    tips: ["건반 입력의 ‘코드’ 칸에 C를 적고 건반을 누르면 그 음표에 코드가 붙어요."],
  },
  {
    title: "8. 가사 붙이기",
    summary: "가사 칸에 글자를 띄어쓰기로 나눠 적으면 음표에 차례로 붙습니다. 쉼표와 붙임줄 뒤 음표는 건너뛰어요.",
    rules: [
      { write: "하 나 둘 셋", mean: "음표 하나에 한 덩어리씩" },
      { write: "-", mean: "그 음표에는 가사를 비움" },
      { write: "사 - 랑", mean: "둘째 음표를 비우고 셋째 음표에 ‘랑’" },
    ],
    examples: [{ text: "도4 레4 미4 쉼4 | 솔2~ 솔4 미4 | 도1 |", caption: "가사: 하 나 둘 셋 넷 다 (쉼표·붙임줄은 건너뜀)", settings: { lyrics: "하 나 둘 셋 넷 다" } }],
  },
  {
    title: "9. 조와 이동도법",
    summary: "계이름은 조표의 으뜸음을 ‘도’로 읽는 이동도법을 따릅니다. 그래서 같은 계이름을 적고 조만 바꾸면 악보 전체가 그 조로 옮겨져요.",
    examples: [
      { text: "도4 미4 솔4 높은도4 |", caption: "다장조", settings: { key: "C" } },
      { text: "도4 미4 솔4 높은도4 |", caption: "같은 글을 사장조로", settings: { key: "G" } },
      { text: "라4 도4 미4 높은라4 |", caption: "가단조 · 단조는 ‘라’가 으뜸음", settings: { key: "Am" } },
    ],
    tips: ["음이름(다·라·마)으로 보고 싶으면 악보 위 ‘음이름’ 버튼을 누르세요.", "단조에서는 ‘라’부터 ‘솔’까지가 가운데 옥타브예요. 라4 시4 도4는 위로 올라가요."],
  },
  {
    title: "10. 건반으로 입력하기",
    summary: "문법을 몰라도 버튼만 눌러 입력할 수 있어요. 입력창의 커서 위치에 들어갑니다.",
    steps: [
      "‘음표 길이’에서 4분음표, 8분음표 등을 고릅니다. 필요하면 ‘점음표’를 켭니다.",
      "음이 가운데보다 높거나 낮으면 ‘높은’ 또는 ‘낮은’을 고르고, 반음이면 ‘올림 #’·‘내림 b’를 고릅니다.",
      "코드를 붙이려면 ‘코드’ 칸에 C, G7처럼 적습니다. 다음에 누르는 음표 하나에만 붙어요.",
      "도~시 건반을 누릅니다. 마디가 꽉 차면 | 가 자동으로 붙어요.",
      "틀리면 ‘하나 지우기’로 커서 앞 음표를 지웁니다. 쉼표는 ‘쉼표 넣기’를 누르세요.",
    ],
  },
  {
    title: "자주 하는 실수",
    summary: "오류 안내가 나오면 아래를 먼저 확인해 보세요.",
    mistakes: [
      { wrong: "도 4", right: "도4", why: "계이름과 길이 숫자는 붙여 써요." },
      { wrong: "C4 D4 E4", right: "도4 레4 미4", why: "음은 계이름으로 적어요. 영어 알파벳은 [C]처럼 코드에만 써요." },
      { wrong: "도2 도2 도4 |", right: "도2 도2 | 도4 …", why: "4/4박자에서 5박이 되어 넘쳐요. 마디를 나눠 주세요." },
      { wrong: "[C] |", right: "[C]도4 |", why: "코드 뒤에는 음표가 있어야 해요." },
      { wrong: "솔4 라4 시4 도4 (올라가는 가락)", right: "낮은솔4 낮은라4 낮은시4 도4", why: "가운데 도 아래 음은 ‘낮은’을 붙여요." },
      { wrong: "사장조에서 시#4", right: "사장조에서 시4", why: "조표의 올림은 이미 들어 있어요. 시#은 한 번 더 올린 음이 돼요." },
    ],
  },
];

function Preview({ example }: { example: Example }) {
  const host = useRef<HTMLDivElement>(null);
  const settings = useMemo(() => ({ ...previewSettings, ...example.settings }), [example]);
  const parsed = useMemo(() => parseScore(example.text, settings), [example.text, settings]);
  useEffect(() => {
    if (!host.current) return;
    void renderScore(host.current, parsed, settings, new Set()).catch(() => undefined);
  }, [parsed, settings]);
  return <div ref={host} aria-hidden="true" className="mx-auto w-full max-w-[720px] [&>svg]:block" />;
}

export function MusicScoreGuide({ open, onClose, onAppend, onReplace, hasScore }: {
  open: boolean; onClose: () => void; hasScore: boolean;
  onAppend: (text: string) => void; onReplace: (text: string, settings?: Partial<ScoreSettings>) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState<string | null>(null);
  const lessons = musicGuideLessons;
  const lesson = lessons[index];

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  function go(next: number) {
    setIndex(next);
    setConfirm(null);
    dialog.current?.querySelector("[data-lesson-body]")?.scrollTo({ top: 0 });
  }
  function replace(example: Example, key: string) {
    if (hasScore && confirm !== key) { setConfirm(key); return; }
    onReplace(example.text, { ...example.settings, lyrics: example.settings?.lyrics ?? "" });
    setConfirm(null);
  }

  return (
    <dialog ref={dialog} aria-labelledby="music-guide-title" onClose={onClose}
      className="m-auto h-[min(92dvh,860px)] w-[min(96vw,1120px)] max-w-none overflow-hidden rounded-[20px] border border-line bg-surface p-0 text-ink shadow-[var(--lift-2)] backdrop:bg-[#1c1930]/55">
      <div className="grid h-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[230px_minmax(0,1fr)] md:grid-rows-1">
        <nav aria-label="입력 방법 목차" className="scrollbar-subtle flex gap-1 overflow-x-auto border-b border-line bg-surface-2 p-2 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:p-3">
          <p className="hidden px-2 pb-2 pt-1 text-xs font-bold text-ink-4 md:block">악보 입력 배우기</p>
          {lessons.map((item, i) => <button key={item.title} type="button" aria-current={i === index ? "step" : undefined} onClick={() => go(i)}
            className={cn("shrink-0 rounded-lg px-3 py-2 text-left text-[.82rem] font-semibold transition-colors", i === index ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:bg-surface hover:text-brand-dark")}>{item.title}</button>)}
        </nav>

        <div className="flex min-h-0 min-w-0 flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-7">
            <div>
              <p className="text-xs font-bold text-brand">{index + 1} / {lessons.length}</p>
              <h2 id="music-guide-title" className="mt-1 text-[1.35rem] font-extrabold tracking-[-0.03em]">{lesson.title}</h2>
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="입력 방법 닫기" className="grid size-10 shrink-0 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink"><X size={20} /></button>
          </header>

          <div data-lesson-body className="scrollbar-subtle min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
            <p className="break-keep text-[.95rem] leading-7 text-ink-2">{lesson.summary}</p>

            {lesson.rules && <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-left text-[.88rem]">
                <thead className="bg-surface-2 text-xs text-ink-4"><tr><th className="px-4 py-2 font-bold">이렇게 쓰면</th><th className="px-4 py-2 font-bold">이런 뜻이에요</th></tr></thead>
                <tbody>{lesson.rules.map(rule => <tr key={rule.write} className="border-t border-line"><td className="whitespace-nowrap px-4 py-2.5 font-mono font-bold text-brand-dark">{rule.write}</td><td className="px-4 py-2.5 text-ink-2">{rule.mean}</td></tr>)}</tbody>
              </table>
            </div>}

            {lesson.steps && <ol className="space-y-2">{lesson.steps.map((step, i) => <li key={step} className="flex gap-3 rounded-xl bg-surface-2 px-4 py-3 text-[.9rem] leading-6 text-ink-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>{step}</li>)}</ol>}

            {lesson.examples?.map((example, i) => {
              const key = `${index}:${i}`;
              return <section key={key} className="overflow-hidden rounded-xl border border-brand/15">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-brand-page px-4 py-2.5">
                  <p className="text-xs font-bold text-brand-dark">{example.caption ?? "예시"}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => onAppend(example.text)}><CornerDownLeft size={14} /> 입력창에 이어 붙이기</Button>
                    <Button variant={confirm === key ? "danger" : "secondary"} size="sm" onClick={() => replace(example, key)}><FilePlus2 size={14} /> {confirm === key ? "지금 악보가 바뀌어요. 한 번 더 누르기" : "이 예시로 새로 시작"}</Button>
                  </div>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-keep border-b border-line bg-surface-2 px-4 py-3 font-mono text-[.92rem] leading-7 text-ink">{example.text}</pre>
                {example.settings?.lyrics && <p className="border-b border-line bg-surface-2 px-4 py-2 text-xs text-ink-3">가사 칸: <span className="font-mono text-ink">{example.settings.lyrics}</span></p>}
                <div className="bg-white p-3"><Preview example={example} /></div>
              </section>;
            })}

            {lesson.mistakes && <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-[#9a5143]"><TriangleAlert size={15} /> 이렇게 쓰면 안 돼요</h3>
              {lesson.mistakes.map(item => <div key={item.wrong} className="grid gap-1 rounded-xl border border-[#ecd6d1] bg-[#fff7f5] px-4 py-3 text-[.86rem] sm:grid-cols-[1fr_1fr]">
                <p><span className="mr-1.5 text-xs font-bold text-[#9a5143]">✕</span><span className="font-mono">{item.wrong}</span></p>
                <p><span className="mr-1.5 text-xs font-bold text-ok">○</span><span className="font-mono font-semibold">{item.right}</span></p>
                <p className="text-xs leading-5 text-ink-3 sm:col-span-2">{item.why}</p>
              </div>)}
            </div>}

            {lesson.tips && <ul className="space-y-1.5 rounded-xl border border-[#eadfb8] bg-[#fffaf0] px-4 py-3">
              {lesson.tips.map(tip => <li key={tip} className="flex gap-2 text-[.86rem] leading-6 text-ink-2"><Lightbulb size={15} className="mt-1 shrink-0 text-[#806426]" />{tip}</li>)}
            </ul>}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-line px-5 py-3 sm:px-7">
            <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => go(index - 1)}><ArrowLeft size={15} /> 이전</Button>
            {index < lessons.length - 1
              ? <Button size="sm" onClick={() => go(index + 1)} className="min-w-0"><span className="truncate">다음<span className="hidden sm:inline">: {lessons[index + 1].title}</span></span> <ArrowRight size={15} className="shrink-0" /></Button>
              : <Button size="sm" onClick={() => dialog.current?.close()}>악보 만들러 가기</Button>}
          </footer>
        </div>
      </div>
    </dialog>
  );
}
