"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { ClipboardCheck, Copy, Flower2, Grid3x3, ListChecks, LoaderCircle, MonitorPlay, PenLine, Printer, ShieldCheck, Shuffle, Table2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KANA_ROWS, rowsOfGroup, selectedItems, strokeCount, wordsFor, type KanaGroup, type KanaSelection } from "@/features/japanese/kana";
import {
  blankModes, buildKanaQuiz, kanaChartHtml, kanaChartText, kanaPracticeHtml, kanaPracticeSizes, kanaQuizHtml, kanaQuizText, kanaQuizTypeKeys, kanaQuizTypes, quizCounts, rowKeysOf,
  type BlankMode, type KanaPracticeSize, type KanaQuizType,
} from "@/features/japanese/kana-sheet";
import { Card, Segmented, Toggle } from "./tool-panel";
import { copyToClipboard, PrintablePage } from "./hanmun-sheet";
import { KanaFlash } from "./japanese-kana-flash";
import { speechNotice, useJapaneseSpeech } from "./japanese-speech";
import { StrokeOrder } from "./japanese-strokes";

type View = "chart" | "practice" | "quiz";

// 고른 글자와 학습지 설정은 이 브라우저에만 저장합니다.
const storageKey = "learncraft_japanese_kana_v1";
const rowKeys = KANA_ROWS.map(row => row.key) as [string, ...string[]];
const storedSchema = z.object({
  title: z.string().max(100).catch(""),
  selection: z.object({
    script: z.enum(["hira", "kata", "both"]).catch("hira"),
    rows: z.array(z.enum(rowKeys)).catch(rowKeysOf(["seion"])),
    confusable: z.boolean().catch(false),
  }).catch({ script: "hira", rows: rowKeysOf(["seion"]), confusable: false }),
  view: z.enum(["chart", "practice", "quiz"]).catch("chart"),
  chart: z.object({ romaji: z.boolean().catch(true), korean: z.boolean().catch(true), blanks: z.enum(["none", "some", "all"]).catch("none"), seed: z.number().int().catch(1), answers: z.boolean().catch(true) })
    .catch({ romaji: true, korean: true, blanks: "none", seed: 1, answers: true }),
  practice: z.object({ size: z.enum(["normal", "large"]).catch("normal"), trace: z.number().int().min(0).max(9).catch(3), steps: z.boolean().catch(true) }).catch({ size: "normal", trace: 3, steps: true }),
  quiz: z.object({
    types: z.array(z.enum(kanaQuizTypeKeys as [KanaQuizType, ...KanaQuizType[]])).catch(["read", "write"]),
    count: z.number().int().catch(20), shuffle: z.boolean().catch(true), seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ types: ["read", "write"], count: 20, shuffle: true, seed: 1, answers: true }),
});
type Stored = z.infer<typeof storedSchema>;
function readStored(): Stored {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return storedSchema.parse(saved ? JSON.parse(saved) : {});
  } catch {
    return storedSchema.parse({});
  }
}
const noop = () => () => {};

export function JapaneseKanaLab({ tabs }: { tabs?: React.ReactNode }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? <KanaEditor initial={readStored()} tabs={tabs} /> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 가나 학습 도구를 준비하는 중…</div>;
}

const groupSections: { label: string; groups: KanaGroup[] }[] = [
  { label: "청음", groups: ["seion"] },
  { label: "탁음 · 반탁음", groups: ["dakuon", "handakuon"] },
  { label: "요음", groups: ["yoon"] },
];
const fieldClass = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-ink-5 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
const chipClass = (active: boolean) => cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-[.82rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand",
  active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark");
const tabClass = (active: boolean) => cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", active ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark");

