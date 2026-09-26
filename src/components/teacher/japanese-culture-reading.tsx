"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AlertCircle, AlertTriangle, BookOpenText, ClipboardCheck, Copy, FileText, LoaderCircle, PencilLine, Plus, Printer, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { stripRuby, type CultureTopic } from "@/features/japanese/culture";
import {
  readingIssues, readingSchema, readingSheetHtml, readingSheetText, readingSheetTypeKeys, readingSheetTypes,
  type ReadingMaterial, type ReadingRequest, type ReadingSheetOptions, type ReadingSheetType,
} from "@/features/japanese/culture-reading";
import { Card, Segmented, Toggle } from "./tool-panel";
import { copyToClipboard, PrintablePage } from "./hanmun-sheet";
import { RubyInline } from "./japanese-ruby";

type Saved = { id: string; request: ReadingRequest; material: ReadingMaterial; updatedAt: number };
type Tab = "edit" | "sheet";

// 읽기 자료는 이 브라우저에만 20개까지 저장합니다. 깨진 자료 하나 때문에 나머지를 잃지 않도록 자료마다 따로 확인합니다.
const storageKey = "learncraft_japanese_culture_reading_v1";
const MAX_SAVED = 20;
const requestStored = z.object({ topic: z.string().max(60), notes: z.string().max(1500).catch(""), language: z.enum(["ko", "ja"]).catch("ko"), level: z.enum(["easy", "normal"]).catch("easy"), length: z.enum(["short", "medium"]).catch("short") });
const savedSchema = z.object({ id: z.string(), request: requestStored, material: readingSchema, updatedAt: z.number().catch(0) });
const defaultSheet: ReadingSheetOptions = { types: ["words", "choices", "ox", "essays"], furigana: true, translation: true, answers: true };
const storedSchema = z.object({
  saved: z.array(z.unknown()).catch([]).transform(items => items.flatMap(item => { const parsed = savedSchema.safeParse(item); return parsed.success ? [parsed.data] : []; }).slice(0, MAX_SAVED)),
  currentId: z.string().nullable().catch(null),
  tab: z.enum(["edit", "sheet"]).catch("edit"),
  sheet: z.object({ types: z.array(z.enum(readingSheetTypeKeys as [ReadingSheetType, ...ReadingSheetType[]])).catch(defaultSheet.types), furigana: z.boolean().catch(true), translation: z.boolean().catch(true), answers: z.boolean().catch(true) }).catch(defaultSheet),
});
type Stored = z.infer<typeof storedSchema>;
export function readReadingStored(): Stored {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return storedSchema.parse(saved ? JSON.parse(saved) : {});
  } catch {
    return storedSchema.parse({});
  }
}
const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const fieldClass = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-ink-5 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
const labelClass = "block text-[.78rem] font-bold text-ink-3";
const circled = (index: number) => String.fromCharCode(0x2460 + index);
const topicLabel = (topic: CultureTopic) => `${topic.title}(${stripRuby(topic.ja)})`;

async function readJson<T>(response: Response) {
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "요청을 처리하지 못했습니다.");
  return data;
}

