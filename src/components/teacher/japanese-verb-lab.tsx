"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { AlertTriangle, ClipboardCheck, Copy, FileText, Flower2, LoaderCircle, MonitorPlay, Plus, Printer, Repeat, ShieldCheck, Shuffle, Table2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BUILTIN_ENTRIES, conjSheetHtml, conjSheetText, conjugate, dictionaryForm, entryIssue, entryKey, formKeys, formLabel, groupLabels, guessGroup, isHiragana, kindLabels, RULE_NOTES,
  type ConjEntry, type ConjForm, type VerbGroup, type WordKind,
} from "@/features/japanese/conjugation";
import { Card, Segmented, Toggle } from "./tool-panel";
import { copyToClipboard, PrintablePage } from "./hanmun-sheet";
import { RubyText } from "./japanese-ruby";
import { JapaneseVerbShow } from "./japanese-verb-show";
import { speechNotice, useJapaneseSpeech } from "./speech";

type View = "table" | "sheet";
const kinds: WordKind[] = ["verb", "iAdj", "naAdj"];

// 고른 낱말·직접 넣은 낱말·학습지 설정은 이 브라우저에만 저장합니다.
const storageKey = "learncraft_japanese_conj_v1";
const entrySchema = z.object({ word: z.string().max(20), reading: z.string().max(30), meaning: z.string().max(40).catch(""), kind: z.enum(["verb", "iAdj", "naAdj"]), group: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional() });
const perKind = <T,>(schema: z.ZodType<T>, fallback: Record<WordKind, T>) => z.object({ verb: schema.catch(fallback.verb), iAdj: schema.catch(fallback.iAdj), naAdj: schema.catch(fallback.naAdj) }).catch(fallback);
const defaultSelected: Record<WordKind, string[]> = {
  verb: ["書く", "行く", "話す", "飲む", "帰る", "食べる", "見る", "する", "来る"].map(word => entryKey({ word, kind: "verb" })),
  iAdj: ["高い", "大きい", "おいしい", "いい"].map(word => entryKey({ word, kind: "iAdj" })),
  naAdj: ["好き", "静か", "元気", "きれい"].map(word => entryKey({ word, kind: "naAdj" })),
};
const defaultForms: Record<WordKind, string[]> = { verb: ["masu", "te", "ta", "nai"], iAdj: ["nai", "ta", "te"], naAdj: ["nai", "ta", "te", "noun"] };
const storedSchema = z.object({
  title: z.string().max(100).catch(""),
  kind: z.enum(["verb", "iAdj", "naAdj"]).catch("verb"),
  selected: perKind(z.array(z.string().max(60)).max(80), defaultSelected),
  forms: perKind(z.array(z.string().max(20)).max(10), defaultForms),
  custom: z.array(z.unknown()).catch([]).transform(items => items.flatMap(item => { const parsed = entrySchema.safeParse(item); return parsed.success && !entryIssue(parsed.data) ? [parsed.data] : []; }).slice(0, 60)),
  view: z.enum(["table", "sheet"]).catch("table"),
  sheet: z.object({
    example: z.boolean().catch(true), group: z.boolean().catch(true), meaning: z.boolean().catch(true), furigana: z.boolean().catch(true),
    rules: z.boolean().catch(false), shuffle: z.boolean().catch(false), seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ example: true, group: true, meaning: true, furigana: true, rules: false, shuffle: false, seed: 1, answers: true }),
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

export function JapaneseVerbLab({ tabs }: { tabs?: React.ReactNode }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? <VerbEditor initial={readStored()} tabs={tabs} /> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 활용 연습 도구를 준비하는 중…</div>;
}

const fieldClass = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-ink-5 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
const chipClass = (active: boolean) => cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-[.82rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand",
  active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark");
const tabClass = (active: boolean) => cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", active ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark");

function AddEntry({ kind, existing, onAdd }: { kind: WordKind; existing: Set<string>; onAdd: (entry: ConjEntry) => void }) {
  const [word, setWord] = useState("");
  const [reading, setReading] = useState("");
  const [meaning, setMeaning] = useState("");
  const [group, setGroup] = useState<VerbGroup | null>(null);
  const actualReading = reading.trim() || (isHiragana(word.trim()) ? word.trim() : "");
  const draft = { word: word.trim(), reading: actualReading, meaning: meaning.trim(), kind };
  const issue = word.trim() ? entryIssue(draft) : null;
  const guess = kind === "verb" && !issue && draft.word ? guessGroup(draft.word, draft.reading) : null;
  const chosen = group ?? guess?.group ?? 1;
  const duplicate = existing.has(entryKey(draft));
  function add() {
    onAdd({ ...draft, ...(kind === "verb" && { group: chosen }) });
    setWord("");
    setReading("");
    setMeaning("");
    setGroup(null);
  }
  return (
    <form onSubmit={event => { event.preventDefault(); if (!issue && draft.word && !duplicate) add(); }} className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        <input aria-label="낱말" lang="ja" value={word} maxLength={20} onChange={event => { setWord(event.target.value); setGroup(null); }} placeholder={kind === "verb" ? "예: 買う" : kind === "iAdj" ? "예: 暑い" : "예: 有名"} className={cn(fieldClass, "font-ja")} />
        <input aria-label="읽기(히라가나)" lang="ja" value={reading} maxLength={30} onChange={event => { setReading(event.target.value); setGroup(null); }} placeholder={isHiragana(word.trim()) ? word.trim() : "읽기(히라가나)"} className={cn(fieldClass, "font-ja")} />
      </div>
      <input aria-label="뜻" value={meaning} maxLength={40} onChange={event => setMeaning(event.target.value)} placeholder="뜻 (예: 사다)" className={fieldClass} />
      {guess && (
        <div className="space-y-1">
          <Segmented label="동사 그룹" value={chosen} onChange={value => setGroup(value)} options={([1, 2, 3] as VerbGroup[]).map(value => ({ value, label: groupLabels[value] }))} />
          {!guess.sure && group === null && <p className="flex items-start gap-1 text-[.72rem] font-semibold leading-5 text-warn"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> 읽기만으로는 그룹을 가릴 수 없어요(かえる: 帰る 1그룹, 変える 2그룹). 맞는 그룹을 골라 주세요.</p>}
        </div>
      )}
      {issue && <p className="text-[.72rem] font-semibold leading-5 text-danger">{issue}</p>}
      {duplicate && <p className="text-[.72rem] font-semibold text-ink-4">이미 있는 낱말이에요.</p>}
      <Button type="submit" variant="secondary" size="sm" className="w-full" disabled={!draft.word || Boolean(issue) || duplicate}><Plus size={14} /> {kindLabels[kind]} 넣기</Button>
    </form>
  );
}

function VerbEditor({ initial, tabs }: { initial: Stored; tabs?: React.ReactNode }) {
  const [title, setTitle] = useState(initial.title);
  const [kind, setKind] = useState<WordKind>(initial.kind);
  const [selected, setSelected] = useState(initial.selected);
  const [forms, setForms] = useState(initial.forms);
  const [custom, setCustom] = useState<ConjEntry[]>(initial.custom);
  const [view, setView] = useState<View>(initial.view);
  const [sheet, setSheet] = useState(initial.sheet);
  const [copied, setCopied] = useState(false);
  const [showing, setShowing] = useState(false);
  const closeShow = useCallback(() => setShowing(false), []);
  const { supported, hasVoice, speak } = useJapaneseSpeech();

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ title, kind, selected, forms, custom, view, sheet })); } catch { /* 저장하지 못해도 이번 화면에서는 계속 쓸 수 있습니다. */ }
  }, [title, kind, selected, forms, custom, view, sheet]);

  const all = [...BUILTIN_ENTRIES, ...custom];
  const pool = all.filter(entry => entry.kind === kind);
  const keys = new Set(all.map(entryKey));
  const entries = selected[kind].flatMap(key => all.find(entry => entryKey(entry) === key) ?? []);
  const chosenForms = formKeys(kind).filter(form => forms[kind].includes(form));
  const toggleEntry = (key: string) => setSelected(current => ({ ...current, [kind]: current[kind].includes(key) ? current[kind].filter(item => item !== key) : [...current[kind], key] }));
  const toggleForm = (form: string) => setForms(current => ({ ...current, [kind]: current[kind].includes(form) ? current[kind].filter(item => item !== form) : [...current[kind], form] }));
  const sections = kind === "verb"
    ? ([1, 2, 3] as VerbGroup[]).map(group => ({ label: groupLabels[group], items: pool.filter(entry => entry.group === group) }))
    : [{ label: kindLabels[kind], items: pool }];
  const sheetOptions = { title, kind, forms: chosenForms, ...sheet };
  const notice = speechNotice(supported, hasVoice);

  async function copy() {
    await copyToClipboard({ text: conjSheetText(entries, sheetOptions), html: conjSheetHtml(entries, sheetOptions, "clipboard") });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><Flower2 size={16} /> 교사 지원실 · 일본어</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">동사 · 형용사 활용 연습</h1>
          <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3 lg:min-h-12 xl:min-h-6">낱말과 활용형을 고르면 ます형·て형·ない형 같은 활용을 규칙으로 계산해 바뀐 부분을 색으로 보여 줍니다. AI를 쓰지 않아 늘 같은 답이 나오고, 빈칸 활용표와 무작위 활용 퀴즈를 바로 쓸 수 있어요.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
      </header>
      {tabs}

      <section className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4">
          <Card title={`낱말 고르기 · ${entries.length}개`} help="교과서에 자주 나오는 낱말을 넣어 두었어요. 점이 찍힌 낱말은 예외가 있는 낱말입니다.">
            <div className="space-y-3">
              <Segmented label="품사" value={kind} onChange={setKind} options={kinds.map(value => ({ value, label: kindLabels[value] }))} />
              {sections.map(section => {
                const sectionKeys = section.items.map(entryKey);
                const every = sectionKeys.length > 0 && sectionKeys.every(key => selected[kind].includes(key));
                return (
                  <div key={section.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[.76rem] font-bold text-ink-3">{section.label}</p>
                      <button type="button" onClick={() => setSelected(current => ({ ...current, [kind]: every ? current[kind].filter(key => !sectionKeys.includes(key)) : [...new Set([...current[kind], ...sectionKeys])] }))} className="rounded-lg px-2 py-0.5 text-[.72rem] font-bold text-ink-4 hover:bg-brand-page hover:text-brand-dark">{every ? "모두 빼기" : "모두 넣기"}</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {section.items.map(entry => {
                        const key = entryKey(entry);
                        const isCustom = custom.includes(entry);
                        return (
                          <span key={key} className="relative inline-flex">
                            <button type="button" aria-pressed={selected[kind].includes(key)} onClick={() => toggleEntry(key)} title={`${entry.reading} · ${entry.meaning}${entry.note ? ` (${entry.note})` : ""}`}
                              className={cn(chipClass(selected[kind].includes(key)), "font-ja relative px-2 text-[.95rem]", isCustom && "pr-7")} lang="ja">
                              {entry.word}{entry.note && <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-[#c2410c]" />}
                            </button>
                            {isCustom && <button type="button" onClick={() => { setCustom(current => current.filter(item => item !== entry)); setSelected(current => ({ ...current, [kind]: current[kind].filter(item => item !== key) })); }} className="absolute right-0.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-4 hover:text-danger" aria-label={`${entry.word} 지우기`}><X size={13} /></button>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card title="낱말 직접 넣기" help="교과서에 나온 다른 낱말을 넣어요. 한자 낱말은 읽기를 히라가나로 적어 주세요. 활용은 규칙으로 계산하니 예외 동사는 표에서 확인해 주세요.">
            <AddEntry key={kind} kind={kind} existing={keys} onAdd={entry => { setCustom(current => [...current, entry]); setSelected(current => ({ ...current, [kind]: [...current[kind], entryKey(entry)] })); }} />
          </Card>
          <Card title="활용 고르기">
            <div className="flex flex-wrap gap-1.5">
              {formKeys(kind).map(form => <button key={form} type="button" aria-pressed={forms[kind].includes(form)} onClick={() => toggleForm(form)} title={formLabel(kind, form).hint} className={cn(chipClass(forms[kind].includes(form)), "font-ja")} lang="ja">{formLabel(kind, form).label}</button>)}
            </div>
          </Card>
          {notice && <p role="status" className="rounded-xl border border-warn/25 bg-[var(--warn-page)] px-3.5 py-2.5 text-[.76rem] font-semibold leading-5 text-warn">{notice}</p>}
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <nav aria-label="활용 연습 보기" className="flex w-fit gap-1 rounded-2xl border border-line bg-surface-2 p-1">
              <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")} className={tabClass(view === "table")}><Table2 size={16} /> 활용표</button>
              <button type="button" aria-pressed={view === "sheet"} onClick={() => setView("sheet")} className={tabClass(view === "sheet")}><FileText size={16} /> 연습지</button>
            </nav>
            <Button variant="secondary" size="sm" disabled={!entries.length || !chosenForms.length} onClick={() => setShowing(true)} title="낱말과 활용을 무작위로 띄워 퀴즈를 내요"><MonitorPlay size={15} /> 활용 퀴즈</Button>
          </div>

          {!entries.length || !chosenForms.length ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface-2 px-6 text-center text-[.9rem] text-ink-3">
              <Repeat size={24} className="text-brand" />
              <p className="font-bold text-ink-2">{!entries.length ? "왼쪽에서 낱말을 골라 주세요." : "활용형을 하나 이상 골라 주세요."}</p>
            </div>
          ) : view === "table" ? (
            <div className="space-y-3">
              <ul className="grid gap-2 rounded-[18px] border border-line bg-surface p-4 text-[.84rem] leading-6 shadow-[var(--lift-1)] sm:grid-cols-2">
                {RULE_NOTES[kind].map(([heading, body]) => <li key={heading} className="break-keep"><b className="mr-1.5 text-brand-dark">{heading}</b><span className="text-ink-2">{body}</span></li>)}
              </ul>
              <div className="overflow-x-auto rounded-[18px] border border-line bg-surface shadow-[var(--lift-1)]">
                <table className="w-full min-w-max border-collapse text-center">
                  <thead>
                    <tr className="bg-surface-2 text-[.78rem] text-ink-3">
                      <th className="sticky left-0 bg-surface-2 px-3 py-2.5 text-left">사전형</th>
                      {chosenForms.map(form => <th key={form} className="px-3 py-2.5"><span lang="ja" className="font-ja block text-[.9rem] text-ink-2">{formLabel(kind, form).label}</span><span className="font-semibold text-ink-4">{formLabel(kind, form).hint}</span></th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => {
                      const base = dictionaryForm(entry);
                      return (
                        <tr key={entryKey(entry)} className="border-t border-line">
                          <th className="sticky left-0 bg-surface px-3 py-2 text-left font-normal">
                            <button type="button" onClick={() => speak(base.reading)} className="text-left" title="소리 듣기"><RubyText value={base} className="text-[1.3rem] leading-[1.9] text-ink" /></button>
                            <span className="block text-[.72rem] text-ink-4">{entry.group ? `${groupLabels[entry.group]} · ` : ""}{entry.meaning}</span>
                            {entry.note && <span className="block max-w-44 break-keep text-[.7rem] font-semibold text-[#c2410c]">{entry.note}</span>}
                          </th>
                          {chosenForms.map(form => {
                            const value = conjugate(entry, form as ConjForm);
                            return (
                              <td key={form} className="px-3 py-2">
                                {value ? <button type="button" onClick={() => speak(value.reading)} title="소리 듣기" className="rounded-lg px-1 hover:bg-brand-page"><RubyText value={value} base={base} className="text-[1.15rem] leading-[1.9] text-ink" /></button> : <span className="text-ink-5" title="이 낱말에는 이 활용을 쓰지 않아요">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[.74rem] text-ink-4">바뀐 부분은 주황색으로 표시했어요. 낱말이나 활용형을 누르면 소리를 들을 수 있어요.</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
              <Card title="연습지 설정">
                <Toggle label="첫 줄은 예시로 채우기" checked={sheet.example} onChange={example => setSheet({ ...sheet, example })} />
                {kind === "verb" && <Toggle label="그룹 쓰는 칸" checked={sheet.group} onChange={group => setSheet({ ...sheet, group })} help="학생이 동사 그룹(1·2·3)을 먼저 쓰게 합니다." />}
                <Toggle label="뜻 적기" checked={sheet.meaning} onChange={meaning => setSheet({ ...sheet, meaning })} />
                <Toggle label="후리가나 달기" checked={sheet.furigana} onChange={furigana => setSheet({ ...sheet, furigana })} />
                <Toggle label="규칙 안내 넣기" checked={sheet.rules} onChange={rules => setSheet({ ...sheet, rules })} help="활용 규칙 요약을 표 위에 넣습니다." />
                <Toggle label="순서 섞기" checked={sheet.shuffle} onChange={shuffle => setSheet({ ...sheet, shuffle })} />
                {sheet.shuffle && <Button variant="ghost" size="sm" className="mt-1" onClick={() => setSheet({ ...sheet, seed: sheet.seed + 1 })}><Shuffle size={14} /> 다시 섞기</Button>}
                <Toggle label="정답지 붙이기" checked={sheet.answers} onChange={answers => setSheet({ ...sheet, answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
                <label className="mt-2 block text-[.76rem] font-bold text-ink-3">학습지 제목
                  <input value={title} maxLength={100} onChange={event => setTitle(event.target.value)} placeholder={`${kindLabels[kind]} 활용 연습`} className={cn(fieldClass, "mt-1")} />
                </label>
              </Card>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => void copy()} title="한글·워드에 붙여 넣을 수 있게 복사해요">{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "한글에 붙여 넣기용 복사"}</Button>
                  <Button variant="secondary" size="sm" onClick={() => window.print()} title="A4 세로로 인쇄해요"><Printer size={15} /> 인쇄</Button>
                </div>
                {chosenForms.length > 5 && <p className="text-[.76rem] font-semibold text-ink-4">활용형이 많으면 칸이 좁아져요. 5개 이하를 권해요.</p>}
                <PrintablePage id="japanese-conj-print" html={conjSheetHtml(entries, sheetOptions, "screen")} />
              </div>
            </div>
          )}
        </div>
      </section>
      {showing && <JapaneseVerbShow entries={entries} forms={chosenForms} speak={speak} onClose={closeShow} />}
    </div>
  );
}
