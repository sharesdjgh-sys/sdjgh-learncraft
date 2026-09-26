"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { AlertCircle, ChevronLeft, ChevronRight, ClipboardCheck, Copy, Eye, EyeOff, Grid3x3, Lamp, LayoutGrid, ListChecks, LoaderCircle, Maximize2, MonitorPlay, PencilLine, Plus, Printer, RotateCcw, ShieldCheck, Shuffle, Sparkles, Trash2, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { hanziOf } from "@/features/chinese/hanzi";
import {
  buildHanziQuiz, commonHanzi, HANZI_FILL_PER_REQUEST, HANZI_WORDS_PER_CHAR, hanziCard, hanziPracticeHtml, hanziPracticeSizes, hanziQuizHtml, hanziQuizText, hanziQuizTypeKeys, hanziQuizTypes, MAX_HANZI_SET, uniqueHanzi,
  type HanziCard, type HanziOverride, type HanziPracticeSize, type HanziQuizType, type HanziWord,
} from "@/features/chinese/hanzi-sheet";
import { Card, Segmented, Toggle } from "./tool-panel";
import { copyToClipboard, PrintablePage } from "./hanmun-sheet";
import { speechNotice, useSpeech } from "./speech";

type View = "cards" | "practice" | "quiz";

// 학습 글자와 교사가 고친 뜻·낱말은 이 브라우저에만 저장합니다. 고친 내용은 다른 묶음에서도 그대로 씁니다.
const storageKey = "learncraft_chinese_hanzi_v1";
// 본문 풀이 도구가 저장한 중국어 본문에서 글자를 가져옵니다.
const textStorageKey = "learncraft_chinese_text_v1";
const wordStored = z.object({ word: z.string().max(8), pinyin: z.string().max(40), meaning: z.string().max(60) });
const storedSchema = z.object({
  title: z.string().max(100).catch(""),
  chars: z.array(z.string().max(2)).max(MAX_HANZI_SET).catch([]),
  overrides: z.record(z.string(), z.object({ meaning: z.string().max(60).optional(), words: z.array(wordStored).max(5).optional() })).catch({}),
  view: z.enum(["cards", "practice", "quiz"]).catch("cards"),
  practice: z.object({ size: z.enum(["normal", "large"]).catch("normal"), trace: z.number().int().min(0).max(9).catch(3), words: z.boolean().catch(true), korean: z.boolean().catch(true) }).catch({ size: "normal", trace: 3, words: true, korean: true }),
  quiz: z.object({
    types: z.array(z.enum(hanziQuizTypeKeys as [HanziQuizType, ...HanziQuizType[]])).catch(["pinyin", "meaning"]),
    shuffle: z.boolean().catch(true), seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ types: ["pinyin", "meaning"], shuffle: true, seed: 1, answers: true }),
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
function readTexts(): { id: string; title: string; text: string }[] {
  try {
    const docs = JSON.parse(window.localStorage.getItem(textStorageKey) ?? "{}").docs;
    return Array.isArray(docs) ? docs.flatMap(doc => typeof doc?.id === "string" && typeof doc?.text === "string" && hanziOf(doc.text).length ? [{ id: doc.id, title: String(doc.title ?? ""), text: doc.text }] : []) : [];
  } catch {
    return [];
  }
}
const noop = () => () => {};
async function readJson<T>(response: Response) {
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "요청을 처리하지 못했습니다.");
  return data;
}
const fieldClass = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-ink-5 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";

export function ChineseHanziLab({ tabs }: { tabs?: React.ReactNode }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? <HanziEditor initial={readStored()} texts={readTexts()} tabs={tabs} /> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 간체자 학습지 도구를 준비하는 중…</div>;
}

function CardEditor({ card, override, onChange }: { card: HanziCard; override: HanziOverride | undefined; onChange: (next: HanziOverride | undefined) => void }) {
  const words = override?.words ?? card.words;
  const setWords = (next: HanziWord[]) => onChange({ ...override, words: next });
  const setWord = (index: number, patch: Partial<HanziWord>) => setWords(words.map((word, position) => position === index ? { ...word, ...patch } : word));
  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-brand/15 bg-brand-page/50 p-3">
      <label className="block text-[.76rem] font-bold text-ink-3">뜻 <span className="font-semibold text-ink-5">중국어에서 쓰는 뜻으로 적어 주세요</span>
        <input value={override?.meaning ?? ""} maxLength={60} placeholder={card.meaning || "예: 배우다"} onChange={event => onChange({ ...override, meaning: event.target.value })} className={cn(fieldClass, "mt-1")} />
      </label>
      <fieldset>
        <legend className="text-[.76rem] font-bold text-ink-3">낱말</legend>
        <div className="mt-1 space-y-1.5">
          {words.map((word, index) => (
            <div key={index} className="grid grid-cols-[4.5rem_6rem_minmax(0,1fr)_auto] gap-1.5">
              <input aria-label="낱말" lang="zh-CN" value={word.word} maxLength={8} onChange={event => setWord(index, { word: event.target.value })} className={cn(fieldClass, "font-zh px-2")} />
              <input aria-label="병음" value={word.pinyin} maxLength={40} onChange={event => setWord(index, { pinyin: event.target.value })} className={cn(fieldClass, "px-2")} />
              <input aria-label="뜻" value={word.meaning} maxLength={60} onChange={event => setWord(index, { meaning: event.target.value })} className={cn(fieldClass, "px-2")} />
              <button type="button" onClick={() => setWords(words.filter((_, position) => position !== index))} className="grid min-h-10 w-8 place-items-center rounded-xl text-ink-5 hover:bg-surface hover:text-danger" aria-label={`${word.word || "낱말"} 지우기`}><X size={15} /></button>
            </div>
          ))}
          <div className="flex flex-wrap gap-1">
            {words.length < 5 && <Button type="button" variant="ghost" size="sm" onClick={() => setWords([...words, { word: "", pinyin: "", meaning: "" }])}><Plus size={14} /> 낱말 추가</Button>}
            {override && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}><RotateCcw size={14} /> 사전 값으로 되돌리기</Button>}
          </div>
        </div>
      </fieldset>
    </div>
  );
}