function MaterialEditor({ saved, onChange }: { saved: Saved; onChange: (material: ReadingMaterial) => void }) {
  const { material, request } = saved;
  const japanese = request.language === "ja";
  const set = (patch: Partial<ReadingMaterial>) => onChange({ ...material, ...patch });
  const issues = readingIssues(material, request.language);
  return (
    <div className="space-y-4">
      {issues.length > 0 && (
        <ul className="space-y-1">{issues.map(issue => <li key={issue} className="flex items-start gap-1.5 rounded-lg bg-[var(--danger-page)] px-2.5 py-1.5 text-[.8rem] font-semibold leading-5 text-danger"><AlertCircle size={14} className="mt-0.5 shrink-0" /> {issue}</li>)}</ul>
      )}
      <div className="rounded-xl border border-warn/25 bg-[var(--warn-page)] px-3.5 py-2.5 text-[.8rem] font-semibold leading-6 text-warn">
        <p className="flex items-center gap-1.5"><AlertTriangle size={14} /> AI가 쓴 글이에요. 나눠 주기 전에 사실이 맞는지 확인해 주세요.</p>
        {material.checks.length > 0 && <ul className="mt-1 list-disc pl-6 font-medium">{material.checks.map(check => <li key={check}>{check}</li>)}</ul>}
      </div>
      <label className={labelClass}>제목
        <input value={material.title} maxLength={80} onChange={event => set({ title: event.target.value })} className={cn(fieldClass, "mt-1")} />
      </label>
      <section className="space-y-3 rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
        <h3 className="text-sm font-extrabold text-ink">글 <span className="text-xs font-semibold text-ink-4">일본어 한자는 {"{"}漢字|かんじ{"}"}로 후리가나를 달아요</span></h3>
        {material.paragraphs.map((paragraph, index) => (
          <div key={index} className="space-y-1.5 rounded-xl bg-surface-2 p-3">
            <p className={cn("break-keep text-ink", japanese ? "font-ja text-[1.1rem] leading-[2.1]" : "text-[.95rem] leading-8")} lang={japanese ? "ja" : "ko"}><RubyInline text={paragraph.text} /></p>
            <textarea aria-label={`${index + 1}문단`} lang={japanese ? "ja" : "ko"} value={paragraph.text} rows={3} maxLength={900} onChange={event => set({ paragraphs: material.paragraphs.map((item, position) => position === index ? { ...item, text: event.target.value } : item) })} className={cn(fieldClass, "resize-y text-[.85rem]", japanese && "font-ja")} />
            {japanese && <textarea aria-label={`${index + 1}문단 해석`} value={paragraph.translation} rows={2} maxLength={900} placeholder="해석" onChange={event => set({ paragraphs: material.paragraphs.map((item, position) => position === index ? { ...item, translation: event.target.value } : item) })} className={cn(fieldClass, "resize-y text-[.85rem]")} />}
            <button type="button" onClick={() => set({ paragraphs: material.paragraphs.filter((_, position) => position !== index) })} disabled={material.paragraphs.length < 2} className="text-[.74rem] font-bold text-ink-4 hover:text-danger disabled:opacity-40">문단 지우기</button>
          </div>
        ))}
        {material.paragraphs.length < 8 && <Button variant="ghost" size="sm" onClick={() => set({ paragraphs: [...material.paragraphs, { text: "", translation: "" }] })}><Plus size={14} /> 문단 추가</Button>}
      </section>
      <section className="space-y-2 rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
        <h3 className="text-sm font-extrabold text-ink">낱말</h3>
        {material.words.map((word, index) => (
          <div key={index} className="grid grid-cols-[6rem_7rem_minmax(0,1fr)_auto] gap-1.5">
            <input aria-label="낱말" lang="ja" value={word.word} maxLength={20} onChange={event => set({ words: material.words.map((item, position) => position === index ? { ...item, word: event.target.value } : item) })} className={cn(fieldClass, "font-ja px-2")} />
            <input aria-label="읽기" lang="ja" value={word.reading} maxLength={30} onChange={event => set({ words: material.words.map((item, position) => position === index ? { ...item, reading: event.target.value } : item) })} className={cn(fieldClass, "font-ja px-2")} />
            <input aria-label="뜻" value={word.meaning} maxLength={80} onChange={event => set({ words: material.words.map((item, position) => position === index ? { ...item, meaning: event.target.value } : item) })} className={cn(fieldClass, "px-2")} />
            <button type="button" onClick={() => set({ words: material.words.filter((_, position) => position !== index) })} className="grid min-h-10 w-9 place-items-center rounded-xl text-ink-5 hover:bg-surface-2 hover:text-danger" aria-label={`${word.word || "낱말"} 지우기`}><X size={15} /></button>
          </div>
        ))}
        {material.words.length < 10 && <Button variant="ghost" size="sm" onClick={() => set({ words: [...material.words, { word: "", reading: "", meaning: "" }] })}><Plus size={14} /> 낱말 추가</Button>}
      </section>
      <section className="space-y-3 rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
        <h3 className="text-sm font-extrabold text-ink">객관식</h3>
        {material.choices.map((choice, index) => (
          <div key={index} className="space-y-1.5 rounded-xl bg-surface-2 p-3">
            <div className="flex gap-1.5">
              <input aria-label={`객관식 ${index + 1}번 질문`} value={choice.question} maxLength={200} onChange={event => set({ choices: material.choices.map((item, position) => position === index ? { ...item, question: event.target.value } : item) })} className={fieldClass} />
              <button type="button" onClick={() => set({ choices: material.choices.filter((_, position) => position !== index) })} className="grid min-h-10 w-9 shrink-0 place-items-center rounded-xl text-ink-5 hover:bg-surface hover:text-danger" aria-label={`객관식 ${index + 1}번 지우기`}><Trash2 size={15} /></button>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {choice.options.map((option, optionIndex) => (
                <label key={optionIndex} className="flex items-center gap-1.5">
                  <input type="radio" name={`answer-${saved.id}-${index}`} checked={choice.answer === optionIndex} onChange={() => set({ choices: material.choices.map((item, position) => position === index ? { ...item, answer: optionIndex } : item) })} className="accent-[var(--brand)]" aria-label={`${circled(optionIndex)}을 정답으로`} />
                  <span className="text-sm font-bold text-ink-3">{circled(optionIndex)}</span>
                  <input aria-label={`보기 ${optionIndex + 1}`} value={option} maxLength={100} onChange={event => set({ choices: material.choices.map((item, position) => position === index ? { ...item, options: item.options.map((value, place) => place === optionIndex ? event.target.value : value) } : item) })} className={cn(fieldClass, "py-1.5")} />
                </label>
              ))}
            </div>
            <input aria-label="해설" value={choice.explanation} maxLength={200} placeholder="해설" onChange={event => set({ choices: material.choices.map((item, position) => position === index ? { ...item, explanation: event.target.value } : item) })} className={cn(fieldClass, "py-1.5 text-xs")} />
          </div>
        ))}
      </section>
      <section className="space-y-2 rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
        <h3 className="text-sm font-extrabold text-ink">O·X</h3>
        {material.ox.map((item, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-1.5">
            <input aria-label={`O·X ${index + 1}번`} value={item.statement} maxLength={200} onChange={event => set({ ox: material.ox.map((value, position) => position === index ? { ...value, statement: event.target.value } : value) })} className={fieldClass} />
            <button type="button" onClick={() => set({ ox: material.ox.map((value, position) => position === index ? { ...value, answer: !value.answer } : value) })} className={cn("min-h-10 w-11 rounded-xl border text-sm font-extrabold", item.answer ? "border-[#2f5d8a]/30 bg-[#2f5d8a]/10 text-[#2f5d8a]" : "border-danger/30 bg-[var(--danger-page)] text-danger")} title="정답 바꾸기">{item.answer ? "O" : "X"}</button>
            <button type="button" onClick={() => set({ ox: material.ox.filter((_, position) => position !== index) })} className="grid min-h-10 w-9 place-items-center rounded-xl text-ink-5 hover:bg-surface-2 hover:text-danger" aria-label={`O·X ${index + 1}번 지우기`}><Trash2 size={15} /></button>
          </div>
        ))}
      </section>
      <section className="space-y-2 rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
        <h3 className="text-sm font-extrabold text-ink">서술형</h3>
        {material.essays.map((essay, index) => (
          <div key={index} className="flex gap-1.5">
            <input aria-label={`서술형 ${index + 1}번`} value={essay} maxLength={200} onChange={event => set({ essays: material.essays.map((value, position) => position === index ? event.target.value : value) })} className={fieldClass} />
            <button type="button" onClick={() => set({ essays: material.essays.filter((_, position) => position !== index) })} className="grid min-h-10 w-9 shrink-0 place-items-center rounded-xl text-ink-5 hover:bg-surface-2 hover:text-danger" aria-label={`서술형 ${index + 1}번 지우기`}><Trash2 size={15} /></button>
          </div>
        ))}
        {material.essays.length < 3 && <Button variant="ghost" size="sm" onClick={() => set({ essays: [...material.essays, ""] })}><Plus size={14} /> 질문 추가</Button>}
      </section>
    </div>
  );
}

