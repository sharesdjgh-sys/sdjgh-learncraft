"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { AlertCircle, FileText, LoaderCircle, MonitorPlay, PencilLine, Plus, ScrollText, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { hanjaOf, MAX_HANJA, MAX_TEXT_LENGTH, sheetTypeKeys, splitSentences, textMismatch, wordSchema, type HanmunSentence, type SheetType } from "@/features/hanmun/content";
import { HANMUN_EXAMPLES, type HanmunExample } from "@/features/hanmun/examples";
import { IssueList, SentenceCard, type EditableSentence } from "./hanmun-sentence";
import { HanmunSheet, type SheetSettings } from "./hanmun-sheet";
import { HanmunShow } from "./hanmun-show";

type Tab = "review" | "sheet";
type Doc = { id: string; title: string; text: string; summary: string; sentences: EditableSentence[]; skip: string[]; updatedAt: number };

const endpoint = "/api/teacher/hanmun";
const MAX_DOCS = 30;
const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const newDoc = (): Doc => ({ id: makeId(), title: "", text: "", summary: "", sentences: [], skip: [], updatedAt: Date.now() });
const withIds = (sentences: HanmunSentence[]): EditableSentence[] => sentences.map(sentence => ({ ...sentence, id: makeId(), checked: false }));
const defaultSheet: SheetSettings = { types: ["reading", "translation", "blank"], withHyeonto: true, answers: true };

// 원문과 풀이는 이 브라우저에만 저장합니다. 깨진 원문 하나 때문에 나머지를 잃지 않도록 원문마다 따로 확인합니다.
const storageKey = "learncraft_hanmun_v1";
const sentenceStored = z.object({
  id: z.string(), checked: z.boolean().catch(false),
  hyeonto: z.string().max(400), reading: z.string().max(400).catch(""), order: z.array(z.number().int().min(0)).nullable().catch(null),
  literal: z.string().max(600).catch(""), free: z.string().max(600).catch(""), point: z.string().max(300).catch(""), words: z.array(wordSchema).max(10).catch([]),
});
const docSchema = z.object({
  id: z.string(), title: z.string().max(100).catch(""), text: z.string().max(MAX_TEXT_LENGTH * 2).catch(""), summary: z.string().max(1000).catch(""),
  sentences: z.array(sentenceStored).max(60).catch([]), skip: z.array(z.string()).catch([]), updatedAt: z.number().catch(0),
});
const storedSchema = z.object({
  docs: z.array(z.unknown()).catch([]).transform(items => items.flatMap(item => { const parsed = docSchema.safeParse(item); return parsed.success ? [parsed.data] : []; }).slice(0, MAX_DOCS)),
  currentId: z.string().nullable().catch(null),
  tab: z.enum(["review", "sheet"]).catch("review"),
  sheet: z.object({
    types: z.array(z.enum(sheetTypeKeys as [SheetType, ...SheetType[]])).catch(defaultSheet.types),
    withHyeonto: z.boolean().catch(true), answers: z.boolean().catch(true),
  }).catch(defaultSheet),
});
type Stored = z.infer<typeof storedSchema>;
function readStored(): Stored {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return storedSchema.parse(saved ? JSON.parse(saved) : {});
  } catch {
    // 저장소를 쓸 수 없거나 내용이 깨졌으면 빈 화면으로 시작합니다.
    return storedSchema.parse({});
  }
}
const noop = () => () => {};

async function readJson<T>(response: Response) {
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "요청을 처리하지 못했습니다.");
  return data;
}

export function HanmunLab({ tabs }: { tabs?: React.ReactNode }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? <HanmunEditor initial={readStored()} tabs={tabs} /> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 한문 학습지 도구를 준비하는 중…</div>;
}