function KanaEditor({ initial, tabs }: { initial: Stored; tabs?: React.ReactNode }) {
  const [title, setTitle] = useState(initial.title);
  const [selection, setSelection] = useState<KanaSelection>(initial.selection);
  const [view, setView] = useState<View>(initial.view);
  const [chart, setChart] = useState(initial.chart);
  const [practice, setPractice] = useState(initial.practice);
  const [quiz, setQuiz] = useState(initial.quiz);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);
  const [preview, setPreview] = useState<{ char: string; play: number } | null>(null);
  const closeFlash = useCallback(() => setFlash(false), []);
  const { supported, hasVoice, speak } = useJapaneseSpeech();

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ title, selection, view, chart, practice, quiz })); } catch { /* 저장하지 못해도 이번 화면에서는 계속 쓸 수 있습니다. */ }
  }, [title, selection, view, chart, practice, quiz]);

  const items = selectedItems(selection);
  const shownScript = selection.script === "kata" ? "kata" : "hira";
  const toggleRow = (key: string) => setSelection(current => ({ ...current, rows: current.rows.includes(key) ? current.rows.filter(item => item !== key) : [...current.rows, key] }));
  const setGroups = (groups: KanaGroup[], on: boolean) => setSelection(current => {
    const keys = rowKeysOf(groups);
    return { ...current, rows: on ? [...new Set([...current.rows, ...keys])] : current.rows.filter(key => !keys.includes(key)) };
  });
  const quizSections = buildKanaQuiz(items, quiz);
  const quizOptions = { title, answers: quiz.answers };
  const chartOptions = { title, script: selection.script, rows: selection.rows, ...chart };
  const cells = kanaPracticeSizes[practice.size].cells;
  const words = wordsFor(items).length;

  async function copy(text: string, html: string) {
    await copyToClipboard({ text, html });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  // 50음도 표의 칸을 누르면 그 가나를 읽어 줍니다.
  const sayFrom = (event: React.MouseEvent) => {
    const kana = (event.target as HTMLElement).closest("[data-say]")?.getAttribute("data-say");
    if (kana) speak(kana);
  };
  const notice = speechNotice(supported, hasVoice);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><Flower2 size={16} /> 교사 지원실 · 일본어</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">가나 50음도 · 쓰기 연습지 · 가나 퀴즈</h1>
          <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3 lg:min-h-12 xl:min-h-6">히라가나·가타카나에서 배울 행을 고르면 50음도 표, 획순이 들어간 쓰기 연습지, 가나 퀴즈를 바로 인쇄할 수 있어요. 수업 시간에는 플래시 카드로 한 글자씩 띄우고 소리와 획순을 보여 줍니다.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
      </header>
      {tabs}

      <section className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4">
          <Card title={`글자 고르기 · ${items.length}자`} help="고른 행의 글자로 표·연습지·퀴즈·플래시 카드를 만듭니다. ‘둘 다’를 고르면 히라가나 다음에 가타카나가 이어집니다.">
            <div className="space-y-3">
              <Segmented label="문자" value={selection.script} onChange={script => setSelection(current => ({ ...current, script }))}
                options={[{ value: "hira", label: "히라가나" }, { value: "kata", label: "가타카나" }, { value: "both", label: "둘 다" }]} />
              {groupSections.map(section => {
                const rows = section.groups.flatMap(rowsOfGroup);
                const all = rows.every(row => selection.rows.includes(row.key));
                return (
                  <div key={section.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[.76rem] font-bold text-ink-3">{section.label}</p>
                      <button type="button" onClick={() => setGroups(section.groups, !all)} className="rounded-lg px-2 py-0.5 text-[.72rem] font-bold text-ink-4 hover:bg-brand-page hover:text-brand-dark">{all ? "모두 빼기" : "모두 넣기"}</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rows.map(row => (
                        <button key={row.key} type="button" aria-pressed={selection.rows.includes(row.key)} onClick={() => toggleRow(row.key)} title={row.cells.filter(Boolean).map(cell => cell![shownScript]).join(" ")}
                          className={cn(chipClass(selection.rows.includes(row.key)), "min-w-11 px-2")}>
                          <span lang="ja" className="font-ja text-[.95rem]">{row.key === "n" ? row.cells[0]![shownScript] : row.cells.find(Boolean)![shownScript]}</span>{row.key !== "n" && <span className="text-[.7rem]">행</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-line pt-1.5">
                <Toggle label="헷갈리는 글자 넣기" checked={selection.confusable} onChange={confusable => setSelection(current => ({ ...current, confusable }))}
                  help="シ·ツ, ソ·ン, ぬ·め, わ·ね·れ처럼 헷갈리기 쉬운 글자를 구별하는 방법과 함께 넣습니다. 쓰기 연습지와 플래시 카드에 구별법이 나와요." />
              </div>
            </div>
          </Card>
          <Card title="학습지 제목">
            <input value={title} maxLength={100} onChange={event => setTitle(event.target.value)} placeholder="예: 히라가나 あ~な행 익히기" className={fieldClass} />
          </Card>
          {notice && <p role="status" className="rounded-xl border border-warn/25 bg-[var(--warn-page)] px-3.5 py-2.5 text-[.76rem] font-semibold leading-5 text-warn">{notice}</p>}
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <nav aria-label="가나 학습지 보기" className="flex w-fit flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
              <button type="button" aria-pressed={view === "chart"} onClick={() => setView("chart")} className={tabClass(view === "chart")}><Table2 size={16} /> 50음도 표</button>
              <button type="button" aria-pressed={view === "practice"} onClick={() => setView("practice")} className={tabClass(view === "practice")}><Grid3x3 size={16} /> 쓰기 연습지</button>
              <button type="button" aria-pressed={view === "quiz"} onClick={() => setView("quiz")} className={tabClass(view === "quiz")}><ListChecks size={16} /> 가나 퀴즈</button>
            </nav>
            <Button variant="secondary" size="sm" disabled={!items.length} onClick={() => setFlash(true)} title="가나를 한 글자씩 크게 띄우고 소리·획순을 보여 줘요"><MonitorPlay size={15} /> 플래시 카드</Button>
          </div>

          {!items.length ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-8 text-center text-[.9rem] text-ink-3">
              <Flower2 size={24} className="text-brand" />
              <ol className="grid w-full max-w-3xl gap-2 text-left sm:grid-cols-3">
                {[
                  ["행 고르기", "왼쪽에서 히라가나·가타카나와 배울 행을 골라요. 헷갈리는 글자만 모아 연습할 수도 있어요."],
                  ["인쇄하기", "50음도 표(빈칸 채우기), 획순이 들어간 쓰기 연습지, 가나 퀴즈를 A4로 인쇄하거나 한글에 붙여 넣어요."],
                  ["수업 화면", "‘플래시 카드’로 한 글자씩 띄우고 Space로 발음을, G로 획순을 보여 줘요."],
                ].map(([heading, body], index) => (
                  <li key={heading} className="rounded-xl bg-surface p-3.5 shadow-[var(--lift-1)]">
                    <p className="flex items-center gap-2 font-bold text-ink"><span className="grid size-6 place-items-center rounded-full bg-brand-soft text-[.75rem] text-brand-dark">{index + 1}</span>{heading}</p>
                    <p className="mt-1.5 break-keep text-[.82rem] leading-6">{body}</p>
                  </li>
                ))}
              </ol>
              <Button variant="secondary" size="sm" onClick={() => setGroups(["seion"], true)}><Flower2 size={15} /> 청음 46자 넣기</Button>
            </div>
          ) : view === "chart" ? (
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
              <div className="space-y-4">
                <Card title="표 설정">
                  <Toggle label="로마자 표시" checked={chart.romaji} onChange={romaji => setChart({ ...chart, romaji })} />
                  <Toggle label="한글 발음 표시" checked={chart.korean} onChange={korean => setChart({ ...chart, korean })} help="한글 표기는 발음을 돕는 참고용이에요(か 카, つ 츠, ん 응)." />
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-semibold text-ink-4">빈칸 학습지</p>
                    <Segmented label="빈칸" value={chart.blanks} onChange={blanks => setChart({ ...chart, blanks: blanks as BlankMode })} options={(Object.keys(blankModes) as BlankMode[]).map(mode => ({ value: mode, label: blankModes[mode] }))} />
                  </div>
                  {chart.blanks !== "none" && <>
                    <Toggle label="정답지 붙이기" checked={chart.answers} onChange={answers => setChart({ ...chart, answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
                    {chart.blanks === "some" && <Button variant="ghost" size="sm" className="mt-1" onClick={() => setChart({ ...chart, seed: chart.seed + 1 })}><Shuffle size={14} /> 빈칸 다시 고르기</Button>}
                  </>}
                </Card>
                <p className="flex items-start gap-1.5 px-1 text-[.76rem] leading-5 text-ink-4"><Volume2 size={14} className="mt-0.5 shrink-0" /> 표의 칸을 누르면 발음을 들을 수 있어요.</p>
              </div>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button variant="secondary" size="sm" disabled={!selection.rows.length} onClick={() => void copy(kanaChartText(chartOptions), kanaChartHtml(chartOptions, "clipboard"))} title="한글·워드에 붙여 넣을 수 있게 복사해요">{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "한글에 붙여 넣기용 복사"}</Button>
                  <Button variant="secondary" size="sm" disabled={!selection.rows.length} onClick={() => window.print()} title="A4 세로로 인쇄해요"><Printer size={15} /> 인쇄</Button>
                </div>
                {selection.rows.length
                  ? <div onClick={sayFrom}><PrintablePage id="kana-chart-print" html={kanaChartHtml(chartOptions, "screen")} /></div>
                  : <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-16 text-center text-[.9rem] text-ink-3">50음도 표는 고른 행으로 만들어요. 왼쪽에서 행을 골라 주세요.</p>}
              </div>
            </div>
          ) : view === "practice" ? (
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
              <div className="space-y-4">
                <Card title="쓰기 칸">
                  <div className="space-y-3">
                    <Segmented label="칸 크기" value={practice.size} onChange={size => setPractice({ ...practice, size: size as KanaPracticeSize, trace: Math.min(practice.trace, kanaPracticeSizes[size as KanaPracticeSize].cells) })}
                      options={(Object.keys(kanaPracticeSizes) as KanaPracticeSize[]).map(size => ({ value: size, label: `${kanaPracticeSizes[size].label} (${kanaPracticeSizes[size].cells}칸)` }))} />
                    <div>
                      <p className="mb-1 text-xs font-semibold text-ink-4">따라 쓰기 칸 (연한 글자)</p>
                      <Segmented label="따라 쓰기 칸" value={practice.trace} onChange={trace => setPractice({ ...practice, trace })} options={[0, 1, 2, 3, cells].map(value => ({ value, label: value === cells ? "모두" : `${value}칸` }))} />
                    </div>
                    <Toggle label="획순 그림 넣기" checked={practice.steps} onChange={steps => setPractice({ ...practice, steps })} help="한 획씩 더해 가는 그림을 줄 아래에 넣습니다. 요음은 획순 그림이 없어요." />
                  </div>
                </Card>
                <Card title="획순 미리 보기" help="글자를 누르면 획순을 한 획씩 그려 보여 줘요.">
                  <div className="flex flex-wrap gap-1">
                    {items.filter(item => strokeCount(item.char)).slice(0, 60).map(item => (
                      <button key={`${item.script}-${item.char}`} type="button" onClick={() => setPreview(current => ({ char: item.char, play: (current?.play ?? 0) + 1 }))}
                        className={cn("font-ja grid size-9 place-items-center rounded-lg border text-[1.1rem]", preview?.char === item.char ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface hover:bg-brand-page")} lang="ja">{item.char}</button>
                    ))}
                  </div>
                  {preview && <div className="mt-3 flex items-center gap-3"><StrokeOrder char={preview.char} play={preview.play} className="size-28 text-ink" /><p className="text-[.8rem] text-ink-3">{strokeCount(preview.char)}획<br /><button type="button" onClick={() => setPreview({ ...preview, play: preview.play + 1 })} className="mt-1 font-bold text-brand-dark hover:underline"><PenLine size={13} className="mr-1 inline" />다시 그리기</button></p></div>}
                </Card>
              </div>
              <div className="min-w-0 space-y-3">
                <div className="flex justify-end"><Button variant="secondary" size="sm" onClick={() => window.print()} title="A4 세로로 인쇄해요"><Printer size={15} /> 인쇄</Button></div>
                <PrintablePage id="kana-practice-print" html={kanaPracticeHtml(items, { title, ...practice })} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
              <Card title="문항 유형" help={`낱말 읽기는 고른 글자만으로 된 낱말(지금 ${words}개)로 만들어요. 촉음(っ)·장음(ー)이 든 낱말은 넣지 않았어요.`}>
                <div className="flex flex-wrap gap-1.5">
                  {kanaQuizTypeKeys.map(type => <button key={type} type="button" aria-pressed={quiz.types.includes(type)} onClick={() => setQuiz(current => ({ ...current, types: current.types.includes(type) ? current.types.filter(item => item !== type) : [...current.types, type] }))} className={chipClass(quiz.types.includes(type))}>{kanaQuizTypes[type].label}</button>)}
                </div>
                <div className="mt-3 space-y-2 border-t border-line pt-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-ink-4">유형마다 문항 수</p>
                    <Segmented label="문항 수" value={quiz.count} onChange={count => setQuiz({ ...quiz, count })} options={quizCounts.map(count => ({ value: count, label: count ? `${count}개` : "모두" }))} />
                  </div>
                  <Toggle label="순서 섞기" checked={quiz.shuffle} onChange={shuffle => setQuiz({ ...quiz, shuffle })} help="끄면 50음도 순서대로 앞에서부터 냅니다." />
                  <Toggle label="정답지 붙이기" checked={quiz.answers} onChange={answers => setQuiz({ ...quiz, answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
                  {quiz.shuffle && <Button variant="ghost" size="sm" onClick={() => setQuiz({ ...quiz, seed: quiz.seed + 1 })}><Shuffle size={14} /> 다시 섞기</Button>}
                </div>
              </Card>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button variant="secondary" size="sm" disabled={!quizSections.length} onClick={() => void copy(kanaQuizText(quizSections, quizOptions), kanaQuizHtml(quizSections, quizOptions, "clipboard"))} title="한글·워드에 붙여 넣을 수 있게 복사해요">{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "한글에 붙여 넣기용 복사"}</Button>
                  <Button variant="secondary" size="sm" disabled={!quizSections.length} onClick={() => window.print()}><Printer size={15} /> 인쇄</Button>
                </div>
                {quizSections.length
                  ? <PrintablePage id="kana-quiz-print" html={kanaQuizHtml(quizSections, quizOptions, "screen")} />
                  : <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-16 text-center text-[.9rem] text-ink-3">문항 유형을 골라 주세요. 낱말 읽기는 고른 글자로 된 낱말이 있어야 만들어져요.</p>}
              </div>
            </div>
          )}
        </div>
      </section>
      {flash && <KanaFlash items={items} speak={speak} onClose={closeFlash} />}
    </div>
  );
}
