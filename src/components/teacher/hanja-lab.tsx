"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { AlertCircle, ClipboardCheck, Copy, Grid3x3, LayoutGrid, ListChecks, LoaderCircle, MonitorPlay, PencilLine, Plus, Printer, RotateCcw, Shuffle, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { hanjaOf } from "@/features/hanmun/content";
import { hanjaEntry, mainMeaning, meaningLine } from "@/features/hanmun/dictionary";
import { HANJA_EXAMPLE } from "@/features/hanmun/examples";
import {
  buildQuiz, hanjaWordSchema, MAX_SET, practiceHtml, practiceSizes, quizHtml, quizText, quizTypeKeys, quizTypes, WORDS_PER_CHAR, WORDS_PER_REQUEST,
  type HanjaCard, type HanjaWord, type PracticeSize, type QuizType,
} from "@/features/hanmun/hanja";
import { Card, Segmented, Toggle } from "./tool-panel";
import { copyToClipboard, PrintablePage } from "./hanmun-sheet";
import { HanjaFlash } from "./hanja-flash";

type View = "cards" | "practice" | "quiz";
type PickMode = "all" | "education" | "outside";
type Override = { meaning?: string; words?: HanjaWord[] };

// 학습 한자와 교사가 고친 훈음·한자어는 이 브라우저에만 저장합니다. 고친 내용은 다른 한자 묶음에서도 그대로 씁니다.
const storageKey = "learncraft_hanja_v1";
// 원문 풀이 도구(hanmun-lab)가 저장한 원문에서 한자를 가져옵니다.
const textStorageKey = "learncraft_hanmun_v1";
const storedSchema = z.object({
  title: z.string().max(100).catch(""),
  chars: z.array(z.string().max(2)).max(MAX_SET).catch([]),
  overrides: z.record(z.string(), z.object({ meaning: z.string().max(80).optional(), words: z.array(hanjaWordSchema).max(5).optional() })).catch({}),
  view: z.enum(["cards", "practice", "quiz"]).catch("cards"),
  pick: z.enum(["all", "education", "outside"]).catch("all"),
  practice: z.object({ size: z.enum(["normal", "large"]).catch("normal"), trace: z.number().int().min(0).max(9).catch(3), words: z.boolean().catch(true) }).catch({ size: "normal", trace: 3, words: true }),
  quiz: z.object({
    types: z.array(z.enum(quizTypeKeys as [QuizType, ...QuizType[]])).catch(["meaning", "char"]),
    shuffle: z.boolean().catch(true), seed: z.number().int().catch(1), answers: z.boolean().catch(true),
  }).catch({ types: ["meaning", "char"], shuffle: true, seed: 1, answers: true }),
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
    return Array.isArray(docs) ? docs.flatMap(doc => typeof doc?.id === "string" && typeof doc?.text === "string" && hanjaOf(doc.text).length ? [{ id: doc.id, title: String(doc.title ?? ""), text: doc.text }] : []) : [];
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

function toCard(char: string, override: Override | undefined): HanjaCard {
  const entry = hanjaEntry(char);
  const meaning = override?.meaning?.trim() || meaningLine(entry);
  return {
    char, meaning,
    main: override?.meaning?.trim() ? meaning.split("/")[0].trim() : mainMeaning(entry?.readings[0]),
    radical: entry?.radical ? `${entry.radical.char} ${entry.radical.label}` : "",
    strokes: entry?.strokes ?? 0, education: entry?.education ?? false, words: override?.words ?? [],
  };
}

export function HanjaLab({ tabs }: { tabs?: React.ReactNode }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? <HanjaEditor initial={readStored()} texts={readTexts()} tabs={tabs} /> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 한자 학습지 도구를 준비하는 중…</div>;
}

const fieldClass = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-ink-5 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";

function CardEditor({ card, override, onChange }: { card: HanjaCard; override: Override | undefined; onChange: (next: Override | undefined) => void }) {
  const words = override?.words ?? card.words;
  const setWords = (next: HanjaWord[]) => onChange({ ...override, words: next });
  const setWord = (index: number, patch: Partial<HanjaWord>) => setWords(words.map((word, position) => position === index ? { ...word, ...patch } : word));
  return (
    <div className="mt-3 space-y-2.5 rounded-xl border border-brand/15 bg-brand-page/50 p-3">
      <label className="block text-[.76rem] font-bold text-ink-3">훈음 <span className="font-semibold text-ink-5">음이 여럿이면 / 로 나눠요</span>
        <input value={override?.meaning ?? ""} maxLength={80} placeholder={meaningLine(hanjaEntry(card.char)) || "예: 배울 학"} onChange={event => onChange({ ...override, meaning: event.target.value })} className={cn(fieldClass, "mt-1")} />
      </label>
      <fieldset>
        <legend className="text-[.76rem] font-bold text-ink-3">한자어</legend>
        <div className="mt-1 space-y-1.5">
          {words.map((word, index) => (
            <div key={index} className="grid grid-cols-[4rem_3.6rem_minmax(0,1fr)_auto] gap-1.5">
              <input aria-label="한자어" value={word.word} maxLength={4} onChange={event => setWord(index, { word: event.target.value })} className={cn(fieldClass, "font-learning px-2")} />
              <input aria-label="독음" value={word.reading} maxLength={4} onChange={event => setWord(index, { reading: event.target.value })} className={cn(fieldClass, "px-2")} />
              <input aria-label="뜻" value={word.meaning} maxLength={60} onChange={event => setWord(index, { meaning: event.target.value })} className={cn(fieldClass, "px-2")} />
              <button type="button" onClick={() => setWords(words.filter((_, position) => position !== index))} className="grid min-h-10 w-8 place-items-center rounded-xl text-ink-5 hover:bg-surface hover:text-danger" aria-label={`${word.word || "한자어"} 지우기`}><X size={15} /></button>
            </div>
          ))}
          <div className="flex flex-wrap gap-1">
            {words.length < 5 && <Button type="button" variant="ghost" size="sm" onClick={() => setWords([...words, { word: "", reading: "", meaning: "" }])}><Plus size={14} /> 한자어 추가</Button>}
            {override && <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}><RotateCcw size={14} /> 사전 값으로 되돌리기</Button>}
          </div>
        </div>
      </fieldset>
    </div>
  );
}

function HanjaCardView({ card, override, onChange, onRemove }: { card: HanjaCard; override: Override | undefined; onChange: (next: Override | undefined) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [main, ...others] = card.meaning.split("/").map(part => part.trim());
  return (
    <article className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
      <div className="flex items-start gap-3">
        <span className="font-learning grid size-20 shrink-0 place-items-center rounded-2xl bg-surface-2 text-[3.2rem] leading-none text-ink">{card.char}</span>
        <div className="min-w-0 flex-1">
          <p className="break-keep text-[1.05rem] font-extrabold text-ink">{main || <span className="text-ink-5">사전에 없는 글자예요</span>}</p>
          {others.length > 0 && <p className="break-keep text-[.8rem] leading-5 text-ink-3">{others.join(" / ")}</p>}
          <p className="mt-1 flex flex-wrap gap-1 text-[.7rem] font-bold">
            {card.radical && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-3">부수 {card.radical}</span>}
            {card.strokes > 0 && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-ink-3">{card.strokes}획</span>}
            <span className={cn("rounded-full px-2 py-0.5", card.education ? "bg-brand-page text-brand-dark" : "bg-[var(--warn-page)] text-warn")}>{card.education ? "기초한자" : "기초한자 밖"}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col">
          <button type="button" onClick={() => setEditing(value => !value)} className={cn("grid size-8 place-items-center rounded-lg hover:bg-brand-page hover:text-brand-dark", editing ? "text-brand-dark" : "text-ink-4")} aria-label={`${card.char} 고치기`}><PencilLine size={15} /></button>
          <button type="button" onClick={onRemove} className="grid size-8 place-items-center rounded-lg text-ink-5 hover:bg-surface-2 hover:text-danger" aria-label={`${card.char} 빼기`}><X size={15} /></button>
        </div>
      </div>
      {card.words.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line pt-2.5 text-[.82rem] leading-5">
          {card.words.map((word, index) => <li key={index} className="break-keep"><span className="font-learning font-bold text-ink">{word.word}</span> <span className="text-ink-4">{word.reading}</span> <span className="text-ink-2">{word.meaning}</span></li>)}
        </ul>
      )}
      {override?.meaning?.trim() && <p className="mt-2 text-[.7rem] font-semibold text-brand">훈음을 직접 고쳤어요</p>}
      {editing && <CardEditor card={card} override={override} onChange={onChange} />}
    </article>
  );
}

function HanjaEditor({ initial, texts, tabs }: { initial: Stored; texts: { id: string; title: string; text: string }[]; tabs?: React.ReactNode }) {
  const [title, setTitle] = useState(initial.title);
  const [chars, setChars] = useState<string[]>(initial.chars);
  const [overrides, setOverrides] = useState<Record<string, Override>>(initial.overrides);
  const [view, setView] = useState<View>(initial.view);
  const [pick, setPick] = useState<PickMode>(initial.pick);
  const [practice, setPractice] = useState(initial.practice);
  const [quiz, setQuiz] = useState(initial.quiz);
  const [source, setSource] = useState("");
  const [textId, setTextId] = useState(texts[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const closeFlash = useCallback(() => setFlash(false), []);
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ title, chars, overrides, view, pick, practice, quiz })); } catch { /* 저장하지 못해도 이번 화면에서는 계속 쓸 수 있습니다. */ }
  }, [title, chars, overrides, view, pick, practice, quiz]);
  useEffect(() => () => controller.current?.abort(), []);

  const cards = chars.map(char => toCard(char, overrides[char]));

  function addChars(text: string) {
    const found = [...new Set(hanjaOf(text))].filter(char => pick === "all" || (pick === "education") === (hanjaEntry(char)?.education ?? false));
    const fresh = found.filter(char => !chars.includes(char));
    const room = MAX_SET - chars.length;
    setChars([...chars, ...fresh.slice(0, room)]);
    setMessage(!found.length ? "넣을 한자가 없어요." : `${Math.min(fresh.length, room)}자를 넣었어요.${found.length > fresh.length ? ` (이미 있는 ${found.length - fresh.length}자 제외)` : ""}${fresh.length > room ? ` ${MAX_SET}자까지만 넣을 수 있어요.` : ""}`);
  }
  // 예시 한자와 한자어를 넣습니다. 선생님이 이미 고친 훈음·한자어는 덮어쓰지 않습니다.
  async function loadExample() {
    const exampleChars = [...new Set(hanjaOf(HANJA_EXAMPLE.text))];
    if (chars.length && chars.join("") !== exampleChars.join("") && !await confirm({
      eyebrow: "한자 학습지", title: "예시 한자로 바꿀까요?", confirmLabel: "예시로 바꾸기",
      description: `지금 학습 한자 ${chars.length}자를 논어 학이편 1장 한자 ${exampleChars.length}자로 바꿉니다.`,
      note: "카드에서 고친 훈음·한자어는 그대로 남아요.",
    })) return;
    setTitle(HANJA_EXAMPLE.title);
    setChars(exampleChars);
    setOverrides(current => {
      const copy = { ...current };
      for (const char of exampleChars) {
        const meaning = copy[char]?.meaning?.trim() || HANJA_EXAMPLE.meanings[char];
        const words = copy[char]?.words?.length ? copy[char].words : HANJA_EXAMPLE.words[char];
        if (meaning || words) copy[char] = { ...(meaning && { meaning }), ...(words && { words }) };
      }
      return copy;
    });
    setView("cards");
    setMessage("예시 한자 21자를 넣었어요. 카드·쓰기 연습지·훈음 퀴즈를 둘러보세요.");
  }
  const setOverride = (char: string, next: Override | undefined) => setOverrides(current => {
    const copy = { ...current };
    if (next && (next.meaning?.trim() || next.words)) copy[char] = next;
    else delete copy[char];
    return copy;
  });

  async function fillWords() {
    const targets = chars.filter(char => !overrides[char]?.words?.length && hanjaEntry(char));
    if (!targets.length) { setMessage("모든 한자에 한자어가 있어요."); return; }
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setFilling(true);
    setError("");
    let rejected = 0;
    try {
      for (let start = 0; start < targets.length; start += WORDS_PER_REQUEST) {
        const data = await readJson<{ words: Record<string, HanjaWord[]>; rejected: number }>(await fetch("/api/teacher/hanmun/words", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: request.signal,
          body: JSON.stringify({ chars: targets.slice(start, start + WORDS_PER_REQUEST) }),
        }));
        rejected += data.rejected;
        setOverrides(current => {
          const copy = { ...current };
          for (const [char, words] of Object.entries(data.words)) if (words.length && !copy[char]?.words?.length) copy[char] = { ...copy[char], words };
          return copy;
        });
      }
      setMessage(`한자어를 채웠어요.${rejected ? ` 사전에 없는 낱말 ${rejected}개는 뺐어요.` : ""}`);
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : "한자어를 채우지 못했습니다.");
    } finally {
      if (controller.current === request) controller.current = null;
      setFilling(false);
    }
  }

  const quizSections = buildQuiz(cards, quiz);
  const quizOptions = { title, answers: quiz.answers };
  const cells = practiceSizes[practice.size].cells;
  const missingWords = chars.filter(char => !overrides[char]?.words?.length).length;
  const chipClass = (active: boolean) => cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-[.82rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand",
    active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark");
  const tabClass = (active: boolean) => cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", active ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark");

  async function copyQuiz() {
    await copyToClipboard({ text: quizText(quizSections, quizOptions), html: quizHtml(quizSections, quizOptions, "clipboard") });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><Grid3x3 size={16} /> 교사 지원실 · 한문</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">한자 카드 · 쓰기 연습지 · 훈음 퀴즈</h1>
          <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3 lg:min-h-12 xl:min-h-6">원문이나 단원 한자를 붙여 넣으면 한자 사전에서 훈음·부수·획수를 채웁니다. 쓰기 연습지와 훈음 퀴즈를 바로 인쇄하고, 수업 시간에는 플래시 카드로 띄울 수 있어요.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
      </header>
      {tabs}

      <section className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4">
          <Card title="한자 모으기" help="붙여 넣은 글에서 한자만 뽑아 겹치지 않게 넣습니다. 토나 한글이 섞여 있어도 괜찮아요.">
            <div className="space-y-2.5">
              <Segmented label="뽑을 한자" value={pick} onChange={setPick} options={[{ value: "all", label: "모두" }, { value: "education", label: "기초한자", title: "교육용 기초한자 1,800자만" }, { value: "outside", label: "기초한자 밖", title: "교육용 기초한자에 없는 글자만" }]} />
              <textarea lang="ko" value={source} rows={4} onChange={event => setSource(event.target.value)} placeholder="원문이나 한자 목록을 붙여 넣으세요." className={cn(fieldClass, "font-learning resize-y text-[1rem] placeholder:font-sans placeholder:text-sm")} />
              <Button type="button" variant="secondary" className="w-full" disabled={!hanjaOf(source).length || chars.length >= MAX_SET} onClick={() => { addChars(source); setSource(""); }}><Plus size={15} /> 한자 뽑아 넣기</Button>
              {texts.length > 0 && (
                <div className="flex gap-1.5 border-t border-line pt-2.5">
                  <select aria-label="저장한 원문" value={textId} onChange={event => setTextId(event.target.value)} className="min-h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-2.5 text-[.82rem] font-semibold text-ink">
                    {texts.map(text => <option key={text.id} value={text.id}>{text.title || text.text.trim().slice(0, 16)}</option>)}
                  </select>
                  <Button type="button" variant="ghost" size="sm" className="min-h-10" disabled={chars.length >= MAX_SET} onClick={() => { const text = texts.find(item => item.id === textId); if (text) { addChars(text.text); if (!title) setTitle(text.title); } }}>원문에서 가져오기</Button>
                </div>
              )}
              <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => void loadExample()}><Sparkles size={14} /> 예시 한자 넣기 (논어 학이편 1장)</Button>
              {message && <p role="status" className="text-[.76rem] font-semibold text-ink-3">{message}</p>}
            </div>
          </Card>
          <Card title={`학습 한자 ${chars.length} / ${MAX_SET}`} action={chars.length > 0 && <button type="button" onClick={async () => { if (await confirm({ eyebrow: "한자 학습지", title: "학습 한자를 모두 뺄까요?", tone: "danger", confirmLabel: "모두 빼기", description: `학습 한자 ${chars.length}자를 목록에서 뺍니다.`, note: "카드에서 고친 훈음·한자어는 남아서, 같은 한자를 다시 넣으면 그대로 보여요." })) setChars([]); }} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-ink-4 hover:bg-surface-2 hover:text-danger"><Trash2 size={13} /> 비우기</button>}>
            <label className="block text-[.76rem] font-bold text-ink-3">학습지 제목
              <input value={title} maxLength={100} onChange={event => setTitle(event.target.value)} placeholder="예: 3단원 새 한자" className={cn(fieldClass, "mt-1")} />
            </label>
            {chars.length ? (
              <ul className="mt-3 flex flex-wrap gap-1">
                {chars.map(char => (
                  <li key={char}>
                    <button type="button" onClick={() => setChars(chars.filter(item => item !== char))} title={`${char} 빼기`}
                      className={cn("font-learning group relative grid size-10 place-items-center rounded-lg border text-[1.3rem] transition-colors hover:border-danger/40 hover:bg-[var(--danger-page)] hover:text-danger", hanjaEntry(char)?.education ? "border-line bg-surface" : "border-warn/30 bg-[var(--warn-page)]")}>{char}</button>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-[.8rem] text-ink-4">위에서 한자를 넣어 주세요.</p>}
            <Button type="button" className="mt-3 w-full" disabled={!chars.length || filling || !missingWords} onClick={() => void fillWords()}>
              {filling ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />} {filling ? "한자어를 고르는 중…" : `한자어 예시 채우기 (AI · ${missingWords}자)`}
            </Button>
            <p className="mt-1.5 text-[.72rem] leading-5 text-ink-4">AI가 고른 한자어는 사전에 있는 낱말만 남기고, 독음은 사전 독음으로 맞춥니다. 뜻풀이는 확인해 주세요. 한 글자에 {WORDS_PER_CHAR}개까지 넣어요.</p>
            {error && <p role="alert" className="mt-2 flex items-start gap-2 text-xs font-semibold leading-5 text-danger"><AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}</p>}
          </Card>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <nav aria-label="한자 학습지 보기" className="flex w-fit gap-1 rounded-2xl border border-line bg-surface-2 p-1">
              <button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")} className={tabClass(view === "cards")}><LayoutGrid size={16} /> 한자 카드</button>
              <button type="button" aria-pressed={view === "practice"} onClick={() => setView("practice")} className={tabClass(view === "practice")}><Grid3x3 size={16} /> 쓰기 연습지</button>
              <button type="button" aria-pressed={view === "quiz"} onClick={() => setView("quiz")} className={tabClass(view === "quiz")}><ListChecks size={16} /> 훈음 퀴즈</button>
            </nav>
            <Button variant="secondary" size="sm" disabled={!chars.length} onClick={() => setFlash(true)} title="한자를 한 글자씩 크게 띄우고 훈음을 가렸다 보여 줘요"><MonitorPlay size={15} /> 플래시 카드</Button>
          </div>

          {!chars.length ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-8 text-center text-[.9rem] text-ink-3">
              <Grid3x3 size={24} className="text-brand" />
              <ol className="grid w-full max-w-3xl gap-2 text-left sm:grid-cols-3">
                {[
                  ["한자 모으기", "원문이나 단원 한자를 붙여 넣으면 한자만 뽑아요. ‘원문 풀이’에 저장한 원문에서 가져올 수도 있어요."],
                  ["카드 확인", "훈음·부수·획수는 사전에서 채워져요. 교과서와 다른 훈음은 카드에서 고치고, 한자어는 AI로 채워요."],
                  ["인쇄·수업", "쓰기 연습지와 훈음 퀴즈를 인쇄하고, 수업 시간에는 ‘플래시 카드’로 한 글자씩 띄워요."],
                ].map(([title, body], index) => (
                  <li key={title} className="rounded-xl bg-surface p-3.5 shadow-[var(--lift-1)]">
                    <p className="flex items-center gap-2 font-bold text-ink"><span className="grid size-6 place-items-center rounded-full bg-brand-soft text-[.75rem] text-brand-dark">{index + 1}</span>{title}</p>
                    <p className="mt-1.5 break-keep text-[.82rem] leading-6">{body}</p>
                  </li>
                ))}
              </ol>
              <div>
                <p className="font-bold text-ink-2">처음이라면 예시 한자로 먼저 둘러보세요.</p>
                <Button variant="secondary" size="sm" className="mt-2.5" onClick={() => void loadExample()}><Sparkles size={15} /> 논어 학이편 1장 한자 예시 열기</Button>
              </div>
            </div>
          ) : view === "cards" ? (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {cards.map(card => <HanjaCardView key={card.char} card={card} override={overrides[card.char]} onChange={next => setOverride(card.char, next)} onRemove={() => setChars(chars.filter(item => item !== card.char))} />)}
            </div>
          ) : view === "practice" ? (
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
              <Card title="쓰기 칸">
                <div className="space-y-3">
                  <Segmented label="칸 크기" value={practice.size} onChange={size => setPractice({ ...practice, size: size as PracticeSize, trace: Math.min(practice.trace, practiceSizes[size as PracticeSize].cells) })}
                    options={(Object.keys(practiceSizes) as PracticeSize[]).map(size => ({ value: size, label: `${practiceSizes[size].label} (${practiceSizes[size].cells}칸)` }))} />
                  <div>
                    <p className="mb-1 text-xs font-semibold text-ink-4">따라 쓰기 칸 (연한 글자)</p>
                    <Segmented label="따라 쓰기 칸" value={practice.trace} onChange={trace => setPractice({ ...practice, trace })} options={[0, 1, 2, 3, cells].map(value => ({ value, label: value === cells ? "모두" : `${value}칸` }))} />
                  </div>
                  <Toggle label="한자어 줄 넣기" checked={practice.words} onChange={words => setPractice({ ...practice, words })} help="카드에 한자어가 있는 글자만 줄 아래에 한자어를 적어요." />
                </div>
              </Card>
              <div className="min-w-0 space-y-3">
                <div className="flex justify-end"><Button variant="secondary" size="sm" onClick={() => window.print()} title="A4 세로로 인쇄해요"><Printer size={15} /> 인쇄</Button></div>
                <PrintablePage id="hanja-practice-print" html={practiceHtml(cards, { title, ...practice })} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
              <Card title="문항 유형" help="한자어 문항은 카드에 한자어가 있을 때만 만들어져요.">
                <div className="flex flex-wrap gap-1.5">
                  {quizTypeKeys.map(type => <button key={type} type="button" aria-pressed={quiz.types.includes(type)} onClick={() => setQuiz(current => ({ ...current, types: current.types.includes(type) ? current.types.filter(item => item !== type) : [...current.types, type] }))} className={chipClass(quiz.types.includes(type))}>{quizTypes[type].label}</button>)}
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
                  ? <PrintablePage id="hanja-quiz-print" html={quizHtml(quizSections, quizOptions, "screen")} />
                  : <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-16 text-center text-[.9rem] text-ink-3">문항 유형을 골라 주세요. 한자어 문항은 ‘한자어 예시 채우기’를 먼저 해 주세요.</p>}
              </div>
            </div>
          )}
        </div>
      </section>
      {confirmDialog}
      {flash && <HanjaFlash cards={cards} onClose={closeFlash} />}
    </div>
  );
}