function HanmunEditor({ initial, tabs }: { initial: Stored; tabs?: React.ReactNode }) {
  const [docs, setDocs] = useState<Doc[]>(() => initial.docs.length ? initial.docs : [newDoc()]);
  const [currentId, setCurrentId] = useState(() => initial.docs.some(doc => doc.id === initial.currentId) ? initial.currentId! : docs[0].id);
  const [tab, setTab] = useState<Tab>(initial.tab);
  const [sheet, setSheet] = useState<SheetSettings>(initial.sheet);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showing, setShowing] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const closeShow = useCallback(() => setShowing(false), []);
  const [confirm, confirmDialog] = useConfirm();
  const doc = docs.find(item => item.id === currentId) ?? docs[0];

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ docs, currentId, tab, sheet })); } catch { /* 저장하지 못해도 이번 화면에서는 계속 쓸 수 있습니다. */ }
  }, [docs, currentId, tab, sheet]);
  useEffect(() => () => controller.current?.abort(), []);

  const patchDoc = (id: string, patch: Partial<Doc>) => setDocs(current => current.map(item => item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item));
  const update = (patch: Partial<Doc>) => patchDoc(doc.id, patch);
  const setSentences = (sentences: EditableSentence[]) => update({ sentences });

  function openDoc(id: string) {
    setCurrentId(id);
    setError("");
  }
  function createDoc() {
    // 지금 원문이 비어 있으면 새로 만들지 않고 그대로 씁니다.
    if (!doc.text.trim() && !doc.sentences.length) return;
    const next = newDoc();
    setDocs(current => [next, ...current].slice(0, MAX_DOCS));
    openDoc(next.id);
    setTab("review");
  }
  // 예시는 검토 완료 상태로 넣어 학습지·수업 화면까지 바로 볼 수 있게 합니다. 이미 불러온 예시면 그 원문을 엽니다.
  function openExample(example: HanmunExample) {
    const existing = docs.find(item => item.title === example.title && item.text === example.text);
    if (existing) { openDoc(existing.id); setTab("review"); return; }
    const content = { title: example.title, text: example.text, summary: example.summary, sentences: withIds(example.sentences).map(sentence => ({ ...sentence, checked: true })), skip: [] };
    if (!doc.text.trim() && !doc.sentences.length) update(content);
    else {
      const next = { ...newDoc(), ...content };
      setDocs(current => [next, ...current].slice(0, MAX_DOCS));
      openDoc(next.id);
    }
    setTab("review");
  }
  async function deleteDoc(id: string) {
    const target = docs.find(item => item.id === id);
    if (!target || !await confirm({
      eyebrow: "저장한 원문", title: "원문을 지울까요?", tone: "danger", confirmLabel: "지우기",
      description: `‘${target.title || "제목 없는 원문"}’의 원문과 풀이를 지웁니다.`, note: "지운 원문은 되돌릴 수 없어요.",
    })) return;
    const rest = docs.filter(item => item.id !== id);
    const next = rest.length ? rest : [newDoc()];
    setDocs(next);
    if (id === currentId) openDoc([...next].sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
  }

  async function analyze() {
    if (doc.sentences.length && !await confirm({
      eyebrow: "원문 풀이", title: "AI로 풀이를 새로 만들까요?", tone: "danger", confirmLabel: "새로 만들기",
      description: `지금 풀이(문장 ${doc.sentences.length}개)를 지우고 AI가 만든 풀이로 바꿉니다.`,
      note: "직접 고친 내용과 검토 완료 표시가 모두 사라져요. 지금 풀이를 남겨 두려면 ‘새 원문’을 눌러 따로 만들어 주세요.",
    })) return;
    const id = doc.id;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setAnalyzing(id);
    setError("");
    try {
      const data = await readJson<{ summary: string; sentences: HanmunSentence[] }>(await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: request.signal,
        body: JSON.stringify({ text: doc.text, title: doc.title }),
      }));
      patchDoc(id, { summary: data.summary, sentences: withIds(data.sentences), skip: [] });
      setTab("review");
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : "풀이를 만들지 못했습니다.");
    } finally {
      if (controller.current === request) controller.current = null;
      setAnalyzing(null);
    }
  }

  async function startManual() {
    if (doc.sentences.length && !await confirm({
      eyebrow: "원문 풀이", title: "직접 입력으로 새로 시작할까요?", tone: "danger", confirmLabel: "빈칸으로 나누기",
      description: `지금 풀이(문장 ${doc.sentences.length}개)를 지우고 원문을 문장별 빈칸으로 나눕니다.`,
      note: "직접 고친 내용과 검토 완료 표시가 모두 사라져요.",
    })) return;
    update({ summary: "", sentences: withIds(splitSentences(doc.text)), skip: [] });
    setTab("review");
  }

  const hanCount = hanjaOf(doc.text).length;
  const textLength = doc.text.trim().length;
  const canAnalyze = hanCount >= 2 && hanCount <= MAX_HANJA && textLength <= MAX_TEXT_LENGTH && !analyzing;
  const checkedCount = doc.sentences.filter(sentence => sentence.checked).length;
  const mismatch = doc.text.trim() && doc.sentences.length ? textMismatch(doc.text, doc.sentences) : null;
  const sortedDocs = [...docs].sort((a, b) => b.updatedAt - a.updatedAt);
  const fieldClass = "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm leading-6 text-ink outline-none placeholder:text-ink-4 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
  const tabClass = (active: boolean) => cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", active ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark");

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><ScrollText size={16} /> 교사 지원실 · 한문</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">원문 풀이 · 학습지 만들기</h1>
          <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3 lg:min-h-12 xl:min-h-6">한문 원문을 붙여 넣으면 AI가 현토·독음·풀이 순서·직역·의역·허사 풀이 초안을 만들고, 한자음 사전으로 독음을 점검합니다. 확인한 풀이로 독음·끊어 읽기·해석·허사 빈칸 학습지를 바로 뽑을 수 있어요.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
      </header>
      {tabs}

      <section className="mt-5 grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4">
          <div className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-ink">저장한 원문 <span className="text-xs font-semibold text-ink-4">{docs.length} / {MAX_DOCS}</span></h2>
              <Button variant="ghost" size="sm" onClick={createDoc} disabled={docs.length >= MAX_DOCS && Boolean(doc.text.trim() || doc.sentences.length)}><Plus size={15} /> 새 원문</Button>
            </div>
            <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {sortedDocs.map(item => (
                <li key={item.id} className={cn("group flex items-center gap-1 rounded-xl border", item.id === doc.id ? "border-brand/30 bg-brand-page" : "border-transparent hover:bg-surface-2")}>
                  <button type="button" onClick={() => openDoc(item.id)} aria-current={item.id === doc.id ? "true" : undefined} className="min-w-0 flex-1 px-2.5 py-2 text-left">
                    <span className="block truncate text-[.84rem] font-bold text-ink">{item.title || (item.text.trim() ? item.text.trim().slice(0, 18) : "제목 없는 원문")}</span>
                    <span className="block text-[.7rem] text-ink-4">{item.sentences.length ? `문장 ${item.sentences.length}개 · 검토 ${item.sentences.filter(sentence => sentence.checked).length}개` : "풀이 전"} · {new Date(item.updatedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>
                  </button>
                  <button type="button" onClick={() => void deleteDoc(item.id)} className="mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-ink-5 opacity-60 hover:bg-surface hover:text-danger group-hover:opacity-100" aria-label={`${item.title || "제목 없는 원문"} 지우기`}><Trash2 size={14} /></button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[.72rem] leading-5 text-ink-4">원문과 고친 풀이는 이 브라우저에 자동으로 저장돼요.</p>
            <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-line pt-2">
              <span className="text-[.72rem] font-bold text-ink-4">예시 원문</span>
              {HANMUN_EXAMPLES.map(example => <button key={example.id} type="button" onClick={() => openExample(example)} className="rounded-lg px-2 py-1 text-[.74rem] font-bold text-brand-dark hover:bg-brand-page">{example.title.replace("[예시] 논어 ", "")}</button>)}
            </div>
          </div>

          <form onSubmit={event => { event.preventDefault(); if (canAnalyze) void analyze(); }} className="space-y-4 rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
            <label className="block text-sm font-bold text-ink-2">제목·출전 <span className="text-xs font-semibold text-ink-4">(선택 · 학습지 제목으로 써요)</span>
              <input value={doc.title} maxLength={100} onChange={event => update({ title: event.target.value })} placeholder="예: 논어 학이편 1장" className={cn(fieldClass, "mt-2 font-normal")} />
            </label>
            <div>
              <label htmlFor="hanmun-text" className="flex items-baseline justify-between text-sm font-bold text-ink-2">한문 원문 <span className={cn("text-xs font-semibold tabular-nums", hanCount > MAX_HANJA ? "text-danger" : "text-ink-4")}>한자 {hanCount.toLocaleString()} / {MAX_HANJA}자</span></label>
              <textarea id="hanmun-text" lang="ko" value={doc.text} maxLength={MAX_TEXT_LENGTH * 2} onChange={event => update({ text: event.target.value })} rows={9} spellCheck={false}
                placeholder={"교과서 본문을 붙여 넣으세요.\n토가 달린 원문도 괜찮아요. 달린 토는 그대로 따릅니다.\n\n예: 學而時習之면 不亦說乎아"} className={cn(fieldClass, "font-learning mt-2 resize-y text-[1.05rem] leading-8 placeholder:font-sans placeholder:text-sm")} />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={!canAnalyze}>{analyzing === doc.id ? <LoaderCircle size={17} className="animate-spin" /> : <Sparkles size={17} />} {analyzing === doc.id ? "풀이를 만드는 중… (최대 1~2분)" : "AI 풀이 만들기"}</Button>
            <Button type="button" variant="ghost" size="sm" className="w-full" disabled={hanCount < 1 || Boolean(analyzing)} onClick={() => void startManual()}><PencilLine size={15} /> AI 없이 직접 입력 (문장별 빈칸으로 나누기)</Button>
            {error && <p role="alert" className="flex items-start gap-2 text-xs font-semibold leading-5 text-danger"><AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}</p>}
          </form>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <nav aria-label="한문 도구" className="flex w-fit gap-1 rounded-2xl border border-line bg-surface-2 p-1">
              <button type="button" aria-pressed={tab === "review"} onClick={() => setTab("review")} className={tabClass(tab === "review")}><PencilLine size={16} /> 풀이 검토 {doc.sentences.length > 0 && <span className="text-[.74rem] font-semibold text-ink-4">{checkedCount}/{doc.sentences.length}</span>}</button>
              <button type="button" aria-pressed={tab === "sheet"} onClick={() => setTab("sheet")} className={tabClass(tab === "sheet")}><FileText size={16} /> 학습지</button>
            </nav>
            <Button variant="secondary" size="sm" disabled={!doc.sentences.some(sentence => hanjaOf(sentence.hyeonto).length)} onClick={() => setShowing(true)} title="원문을 크게 띄우고 끊어 읽기·토·독음·풀이를 하나씩 켜요"><MonitorPlay size={15} /> 수업 화면</Button>
          </div>

          {analyzing === doc.id && !doc.sentences.length ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-brand/25 bg-brand-page text-[.9rem] font-semibold text-brand-dark"><LoaderCircle size={26} className="animate-spin" /> 원문을 문장별로 나눠 현토·독음·풀이를 만드는 중이에요…</div>
          ) : !doc.sentences.length ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-8 text-center text-[.9rem] text-ink-3">
              <ScrollText size={24} className="text-brand" />
              <ol className="grid w-full max-w-3xl gap-2 text-left sm:grid-cols-3">
                {[
                  ["원문 붙여 넣기", "교과서 본문을 붙여 넣고 ‘AI 풀이 만들기’를 눌러요. 1분 안팎이면 현토·독음·해석 초안이 나와요."],
                  ["문장마다 검토", "틀린 곳은 ‘고치기’로 바로잡고 ‘검토 완료’를 눌러요. 독음은 한자음 사전으로 자동 점검돼요."],
                  ["학습지·수업 화면", "학습지 탭에서 문항 유형을 골라 인쇄하거나 한글에 붙여 넣고, 수업 시간에는 ‘수업 화면’으로 띄워요."],
                ].map(([title, body], index) => (
                  <li key={title} className="rounded-xl bg-surface p-3.5 shadow-[var(--lift-1)]">
                    <p className="flex items-center gap-2 font-bold text-ink"><span className="grid size-6 place-items-center rounded-full bg-brand-soft text-[.75rem] text-brand-dark">{index + 1}</span>{title}</p>
                    <p className="mt-1.5 break-keep text-[.82rem] leading-6">{body}</p>
                  </li>
                ))}
              </ol>
              <div>
                <p className="font-bold text-ink-2">처음이라면 완성된 예시부터 둘러보세요.</p>
                <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                  {HANMUN_EXAMPLES.map(example => <Button key={example.id} variant="secondary" size="sm" onClick={() => openExample(example)}><ScrollText size={15} /> {example.title.replace("[예시] ", "")} 예시 열기</Button>)}
                </div>
              </div>
            </div>
          ) : tab === "review" ? (
            <div className="space-y-4">
              {mismatch && <IssueList issues={[{ level: "error", text: `원문과 풀이가 다릅니다. ${mismatch}` }]} />}
              <label className="block rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
                <span className="text-[.78rem] font-bold text-ink-4">글 전체 내용·주제</span>
                <textarea value={doc.summary} rows={2} maxLength={1000} onChange={event => update({ summary: event.target.value })} placeholder="글 전체의 내용과 주제를 적어 두세요." className="mt-1 w-full resize-y bg-transparent text-[.92rem] leading-7 text-ink outline-none placeholder:text-ink-5" />
              </label>
              {doc.sentences.map((sentence, index) => (
                <SentenceCard key={sentence.id} sentence={sentence} number={index + 1}
                  onChange={next => setSentences(doc.sentences.map(item => item.id === sentence.id ? next : item))}
                  onDelete={async () => {
                    if (await confirm({ eyebrow: "풀이 검토", title: `${index + 1}번 문장을 지울까요?`, tone: "danger", confirmLabel: "지우기", description: "이 문장의 현토·독음·풀이·어휘가 함께 지워집니다.", note: "지운 문장은 되돌릴 수 없어요." })) {
                      setDocs(current => current.map(item => item.id === doc.id ? { ...item, sentences: item.sentences.filter(other => other.id !== sentence.id), updatedAt: Date.now() } : item));
                    }
                  }} />
              ))}
              {doc.sentences.length < 60 && <Button variant="ghost" onClick={() => setSentences([...doc.sentences, ...withIds([{ hyeonto: "", reading: "", order: null, literal: "", free: "", point: "", words: [] }])])}><Plus size={16} /> 문장 추가</Button>}
            </div>
          ) : (
            <HanmunSheet title={doc.title} sentences={doc.sentences} skip={doc.skip} settings={sheet} onSkip={skip => update({ skip })} onSettings={setSheet} />
          )}
        </div>
      </section>
      {confirmDialog}
      {showing && <HanmunShow title={doc.title} sentences={doc.sentences.filter(sentence => hanjaOf(sentence.hyeonto).length)} onClose={closeShow} />}
    </div>
  );
}