/** 주제로 AI 읽기 자료를 만들고, 고친 뒤 학습지로 뽑습니다. */
export function CultureReading({ topics, initialTopic, initial }: { topics: CultureTopic[]; initialTopic: string; initial: Stored }) {
  const [saved, setSaved] = useState<Saved[]>(initial.saved);
  const [currentId, setCurrentId] = useState<string | null>(initial.saved.some(item => item.id === initial.currentId) ? initial.currentId : initial.saved[0]?.id ?? null);
  const [tab, setTab] = useState<Tab>(initial.tab);
  const [sheet, setSheet] = useState<ReadingSheetOptions>(initial.sheet);
  const [request, setRequest] = useState<ReadingRequest>({ topic: initialTopic, notes: "", language: "ko", level: "easy", length: "short" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const [confirm, confirmDialog] = useConfirm();
  const current = saved.find(item => item.id === currentId) ?? null;

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ saved, currentId, tab, sheet })); } catch { /* 저장하지 못해도 이번 화면에서는 계속 쓸 수 있습니다. */ }
  }, [saved, currentId, tab, sheet]);
  useEffect(() => () => controller.current?.abort(), []);

  async function generate() {
    controller.current?.abort();
    const call = new AbortController();
    controller.current = call;
    setLoading(true);
    setError("");
    try {
      const data = await readJson<{ material: ReadingMaterial }>(await fetch("/api/teacher/japanese/culture", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: call.signal, body: JSON.stringify(request),
      }));
      const item: Saved = { id: makeId(), request, material: data.material, updatedAt: Date.now() };
      setSaved(list => [item, ...list].slice(0, MAX_SAVED));
      setCurrentId(item.id);
      setTab("edit");
    } catch (reason) {
      if (!call.signal.aborted) setError(reason instanceof Error ? reason.message : "읽기 자료를 만들지 못했습니다.");
    } finally {
      if (controller.current === call) controller.current = null;
      setLoading(false);
    }
  }
  async function remove(item: Saved) {
    if (!await confirm({ eyebrow: "읽기 자료", title: "읽기 자료를 지울까요?", tone: "danger", confirmLabel: "지우기", description: `‘${stripRuby(item.material.title) || item.request.topic}’ 자료(문단 ${item.material.paragraphs.length}개, 문항 ${item.material.choices.length + item.material.ox.length + item.material.essays.length}개)를 지웁니다.`, note: "지운 자료는 되돌릴 수 없어요." })) return;
    const rest = saved.filter(other => other.id !== item.id);
    setSaved(rest);
    if (item.id === currentId) setCurrentId(rest[0]?.id ?? null);
  }
  const update = (material: ReadingMaterial) => setSaved(list => list.map(item => item.id === currentId ? { ...item, material, updatedAt: Date.now() } : item));
  const chipClass = (active: boolean) => cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-[.82rem] font-semibold transition-colors", active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark");
  const tabClass = (active: boolean) => cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", active ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark");

  async function copy() {
    if (!current) return;
    await copyToClipboard({ text: readingSheetText(current.material, current.request.language, sheet), html: readingSheetHtml(current.material, current.request.language, sheet, "clipboard") });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
      <div className="space-y-4">
        <Card title="읽기 자료 만들기" help="AI가 주제에 맞는 글과 낱말·객관식·O·X·서술형 문항 초안을 만들어요. 교과서 내용을 붙여 넣으면 그 범위에 맞춰 씁니다.">
          <form onSubmit={event => { event.preventDefault(); if (request.topic.trim() && !loading) void generate(); }} className="space-y-3">
            <label className={labelClass}>주제
              <input list="culture-topics" value={request.topic} maxLength={60} onChange={event => setRequest({ ...request, topic: event.target.value })} placeholder="예: 설날(お正月)" className={cn(fieldClass, "mt-1")} />
              <datalist id="culture-topics">{topics.map(topic => <option key={topic.id} value={topicLabel(topic)} />)}</datalist>
            </label>
            <label className={labelClass}>요청·교과서 내용 <span className="font-semibold text-ink-5">(선택)</span>
              <textarea value={request.notes} rows={4} maxLength={1500} onChange={event => setRequest({ ...request, notes: event.target.value })} placeholder="예: 교과서 3단원 본문을 바탕으로, 한국 설날과 비교하는 문단을 꼭 넣어 주세요." className={cn(fieldClass, "mt-1 resize-y")} />
            </label>
            <Segmented label="글 언어" value={request.language} onChange={language => setRequest({ ...request, language })} options={[{ value: "ko", label: "한국어 글" }, { value: "ja", label: "일본어 글 + 해석" }]} />
            <div className="grid grid-cols-2 gap-2">
              <Segmented label="수준" value={request.level} onChange={level => setRequest({ ...request, level })} options={[{ value: "easy", label: "쉽게" }, { value: "normal", label: "보통" }]} />
              <Segmented label="길이" value={request.length} onChange={length => setRequest({ ...request, length })} options={[{ value: "short", label: "짧게" }, { value: "medium", label: "길게" }]} />
            </div>
            <Button type="submit" className="w-full" disabled={!request.topic.trim() || loading}>{loading ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />} {loading ? "읽기 자료를 만드는 중… (1분 안팎)" : "AI 읽기 자료 만들기"}</Button>
            {error && <p role="alert" className="flex items-start gap-2 text-xs font-semibold leading-5 text-danger"><AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}</p>}
          </form>
        </Card>
        {saved.length > 0 && (
          <Card title={`저장한 자료 ${saved.length} / ${MAX_SAVED}`}>
            <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {saved.map(item => (
                <li key={item.id} className={cn("group flex items-center gap-1 rounded-xl border", item.id === currentId ? "border-brand/30 bg-brand-page" : "border-transparent hover:bg-surface-2")}>
                  <button type="button" onClick={() => setCurrentId(item.id)} aria-current={item.id === currentId ? "true" : undefined} className="min-w-0 flex-1 px-2.5 py-2 text-left">
                    <span className="block truncate text-[.84rem] font-bold text-ink">{stripRuby(item.material.title) || item.request.topic}</span>
                    <span className="block text-[.7rem] text-ink-4">{item.request.language === "ja" ? "일본어 글" : "한국어 글"} · {new Date(item.updatedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>
                  </button>
                  <button type="button" onClick={() => void remove(item)} className="mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-ink-5 opacity-60 hover:bg-surface hover:text-danger group-hover:opacity-100" aria-label={`${stripRuby(item.material.title) || item.request.topic} 지우기`}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="min-w-0 space-y-3">
        {loading && !current ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-brand/25 bg-brand-page text-[.9rem] font-semibold text-brand-dark"><LoaderCircle size={26} className="animate-spin" /> 주제에 맞는 글과 문항을 만드는 중이에요…</div>
        ) : !current ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface-2 px-6 text-center text-[.9rem] text-ink-3">
            <BookOpenText size={24} className="text-brand" />
            <p className="font-bold text-ink-2">주제를 정하고 ‘AI 읽기 자료 만들기’를 눌러 주세요.</p>
            <p className="break-keep">한국어 글이나 쉬운 일본어 글(해석 포함)과 내용 확인 문항이 만들어져요. 고친 뒤 학습지로 인쇄할 수 있어요.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <nav aria-label="읽기 자료 보기" className="flex w-fit gap-1 rounded-2xl border border-line bg-surface-2 p-1">
                <button type="button" aria-pressed={tab === "edit"} onClick={() => setTab("edit")} className={tabClass(tab === "edit")}><PencilLine size={16} /> 확인·고치기</button>
                <button type="button" aria-pressed={tab === "sheet"} onClick={() => setTab("sheet")} className={tabClass(tab === "sheet")}><FileText size={16} /> 학습지</button>
              </nav>
              {tab === "sheet" && (
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => void copy()} title="한글·워드에 붙여 넣을 수 있게 복사해요">{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "한글에 붙여 넣기용 복사"}</Button>
                  <Button variant="secondary" size="sm" onClick={() => window.print()} title="A4 세로로 인쇄해요"><Printer size={15} /> 인쇄</Button>
                </div>
              )}
            </div>
            {tab === "edit" ? <MaterialEditor key={current.id} saved={current} onChange={update} /> : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-1.5 rounded-[18px] border border-line bg-surface p-3 shadow-[var(--lift-1)]">
                  {readingSheetTypeKeys.map(type => <button key={type} type="button" aria-pressed={sheet.types.includes(type)} onClick={() => setSheet({ ...sheet, types: sheet.types.includes(type) ? sheet.types.filter(item => item !== type) : [...sheet.types, type] })} className={chipClass(sheet.types.includes(type))}>{readingSheetTypes[type]}</button>)}
                  <span className="mx-1 h-6 w-px bg-line" />
                  <div className="flex flex-wrap gap-x-3"><Toggle label="후리가나" checked={sheet.furigana} onChange={furigana => setSheet({ ...sheet, furigana })} />{current.request.language === "ja" && <Toggle label="해석 넣기" checked={sheet.translation} onChange={translation => setSheet({ ...sheet, translation })} />}<Toggle label="정답지" checked={sheet.answers} onChange={answers => setSheet({ ...sheet, answers })} /></div>
                </div>
                <PrintablePage id="culture-reading-print" html={readingSheetHtml(current.material, current.request.language, sheet, "screen")} />
              </div>
            )}
          </>
        )}
      </div>
      {confirmDialog}
    </div>
  );
}