function HanziCardView({ card, override, onChange, onRemove, speak }: { card: HanziCard; override: HanziOverride | undefined; onChange: (next: HanziOverride | undefined) => void; onRemove: () => void; speak: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  return (
    <article className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => speak(card.char)} title="소리 듣기" lang="zh-CN" className="font-zh grid size-20 shrink-0 place-items-center rounded-2xl bg-surface-2 text-[3.2rem] leading-none text-ink hover:bg-brand-page">{card.char}</button>
        <div className="min-w-0 flex-1">
          <p className="text-[1.15rem] font-extrabold text-ink">{card.pinyinAll.join(" / ") || <span className="text-ink-5">사전에 없는 글자예요</span>}</p>
          <p className="break-keep text-[.9rem] font-semibold text-ink-2">{card.meaning || <span className="text-ink-5">뜻을 적어 주세요</span>}</p>
          <p className="mt-1 flex flex-wrap gap-1 text-[.7rem] font-bold">
            {card.traditional.length > 0 && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-3">번체 <span lang="zh-TW" className="font-learning">{card.traditional.join(" ")}</span></span>}
            {card.strokes > 0 && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-3">{card.strokes}획</span>}
            <span className={cn("rounded-full px-2 py-0.5", card.common ? "bg-brand-page text-brand-dark" : "bg-[var(--warn-page)] text-warn")}>{card.common ? "자주 쓰는 글자" : "덜 쓰는 글자"}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col">
          <button type="button" onClick={() => setEditing(value => !value)} className={cn("grid size-8 place-items-center rounded-lg hover:bg-brand-page hover:text-brand-dark", editing ? "text-brand-dark" : "text-ink-4")} aria-label={`${card.char} 고치기`}><PencilLine size={15} /></button>
          <button type="button" onClick={onRemove} className="grid size-8 place-items-center rounded-lg text-ink-5 hover:bg-surface-2 hover:text-danger" aria-label={`${card.char} 빼기`}><X size={15} /></button>
        </div>
      </div>
      {card.korean.length > 0 && <p className="mt-2 text-[.8rem] text-ink-3">한국 한자: <span className="font-learning">{card.korean.map(item => `${item.char} ${item.meaning}`).join(" / ")}</span></p>}
      {card.words.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-line pt-2 text-[.82rem] leading-5">
          {card.words.map((word, index) => <li key={index}><button type="button" onClick={() => speak(word.word)} className="text-left"><span lang="zh-CN" className="font-zh font-bold text-ink">{word.word}</span> <span className="text-ink-4">{word.pinyin}</span> <span className="text-ink-2">{word.meaning}</span></button></li>)}
        </ul>
      )}
      {editing && <CardEditor card={card} override={override} onChange={onChange} />}
    </article>
  );
}

/** 수업 중 간체자를 한 글자씩 크게 띄우고, 학생이 읽은 뒤 병음·뜻을 보여 줍니다. */
function HanziFlash({ cards, speak, onClose }: { cards: HanziCard[]; speak: (text: string) => void; onClose: () => void }) {
  const [order, setOrder] = useState(() => cards.map((_, index) => index));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const last = cards.length - 1;
  const card = cards[order[index]];
  const fullscreen = () => void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen().catch(() => undefined));
  const move = (step: number) => { setIndex(value => Math.max(0, Math.min(last, value + step))); setRevealed(false); };
  const reveal = () => { if (!revealed && card) speak(card.char); setRevealed(!revealed); };
  const handlers = useRef({ move, reveal, say: () => card && speak(card.char) });
  useEffect(() => { handlers.current = { move, reveal, say: () => card && speak(card.char) }; });
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
      else if (["ArrowRight", "PageDown"].includes(event.key)) { event.preventDefault(); handlers.current.move(1); }
      else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); handlers.current.move(-1); }
      else if ([" ", "Enter"].includes(event.key)) { event.preventDefault(); handlers.current.reveal(); }
      else if (event.key.toLowerCase() === "s") handlers.current.say();
      else if (event.key.toLowerCase() === "f") void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen().catch(() => undefined));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, [onClose]);
  const control = "grid size-11 place-items-center rounded-full bg-[#2b2418]/8 text-[#3b3226] transition hover:bg-[#2b2418]/15 disabled:opacity-25";
  const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-[#2b2418]/8 px-3.5 text-[.8rem] font-bold text-[#3b3226] transition hover:bg-[#2b2418]/15";
  if (!card) return null;
  return (
    <div ref={stage} role="dialog" aria-modal="true" aria-label="간체자 플래시 카드" className="fixed inset-0 z-[80] flex flex-col bg-[#fbf7ee] text-[#1f1a14]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="text-[.82rem] font-semibold tabular-nums text-[#6d6252]">{index + 1} / {cards.length}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={reveal} className={cn(pill, revealed && "bg-[#7a2f1f] text-white hover:bg-[#7a2f1f]")} title="병음·뜻 보이기·가리기 (Space)">{revealed ? <EyeOff size={15} /> : <Eye size={15} />} {revealed ? "가리기" : "병음·뜻 보기"}</button>
          <button type="button" onClick={() => speak(card.char)} className={pill} title="소리 듣기 (S)"><Volume2 size={15} /> 소리</button>
          <button type="button" onClick={() => { setOrder(current => [...current].sort(() => Math.random() - 0.5)); setIndex(0); setRevealed(false); }} className={pill} title="순서 섞기"><Shuffle size={15} /> 섞기</button>
          <button type="button" onClick={fullscreen} className={control} aria-label="전체 화면 (F)"><Maximize2 size={17} /></button>
          <button type="button" onClick={onClose} className={control} aria-label="닫기 (Esc)"><X size={18} /></button>
        </div>
      </div>
      <button type="button" onClick={reveal} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-20 pb-6" aria-label={revealed ? "가리기" : "병음·뜻 보기"}>
        <span lang="zh-CN" className="font-zh text-[clamp(8rem,34vh,20rem)] leading-none">{card.char}</span>
        <span className={cn("flex min-h-[9rem] flex-col items-center gap-2 transition-opacity", revealed ? "opacity-100" : "opacity-0")} aria-hidden={!revealed}>
          <span className="text-[clamp(2.4rem,6vw,4.6rem)] font-extrabold">{card.pinyinAll.join(" / ")}</span>
          <span className="text-[clamp(1.4rem,3vw,2.4rem)] font-bold text-[#3b3226]">{card.meaning}</span>
          <span className="text-[clamp(.95rem,1.5vw,1.3rem)] font-semibold text-[#6d6252]">{[card.traditional.length ? `번체 ${card.traditional.join(" ")}` : "", card.korean.map(item => `${item.char} ${item.meaning}`).join(" / ")].filter(Boolean).join(" · ")}</span>
        </span>
      </button>
      <button type="button" onClick={() => move(-1)} disabled={index === 0} className={cn(control, "fixed left-3 top-1/2 -translate-y-1/2")} aria-label="이전 글자"><ChevronLeft size={22} /></button>
      <button type="button" onClick={() => move(1)} disabled={index >= last} className={cn(control, "fixed right-3 top-1/2 -translate-y-1/2")} aria-label="다음 글자"><ChevronRight size={22} /></button>
      <p className="pb-2 text-center text-[.7rem] text-[#6d6252]/70">Space 병음·뜻 보기 · S 소리 · ← → 넘기기 · F 전체 화면 · Esc 닫기</p>
    </div>
  );
}

function HanziEditor({ initial, texts, tabs }: { initial: Stored; texts: { id: string; title: string; text: string }[]; tabs?: React.ReactNode }) {
  const [title, setTitle] = useState(initial.title);
  const [chars, setChars] = useState<string[]>(initial.chars);
  const [overrides, setOverrides] = useState<Record<string, HanziOverride>>(initial.overrides);
  const [view, setView] = useState<View>(initial.view);
  const [practice, setPractice] = useState(initial.practice);
  const [quiz, setQuiz] = useState(initial.quiz);
  const [source, setSource] = useState("");
  const [textId, setTextId] = useState(texts[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const closeFlash = useCallback(() => setFlash(false), []);
  const [confirm, confirmDialog] = useConfirm();
  const { supported, hasVoice, speak } = useSpeech("zh-CN");
  useEffect(() => () => controller.current?.abort(), []);

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ title, chars, overrides, view, practice, quiz })); } catch { /* 저장하지 못해도 이번 화면에서는 계속 쓸 수 있습니다. */ }
  }, [title, chars, overrides, view, practice, quiz]);

  const cards = chars.map(char => hanziCard(char, overrides[char]));
  function addChars(found: string[]) {
    const fresh = found.filter(char => !chars.includes(char));
    const room = MAX_HANZI_SET - chars.length;
    setChars([...chars, ...fresh.slice(0, room)]);
    setMessage(!found.length ? "넣을 간체자가 없어요." : `${Math.min(fresh.length, room)}자를 넣었어요.${found.length > fresh.length ? ` (이미 있는 ${found.length - fresh.length}자 제외)` : ""}${fresh.length > room ? ` ${MAX_HANZI_SET}자까지만 넣을 수 있어요.` : ""}`);
  }
  const setOverride = (char: string, next: HanziOverride | undefined) => setOverrides(current => {
    const copy = { ...current };
    if (next && (next.meaning?.trim() || next.words)) copy[char] = next;
    else delete copy[char];
    return copy;
  });

  // 뜻이나 낱말이 비어 있는 글자만 AI로 채웁니다. 선생님이 적은 뜻·낱말은 덮어쓰지 않습니다.
  const missing = chars.filter(char => !overrides[char]?.meaning?.trim() || !overrides[char]?.words?.length);
  async function fill() {
    const targets = missing.filter(char => hanziCard(char).known);
    if (!targets.length) { setMessage("모든 글자에 뜻과 낱말이 있어요."); return; }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setFilling(true);
    setError("");
    let rejected = 0;
    try {
      for (let start = 0; start < targets.length; start += HANZI_FILL_PER_REQUEST) {
        const data = await readJson<{ filled: Record<string, { meaning: string; words: HanziWord[] }>; rejected: number }>(await fetch("/api/teacher/chinese/hanzi", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: request.signal,
          body: JSON.stringify({ chars: targets.slice(start, start + HANZI_FILL_PER_REQUEST) }),
        }));
        rejected += data.rejected;
        setOverrides(current => {
          const copy = { ...current };
          for (const [char, value] of Object.entries(data.filled)) {
            copy[char] = {
              ...copy[char],
              ...(!copy[char]?.meaning?.trim() && value.meaning && { meaning: value.meaning }),
              ...(!copy[char]?.words?.length && value.words.length && { words: value.words }),
            };
          }
          return copy;
        });
      }
      setMessage(`뜻과 낱말을 채웠어요.${rejected ? ` 병음이 사전과 맞지 않는 낱말 ${rejected}개는 뺐어요.` : ""} 뜻은 한 번 확인해 주세요.`);
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : "뜻과 낱말을 채우지 못했습니다.");
    } finally {
      if (controller.current === request) controller.current = null;
      setFilling(false);
    }
  }

  const quizSections = buildHanziQuiz(cards, quiz);
  const quizOptions = { title, answers: quiz.answers };
  const cellsCount = hanziPracticeSizes[practice.size].cells;
  const notice = speechNotice(supported, hasVoice, "zh-CN");
  const chipClass = (active: boolean) => cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-[.82rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand",
    active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark");
  const tabClass = (active: boolean) => cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", active ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark");

  async function copyQuiz() {
    await copyToClipboard({ text: hanziQuizText(quizSections, quizOptions), html: hanziQuizHtml(quizSections, quizOptions, "clipboard") });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><Lamp size={16} /> 교사 지원실 · 중국어</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">간체자 카드 · 쓰기 연습지 · 퀴즈</h1>
          <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3 lg:min-h-12 xl:min-h-6">본문이나 단원 글자를 붙여 넣으면 통용규범한자표에서 병음·획수·번체자를 채우고, 번체자를 거쳐 한국 한자 훈음(学 → 學 배울 학)도 보여 줍니다. 쓰기 연습지와 퀴즈를 바로 인쇄하고, 수업 시간에는 플래시 카드로 띄울 수 있어요.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
      </header>
      {tabs}

      <section className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4">
          <Card title="간체자 모으기" help="붙여 넣은 글에서 한자만 뽑아 겹치지 않게 넣습니다. 병음이나 한글이 섞여 있어도 괜찮아요.">
            <div className="space-y-2.5">
              <textarea lang="zh-CN" value={source} rows={4} onChange={event => setSource(event.target.value)} placeholder="본문이나 글자 목록을 붙여 넣으세요." className={cn(fieldClass, "font-zh resize-y text-[1rem] placeholder:font-sans placeholder:text-sm")} />
              <Button type="button" variant="secondary" className="w-full" disabled={!hanziOf(source).length || chars.length >= MAX_HANZI_SET} onClick={() => { addChars(uniqueHanzi(source)); setSource(""); }}><Plus size={15} /> 간체자 뽑아 넣기</Button>
              {texts.length > 0 && (
                <div className="flex gap-1.5 border-t border-line pt-2.5">
                  <select aria-label="저장한 본문" value={textId} onChange={event => setTextId(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-2.5 text-[.82rem] font-semibold text-ink">
                    {texts.map(text => <option key={text.id} value={text.id}>{text.title || text.text.trim().slice(0, 16)}</option>)}
                  </select>
                  <Button type="button" variant="ghost" size="sm" className="min-h-10" disabled={chars.length >= MAX_HANZI_SET} onClick={() => { const text = texts.find(item => item.id === textId); if (text) { addChars(uniqueHanzi(text.text)); if (!title) setTitle(text.title); } }}>본문에서 가져오기</Button>
                </div>
              )}
              <div className="flex flex-wrap gap-1 border-t border-line pt-2.5">
                <span className="self-center text-[.74rem] font-bold text-ink-4">자주 쓰는 글자</span>
                {[20, 40, 60].map(count => <Button key={count} type="button" variant="ghost" size="sm" disabled={chars.length >= MAX_HANZI_SET} onClick={() => addChars(commonHanzi(count))}><Sparkles size={13} /> 상위 {count}자</Button>)}
              </div>
              {message && <p role="status" className="text-[.76rem] font-semibold text-ink-3">{message}</p>}
            </div>
          </Card>
          <Card title={`학습 글자 ${chars.length} / ${MAX_HANZI_SET}`} action={chars.length > 0 && <button type="button" onClick={async () => { if (await confirm({ eyebrow: "간체자 학습지", title: "학습 글자를 모두 뺄까요?", tone: "danger", confirmLabel: "모두 빼기", description: `학습 글자 ${chars.length}자를 목록에서 뺍니다.`, note: "카드에서 고친 뜻·낱말은 남아서, 같은 글자를 다시 넣으면 그대로 보여요." })) setChars([]); }} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-ink-4 hover:bg-surface-2 hover:text-danger"><Trash2 size={13} /> 비우기</button>}>
            <label className="block text-[.76rem] font-bold text-ink-3">학습지 제목
              <input value={title} maxLength={100} onChange={event => setTitle(event.target.value)} placeholder="예: 3과 새 글자" className={cn(fieldClass, "mt-1")} />
            </label>
            {chars.length ? (
              <ul className="mt-3 flex flex-wrap gap-1">
                {cards.map(card => (
                  <li key={card.char}>
                    <button type="button" onClick={() => setChars(chars.filter(item => item !== card.char))} title={`${card.char} 빼기`} lang="zh-CN"
                      className={cn("font-zh grid size-10 place-items-center rounded-lg border text-[1.3rem] transition-colors hover:border-danger/40 hover:bg-[var(--danger-page)] hover:text-danger", !card.known ? "border-danger/30 bg-[var(--danger-page)]" : card.common ? "border-line bg-surface" : "border-warn/30 bg-[var(--warn-page)]")}>{card.char}</button>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-[.8rem] text-ink-4">위에서 간체자를 넣어 주세요.</p>}
            {cards.some(card => !card.known) && <p className="mt-2 text-[.72rem] font-semibold text-danger">빨간 칸은 통용규범한자표에 없는 글자예요(번체자일 수 있어요).</p>}
            <Button type="button" className="mt-3 w-full" disabled={!chars.length || filling || !missing.length} onClick={() => void fill()}>
              {filling ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />} {filling ? "뜻과 낱말을 고르는 중…" : `뜻·낱말 채우기 (AI · ${missing.length}자)`}
            </Button>
            <p className="mt-1.5 text-[.72rem] leading-5 text-ink-4">AI가 현대 중국어 뜻과 자주 쓰는 낱말을 골라요. 낱말은 병음이 사전과 맞는 것만 남기고, 한 글자에 {HANZI_WORDS_PER_CHAR}개까지 넣어요. 직접 적은 뜻·낱말은 그대로 둬요.</p>
            {error && <p role="alert" className="mt-2 flex items-start gap-2 text-xs font-semibold leading-5 text-danger"><AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}</p>}
          </Card>
          {notice && <p role="status" className="rounded-xl border border-warn/25 bg-[var(--warn-page)] px-3.5 py-2.5 text-[.76rem] font-semibold leading-5 text-warn">{notice}</p>}
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <nav aria-label="간체자 학습지 보기" className="flex w-fit flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
              <button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")} className={tabClass(view === "cards")}><LayoutGrid size={16} /> 글자 카드</button>
              <button type="button" aria-pressed={view === "practice"} onClick={() => setView("practice")} className={tabClass(view === "practice")}><Grid3x3 size={16} /> 쓰기 연습지</button>
              <button type="button" aria-pressed={view === "quiz"} onClick={() => setView("quiz")} className={tabClass(view === "quiz")}><ListChecks size={16} /> 간체자 퀴즈</button>
            </nav>
            <Button variant="secondary" size="sm" disabled={!chars.length} onClick={() => setFlash(true)} title="간체자를 한 글자씩 크게 띄우고 병음·뜻을 보여 줘요"><MonitorPlay size={15} /> 플래시 카드</Button>
          </div>

          {!chars.length ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-8 text-center text-[.9rem] text-ink-3">
              <Grid3x3 size={24} className="text-brand" />
              <ol className="grid w-full max-w-3xl gap-2 text-left sm:grid-cols-3">
                {[
                  ["글자 모으기", "본문이나 단원 글자를 붙여 넣으면 한자만 뽑아요. ‘본문 풀이’에 저장한 본문이나 자주 쓰는 글자에서 가져올 수도 있어요."],
                  ["카드 확인", "병음·획수·번체자·한국 한자 훈음은 사전에서 채워져요. 중국어 뜻과 낱말은 카드에서 적어 주세요."],
                  ["인쇄·수업", "쓰기 연습지와 퀴즈를 인쇄하고, 수업 시간에는 ‘플래시 카드’로 한 글자씩 띄워요."],
                ].map(([heading, body], index) => (
                  <li key={heading} className="rounded-xl bg-surface p-3.5 shadow-[var(--lift-1)]">
                    <p className="flex items-center gap-2 font-bold text-ink"><span className="grid size-6 place-items-center rounded-full bg-brand-soft text-[.75rem] text-brand-dark">{index + 1}</span>{heading}</p>
                    <p className="mt-1.5 break-keep text-[.82rem] leading-6">{body}</p>
                  </li>
                ))}
              </ol>
              <Button variant="secondary" size="sm" onClick={() => addChars(commonHanzi(20))}><Sparkles size={15} /> 자주 쓰는 글자 20자 넣기</Button>
            </div>
          ) : view === "cards" ? (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {cards.map(card => <HanziCardView key={card.char} card={card} override={overrides[card.char]} speak={speak} onChange={next => setOverride(card.char, next)} onRemove={() => setChars(chars.filter(item => item !== card.char))} />)}
            </div>
          ) : view === "practice" ? (
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
              <Card title="쓰기 칸">
                <div className="space-y-3">
                  <Segmented label="칸 크기" value={practice.size} onChange={size => setPractice({ ...practice, size: size as HanziPracticeSize, trace: Math.min(practice.trace, hanziPracticeSizes[size as HanziPracticeSize].cells) })}
                    options={(Object.keys(hanziPracticeSizes) as HanziPracticeSize[]).map(size => ({ value: size, label: `${hanziPracticeSizes[size].label} (${hanziPracticeSizes[size].cells}칸)` }))} />
                  <div>
                    <p className="mb-1 text-xs font-semibold text-ink-4">따라 쓰기 칸 (연한 글자)</p>
                    <Segmented label="따라 쓰기 칸" value={practice.trace} onChange={trace => setPractice({ ...practice, trace })} options={[0, 1, 2, 3, cellsCount].map(value => ({ value, label: value === cellsCount ? "모두" : `${value}칸` }))} />
                  </div>
                  <Toggle label="한국 한자 훈음 적기" checked={practice.korean} onChange={korean => setPractice({ ...practice, korean })} help="번체자를 거친 한국 한자 훈음을 줄 아래에 적어요(学 → 學 배울 학)." />
                  <Toggle label="낱말 줄 넣기" checked={practice.words} onChange={words => setPractice({ ...practice, words })} help="카드에 낱말을 적은 글자만 줄 아래에 낱말을 적어요." />
                </div>
              </Card>
              <div className="min-w-0 space-y-3">
                <div className="flex justify-end"><Button variant="secondary" size="sm" onClick={() => window.print()} title="A4 세로로 인쇄해요"><Printer size={15} /> 인쇄</Button></div>
                <PrintablePage id="hanzi-practice-print" html={hanziPracticeHtml(cards, { title, ...practice })} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
              <Card title="문항 유형" help="뜻 문항은 카드에 뜻이 있을 때, 번체 → 간체는 번체자가 다른 글자일 때, 낱말 병음은 카드에 낱말을 적었을 때 만들어져요.">
                <div className="flex flex-wrap gap-1.5">
                  {hanziQuizTypeKeys.map(type => <button key={type} type="button" aria-pressed={quiz.types.includes(type)} onClick={() => setQuiz(current => ({ ...current, types: current.types.includes(type) ? current.types.filter(item => item !== type) : [...current.types, type] }))} className={chipClass(quiz.types.includes(type))}>{hanziQuizTypes[type].label}</button>)}
                </div>
                <div className="mt-3 border-t border-line pt-2">
                  <Toggle label="순서 섞기" checked={quiz.shuffle} onChange={shuffle => setQuiz({ ...quiz, shuffle })} />
                  <Toggle label="정답지 붙이기" checked={quiz.answers} onChange={answers => setQuiz({ ...quiz, answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
                  {quiz.shuffle && <Button variant="ghost" size="sm" className="mt-1" onClick={() => setQuiz({ ...quiz, seed: quiz.seed + 1 })}><Shuffle size={14} /> 다시 섞기</Button>}
                </div>
              </Card>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button variant="secondary" size="sm" disabled={!quizSections.length} onClick={() => void copyQuiz()} title="한글·워드에 붙여 넣을 수 있게 복사해요">{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "한글에 붙여 넣기용 복사"}</Button>
                  <Button variant="secondary" size="sm" disabled={!quizSections.length} onClick={() => window.print()}><Printer size={15} /> 인쇄</Button>
                </div>
                {quizSections.length
                  ? <PrintablePage id="hanzi-quiz-print" html={hanziQuizHtml(quizSections, quizOptions, "screen")} />
                  : <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-16 text-center text-[.9rem] text-ink-3">문항 유형을 골라 주세요.</p>}
              </div>
            </div>
          )}
        </div>
      </section>
      {confirmDialog}
      {flash && <HanziFlash cards={cards} speak={speak} onClose={closeFlash} />}
    </div>
  );
}
