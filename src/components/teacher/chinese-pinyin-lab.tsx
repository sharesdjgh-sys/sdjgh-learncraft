"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { ClipboardCheck, Copy, Lamp, ListChecks, LoaderCircle, MonitorPlay, Music2, Printer, Repeat, ShieldCheck, Shuffle, Table2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { applySandhi, FINALS, finalGroups, INITIALS, markTone, SANDHI_WORDS, syllableChar, syllables, toneInfo, type Tone } from "@/features/chinese/pinyin";
import {
  allInitialGroups, blankModes, buildPinyinQuiz, listeningCards, pinyinChartHtml, pinyinChartText, pinyinQuizHtml, pinyinQuizText, pinyinQuizTypeKeys, pinyinQuizTypes,
  syllableTableHtml, TONE_EXAMPLE, ZERO_INITIAL, type BlankMode, type PinyinQuizType, type PinyinSelection,
} from "@/features/chinese/pinyin-sheet";
import { Card, Segmented, Toggle } from "./tool-panel";
import { copyToClipboard, PrintablePage } from "./hanmun-sheet";
import { ToneContour, ToneFlash } from "./chinese-tone-flash";
import { speechNotice, useSpeech } from "./speech";

type View = "chart" | "table" | "sandhi" | "quiz";

// 고른 성모·운모와 학습지 설정은 이 브라우저에만 저장합니다.
const storageKey = "learncraft_chinese_pinyin_v1";
const storedSchema = z.object({
  title: z.string().max(100).catch(""),
  selection: z.object({
    initials: z.array(z.enum(allInitialGroups as [string, ...string[]])).catch(["쌍순음", "순치음", "설첨중음", "설근음"]),
    finals: z.array(z.enum(finalGroups as unknown as [string, ...string[]])).catch(["단운모", "복운모"]),
  }).catch({ initials: ["쌍순음", "순치음", "설첨중음", "설근음"], finals: ["단운모", "복운모"] }),
  view: z.enum(["chart", "table", "sandhi", "quiz"]).catch("chart"),
  table: z.object({ blanks: z.enum(["none", "some", "all"]).catch("none"), seed: z.number().int().catch(1), answers: z.boolean().catch(true) }).catch({ blanks: "none", seed: 1, answers: true }),
  quiz: z.object({
    types: z.array(z.enum(pinyinQuizTypeKeys as [PinyinQuizType, ...PinyinQuizType[]])).catch(["toneMark", "toneNumber"]),
    count: z.number().int().catch(12), shuffle: z.boolean().catch(true), seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ types: ["toneMark", "toneNumber"], count: 12, shuffle: true, seed: 1, answers: true }),
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

// 성모는 가르칠 때 붙여 읽는 음절(bo·po·mo·fo, de·te·ne·le, ji·qi·xi, zhi·chi·shi·ri, zi·ci·si)로 소리를 냅니다.
const INITIAL_SOUNDS: Record<string, string> = { b: "bō", p: "pō", m: "mō", f: "fó", d: "dé", t: "tè", n: "nè", l: "lè", g: "gē", k: "kē", h: "hē", j: "jī", q: "qī", x: "xī", zh: "zhī", ch: "chī", sh: "shī", r: "rì", z: "zī", c: "cī", s: "sī" };
const finalSound = (key: string, zero?: string) => {
  const base = key === "-i" ? "" : zero ?? key;
  return base ? syllableChar(markTone(base, 1)) ?? syllableChar(markTone(base, 4)) ?? syllableChar(markTone(base, 2)) : undefined;
};

export function ChinesePinyinLab({ tabs }: { tabs?: React.ReactNode }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? <PinyinEditor initial={readStored()} tabs={tabs} /> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 병음 학습 도구를 준비하는 중…</div>;
}

const chipClass = (active: boolean) => cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-left text-[.8rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand",
  active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark");
const tabClass = (active: boolean) => cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", active ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark");
const fieldClass = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-ink-5 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";

function PinyinEditor({ initial, tabs }: { initial: Stored; tabs?: React.ReactNode }) {
  const [title, setTitle] = useState(initial.title);
  const [selection, setSelection] = useState<PinyinSelection>(initial.selection);
  const [view, setView] = useState<View>(initial.view);
  const [table, setTable] = useState(initial.table);
  const [quiz, setQuiz] = useState(initial.quiz);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const closeFlash = useCallback(() => setFlash(false), []);
  const { supported, hasVoice, speak } = useSpeech("zh-CN");

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ title, selection, view, table, quiz })); } catch { /* 저장하지 못해도 이번 화면에서는 계속 쓸 수 있습니다. */ }
  }, [title, selection, view, table, quiz]);

  const toggle = (key: "initials" | "finals", group: string) => setSelection(current => ({ ...current, [key]: current[key].includes(group) ? current[key].filter(item => item !== group) : [...current[key], group] }));
  const cards = listeningCards(selection);
  const quizSections = buildPinyinQuiz(selection, quiz);
  const quizOptions = { title, answers: quiz.answers };
  const tableOptions = { title, selection, ...table };
  const notice = speechNotice(supported, hasVoice, "zh-CN");
  const say = (char?: string) => { if (char) speak(char, 0.75); };

  async function copy(text: string, html: string) {
    await copyToClipboard({ text, html });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  // 음절표 칸을 누르면 그 음절의 성조별 글자를 보여 주고 소리를 들려줍니다.
  const pickFrom = (event: React.MouseEvent) => {
    const base = (event.target as HTMLElement).closest("[data-say]")?.getAttribute("data-say");
    if (!base) return;
    setPicked(base);
    say(syllables().get(base)?.find(item => item.tone && !item.rare)?.char);
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><Lamp size={16} /> 교사 지원실 · 중국어</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">한어병음 · 성조 · 음절표 · 병음 퀴즈</h1>
          <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3 lg:min-h-12 xl:min-h-6">성모·운모·성조를 소리와 함께 보여 주고, 음절표(빈칸 학습지)와 성조 변화, 병음 퀴즈를 바로 인쇄할 수 있어요. 수업 시간에는 ‘성조 듣기’로 소리만 들려주고 몇 성인지 맞히게 합니다.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
      </header>
      {tabs}

      <section className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4">
          <Card title="성모 고르기" help="음절표·퀴즈·성조 듣기에 쓸 성모 묶음을 골라요. 영성모는 성모 없이 y·w로 쓰는 음절입니다.">
            <div className="grid grid-cols-2 gap-1">
              {allInitialGroups.map(group => (
                <button key={group} type="button" aria-pressed={selection.initials.includes(group)} onClick={() => toggle("initials", group)} className={chipClass(selection.initials.includes(group))}>
                  <span className="block">{group}</span>
                  <span className="block text-[.72rem] font-bold opacity-75">{group === ZERO_INITIAL ? "y · w" : INITIALS.filter(initial => initial.group === group).map(initial => initial.key).join(" ")}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card title="운모 고르기">
            <div className="grid grid-cols-2 gap-1">
              {finalGroups.map(group => (
                <button key={group} type="button" aria-pressed={selection.finals.includes(group)} onClick={() => toggle("finals", group)} className={chipClass(selection.finals.includes(group))}>
                  <span className="block">{group}</span>
                  <span className="block truncate text-[.72rem] font-bold opacity-75">{FINALS.filter(final => final.group === group).map(final => final.key).join(" ")}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[.74rem] text-ink-4">고른 음절 {new Set(cards.map(card => card.base)).size}개 · 성조까지 {cards.length}개</p>
          </Card>
          <Card title="학습지 제목">
            <input value={title} maxLength={100} onChange={event => setTitle(event.target.value)} placeholder="예: 성모 b p m f 익히기" className={fieldClass} />
          </Card>
          {notice && <p role="status" className="rounded-xl border border-warn/25 bg-[var(--warn-page)] px-3.5 py-2.5 text-[.76rem] font-semibold leading-5 text-warn">{notice}</p>}
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <nav aria-label="병음 학습 보기" className="flex w-fit flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
              <button type="button" aria-pressed={view === "chart"} onClick={() => setView("chart")} className={tabClass(view === "chart")}><Music2 size={16} /> 성모·운모·성조</button>
              <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")} className={tabClass(view === "table")}><Table2 size={16} /> 음절표</button>
              <button type="button" aria-pressed={view === "sandhi"} onClick={() => setView("sandhi")} className={tabClass(view === "sandhi")}><Repeat size={16} /> 성조 변화</button>
              <button type="button" aria-pressed={view === "quiz"} onClick={() => setView("quiz")} className={tabClass(view === "quiz")}><ListChecks size={16} /> 병음 퀴즈</button>
            </nav>
            <Button variant="secondary" size="sm" disabled={!cards.length} onClick={() => setFlash(true)} title="소리만 들려주고 몇 성인지 맞히게 해요"><MonitorPlay size={15} /> 성조 듣기</Button>
          </div>

          {view === "chart" ? (
            <div className="space-y-4">
              <section className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
                <h2 className="mb-3 text-sm font-extrabold text-ink">성조 <span className="text-xs font-semibold text-ink-4">누르면 들려줘요</span></h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {([1, 2, 3, 4, 0] as Tone[]).map((tone, index) => {
                    const char = syllables().get("ma")?.find(item => item.tone === tone)?.char;
                    return (
                      <button key={tone} type="button" onClick={() => say(char)} className="rounded-2xl border border-line bg-surface-2 p-3 text-left hover:border-brand/30 hover:bg-brand-page" title={toneInfo[tone].tip}>
                        <span className="flex items-center justify-between"><b className="text-[.95rem] text-brand-dark">{toneInfo[tone].name}</b><span className="text-[.72rem] text-ink-4">{toneInfo[tone].pitch}</span></span>
                        <ToneContour tone={tone} className="my-1 h-12 w-full text-ink" />
                        <span className="text-[1.3rem] font-extrabold text-ink">{TONE_EXAMPLE[index]}</span> <span lang="zh-CN" className="font-zh text-[1.2rem]">{char}</span>
                        <span className="mt-1 block break-keep text-[.72rem] leading-5 text-ink-3">{toneInfo[tone].tip}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
                <h2 className="mb-3 text-sm font-extrabold text-ink">성모 21개 <span className="text-xs font-semibold text-ink-4">누르면 bo·po·mo·fo처럼 붙여 읽는 소리를 들려줘요</span></h2>
                <div className="space-y-2">
                  {[...new Set(INITIALS.map(initial => initial.group))].map(group => (
                    <div key={group} className="grid gap-2 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-start">
                      <p className="pt-2 text-[.78rem] font-bold text-ink-3">{group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {INITIALS.filter(initial => initial.group === group).map(initial => (
                          <button key={initial.key} type="button" onClick={() => say(syllableChar(INITIAL_SOUNDS[initial.key]))} title={initial.tip} className="min-w-[4.5rem] rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-left hover:border-brand/30 hover:bg-brand-page">
                            <b className="text-[1.3rem] text-ink">{initial.key}</b> <span className="text-[.74rem] text-ink-4">{INITIAL_SOUNDS[initial.key]}</span>
                            <span className="block max-w-[14rem] break-keep text-[.7rem] leading-4 text-ink-3">{initial.tip}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
                <h2 className="mb-3 text-sm font-extrabold text-ink">운모 <span className="text-xs font-semibold text-ink-4">괄호는 성모 없이 쓸 때 · 누르면 들려줘요</span></h2>
                <div className="space-y-2">
                  {finalGroups.map(group => (
                    <div key={group} className="grid gap-2 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-start">
                      <p className="pt-2 text-[.78rem] font-bold text-ink-3">{group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {FINALS.filter(final => final.group === group).map(final => {
                          const char = finalSound(final.key, final.zero);
                          return (
                            <button key={final.key} type="button" disabled={!char} onClick={() => say(char)} title={final.tip} className="rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-left hover:border-brand/30 hover:bg-brand-page disabled:cursor-default disabled:hover:border-line disabled:hover:bg-surface-2">
                              <b className="text-[1.15rem] text-ink">{final.key}</b>{final.zero && <span className="ml-1 text-[.74rem] text-ink-4">({final.zero})</span>}
                              {final.tip && <span className="block max-w-[15rem] break-keep text-[.7rem] leading-4 text-ink-3">{final.tip}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <div className="flex flex-wrap justify-end gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => void copy(pinyinChartText(title), pinyinChartHtml(title, "clipboard"))} title="한글·워드에 붙여 넣을 수 있게 복사해요">{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "한글에 붙여 넣기용 복사"}</Button>
                <Button variant="secondary" size="sm" onClick={() => window.print()} title="A4 세로로 인쇄해요"><Printer size={15} /> 정리표 인쇄</Button>
              </div>
              <PrintablePage id="pinyin-chart-print" html={pinyinChartHtml(title, "screen")} />
            </div>
          ) : view === "table" ? (
            <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
              <div className="space-y-4">
                <Card title="빈칸 학습지">
                  <Segmented label="빈칸" value={table.blanks} onChange={blanks => setTable({ ...table, blanks: blanks as BlankMode })} options={(Object.keys(blankModes) as BlankMode[]).map(mode => ({ value: mode, label: blankModes[mode] }))} />
                  {table.blanks !== "none" && <>
                    <Toggle label="정답지 붙이기" checked={table.answers} onChange={answers => setTable({ ...table, answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
                    {table.blanks === "some" && <Button variant="ghost" size="sm" className="mt-1" onClick={() => setTable({ ...table, seed: table.seed + 1 })}><Shuffle size={14} /> 빈칸 다시 고르기</Button>}
                  </>}
                </Card>
                {picked && (
                  <Card title={`음절 ${picked}`}>
                    <div className="flex flex-wrap gap-1.5">
                      {syllables().get(picked)?.filter(item => item.tone).map(item => (
                        <button key={item.marked} type="button" onClick={() => say(item.char)} className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-center hover:border-brand/30 hover:bg-brand-page" title={item.rare ? "자주 쓰지 않는 글자예요" : undefined}>
                          <b className="block text-[1.1rem]">{item.marked}</b><span lang="zh-CN" className="font-zh text-[1.3rem]">{item.char}</span>
                        </button>
                      ))}
                    </div>
                  </Card>
                )}
                <p className="flex items-start gap-1.5 px-1 text-[.76rem] leading-5 text-ink-4"><Volume2 size={14} className="mt-0.5 shrink-0" /> 음절 칸을 누르면 성조별 글자를 보여 주고 소리를 들려줘요. 회색 칸은 쓰지 않는 음절입니다.</p>
              </div>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button variant="secondary" size="sm" disabled={!selection.initials.length || !selection.finals.length} onClick={() => window.print()} title="A4 세로로 인쇄해요"><Printer size={15} /> 인쇄</Button>
                </div>
                {selection.initials.length && selection.finals.length
                  ? <div onClick={pickFrom}><PrintablePage id="pinyin-table-print" html={syllableTableHtml(tableOptions, "screen")} /></div>
                  : <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-16 text-center text-[.9rem] text-ink-3">왼쪽에서 성모와 운모를 하나 이상 골라 주세요.</p>}
              </div>
            </div>
          ) : view === "sandhi" ? (
            <div className="space-y-4">
              <ul className="grid gap-2 rounded-[18px] border border-line bg-surface p-4 text-[.86rem] leading-6 shadow-[var(--lift-1)] md:grid-cols-3">
                <li className="break-keep"><b className="mr-1.5 text-brand-dark">3성 + 3성</b>앞의 3성을 2성으로 읽습니다. 你好 nǐ hǎo → ní hǎo</li>
                <li className="break-keep"><b className="mr-1.5 text-brand-dark">不 bù</b>4성 앞에서 bú로 읽습니다. 不是 bú shì, 不去 bú qù</li>
                <li className="break-keep"><b className="mr-1.5 text-brand-dark">一 yī</b>4성 앞에서 yí, 1·2·3성 앞에서 yì. 순서·숫자 끝에서는 yī(第一, 十一)</li>
              </ul>
              <div className="overflow-x-auto rounded-[18px] border border-line bg-surface shadow-[var(--lift-1)]">
                <table className="w-full min-w-[34rem] border-collapse text-left">
                  <thead><tr className="bg-surface-2 text-[.78rem] text-ink-3"><th className="px-3 py-2.5">낱말</th><th className="px-3 py-2.5">사전 성조</th><th className="px-3 py-2.5">실제 발음</th><th className="px-3 py-2.5">규칙</th></tr></thead>
                  <tbody>
                    {SANDHI_WORDS.map(([word, pinyin, meaning]) => {
                      const result = applySandhi(pinyin.split(" "), [...word]);
                      return (
                        <tr key={word} className="border-t border-line">
                          <td className="px-3 py-2"><button type="button" onClick={() => say(word)} className="text-left" title="소리 듣기"><span lang="zh-CN" className="font-zh text-[1.3rem]">{word}</span> <span className="text-[.76rem] text-ink-4">{meaning}</span></button></td>
                          <td className="px-3 py-2 text-[1.05rem] text-ink-3">{pinyin}</td>
                          <td className="px-3 py-2 text-[1.05rem] font-bold">{result.map((item, index) => <span key={index} className={cn("mr-1.5", item.changed ? "text-[#c2410c]" : "text-ink")}>{item.pinyin}</span>)}</td>
                          <td className="px-3 py-2 text-[.78rem] text-ink-3">{[...new Set(result.flatMap(item => item.rule ? [item.rule] : []))].join(", ") || "바뀌지 않음"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[.74rem] text-ink-4">바뀐 성조는 주황색으로 표시했어요. 낱말을 누르면 소리를 들을 수 있어요. 병음 퀴즈의 ‘성조 변화’ 유형으로 인쇄할 수 있어요.</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
              <Card title="문항 유형" help="성조 부호·성조 번호·성모 운모 나누기·글자 병음은 왼쪽에서 고른 성모·운모로 냅니다. 성조 변화는 정해 둔 낱말 24개로 냅니다.">
                <div className="flex flex-wrap gap-1.5">
                  {pinyinQuizTypeKeys.map(type => <button key={type} type="button" aria-pressed={quiz.types.includes(type)} onClick={() => setQuiz(current => ({ ...current, types: current.types.includes(type) ? current.types.filter(item => item !== type) : [...current.types, type] }))} className={chipClass(quiz.types.includes(type))}>{pinyinQuizTypes[type].label}</button>)}
                </div>
                <div className="mt-3 space-y-2 border-t border-line pt-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-ink-4">유형마다 문항 수</p>
                    <Segmented label="문항 수" value={quiz.count} onChange={count => setQuiz({ ...quiz, count })} options={[8, 12, 20].map(count => ({ value: count, label: `${count}개` }))} />
                  </div>
                  <Toggle label="순서 섞기" checked={quiz.shuffle} onChange={shuffle => setQuiz({ ...quiz, shuffle })} />
                  <Toggle label="정답지 붙이기" checked={quiz.answers} onChange={answers => setQuiz({ ...quiz, answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
                  {quiz.shuffle && <Button variant="ghost" size="sm" onClick={() => setQuiz({ ...quiz, seed: quiz.seed + 1 })}><Shuffle size={14} /> 다시 섞기</Button>}
                </div>
              </Card>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button variant="secondary" size="sm" disabled={!quizSections.length} onClick={() => void copy(pinyinQuizText(quizSections, quizOptions), pinyinQuizHtml(quizSections, quizOptions, "clipboard"))} title="한글·워드에 붙여 넣을 수 있게 복사해요">{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "한글에 붙여 넣기용 복사"}</Button>
                  <Button variant="secondary" size="sm" disabled={!quizSections.length} onClick={() => window.print()}><Printer size={15} /> 인쇄</Button>
                </div>
                {quizSections.length
                  ? <PrintablePage id="pinyin-quiz-print" html={pinyinQuizHtml(quizSections, quizOptions, "screen")} />
                  : <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-16 text-center text-[.9rem] text-ink-3">문항 유형과 성모·운모를 골라 주세요.</p>}
              </div>
            </div>
          )}
        </div>
      </section>
      {flash && <ToneFlash cards={cards} speak={speak} onClose={closeFlash} />}
    </div>
  );
}
