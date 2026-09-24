"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, BookmarkCheck, BookmarkPlus, Brush, Copy, ExternalLink, Lightbulb, LoaderCircle, Lock, Maximize2, MessageCircleQuestion, Mic, Palette, RefreshCw, ScanSearch, Sparkles, Stars, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CommonsImage } from "@/lib/commons-media";
import { findMovement, findTerm, type CatalogWork } from "@/lib/art-works/catalog";
import { appreciationSteps, artLevels, type ArtLevel, type TermExplanation, type WorkExplanation } from "@/lib/art-works/explanation";

export const endpoint = "/api/teacher/art-works";

/** 자료함·슬라이드·활동지에서 함께 쓰는 작품 한 점 */
export type ArtItem = {
  key: string;
  workId?: string;
  title: string;
  original?: string;
  artist: string;
  year?: string;
  movement?: string;
  file?: string;
  copyright?: boolean;
  /** 검색으로 찾은 작품의 Commons 설명 */
  description?: string;
};

export function catalogItem(work: CatalogWork): ArtItem {
  return { key: `c:${work.id}`, workId: work.id, title: work.title, original: work.original, artist: work.artist, year: work.year, movement: findMovement(work.movementId)?.name, file: work.file, copyright: work.copyright };
}
export function commonsItem(image: CommonsImage): ArtItem {
  return { key: `f:${image.file}`, title: image.title, artist: image.artist.slice(0, 200), file: image.file, description: image.description };
}

export async function readJson<T>(response: Response) {
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "요청을 처리하지 못했습니다.");
  return data;
}

// ── 이미지: 같은 파일은 한 번만 불러와 모든 화면이 함께 씁니다.
const images = new Map<string, CommonsImage | null>();
const pendingFiles = new Set<string>();
const imageListeners = new Set<() => void>();
let imageVersion = 0;
function notifyImages() { imageVersion += 1; imageListeners.forEach(listener => listener()); }
export function rememberImages(list: CommonsImage[]) {
  list.forEach(image => images.set(image.file, image));
  notifyImages();
}
async function ensureImages(files: string[]) {
  const missing = [...new Set(files)].filter(file => !images.has(file) && !pendingFiles.has(file));
  for (let index = 0; index < missing.length; index += 20) {
    const chunk = missing.slice(index, index + 20);
    chunk.forEach(file => pendingFiles.add(file));
    try {
      const data = await fetch(`${endpoint}?files=${encodeURIComponent(chunk.join("\n"))}`).then(readJson<{ images: CommonsImage[] }>);
      const found = new Map(data.images.map(image => [image.file, image]));
      // Commons가 이름을 바로잡아 돌려준 경우도 요청한 이름으로 찾을 수 있게 합니다.
      const loose = (file: string) => file.replace(/_/g, " ").normalize("NFC");
      chunk.forEach(file => images.set(file, found.get(file) ?? data.images.find(image => loose(image.file) === loose(file)) ?? null));
    } catch {
      // 다음에 다시 열 때 한 번 더 시도합니다.
    } finally {
      chunk.forEach(file => pendingFiles.delete(file));
      notifyImages();
    }
  }
}
function subscribeImages(listener: () => void) { imageListeners.add(listener); return () => { imageListeners.delete(listener); }; }
/** undefined: 불러오는 중, null: 쓸 수 없음 */
export function useArtImages(files: (string | undefined)[]) {
  useSyncExternalStore(subscribeImages, () => imageVersion, () => 0);
  const list = files.filter((file): file is string => Boolean(file));
  const signature = list.join("\n");
  useEffect(() => { if (signature) void ensureImages(signature.split("\n")); }, [signature]);
  return (file?: string) => (file ? images.get(file) : null);
}

// ── 브라우저 저장소: 자료함과 AI 해설
function createLocalStore<T>(key: string, fallback: T, valid: (value: unknown) => value is T) {
  const listeners = new Set<() => void>();
  let memory = fallback;
  let loaded = false;
  const read = () => {
    if (!loaded && typeof window !== "undefined") {
      loaded = true;
      try {
        const saved = JSON.parse(window.localStorage.getItem(key) ?? "null") as unknown;
        if (valid(saved)) memory = saved;
      } catch { /* 저장소를 쓸 수 없으면 이번 방문 동안만 기억합니다. */ }
    }
    return memory;
  };
  return {
    read,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    write(next: T) {
      memory = next;
      loaded = true;
      try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* 현재 화면에는 그대로 적용됩니다. */ }
      listeners.forEach(listener => listener());
    },
  };
}

const isItemList = (value: unknown): value is ArtItem[] => Array.isArray(value) && value.every(item => item && typeof item.key === "string" && typeof item.title === "string" && typeof item.artist === "string");
export const collectionStore = createLocalStore<ArtItem[]>("learncraft_art_collection", [], isItemList);
const emptyItems: ArtItem[] = [];
export function useCollection() {
  return useSyncExternalStore(collectionStore.subscribe, collectionStore.read, () => emptyItems);
}
export function toggleCollection(item: ArtItem) {
  const list = collectionStore.read();
  collectionStore.write(list.some(entry => entry.key === item.key) ? list.filter(entry => entry.key !== item.key) : [...list, item].slice(0, 60));
}

type SavedExplanations = Record<string, { at: number; value: unknown }>;
const explanationStore = createLocalStore<SavedExplanations>("learncraft_art_explanations", {}, (value): value is SavedExplanations => Boolean(value) && typeof value === "object" && !Array.isArray(value));
export function readExplanation<T>(key: string) {
  return explanationStore.read()[key]?.value as T | undefined;
}
function saveExplanation(key: string, value: unknown) {
  const entries = Object.entries({ ...explanationStore.read(), [key]: { at: Date.now(), value } }).sort((a, b) => b[1].at - a[1].at).slice(0, 80);
  explanationStore.write(Object.fromEntries(entries));
}
/** 활동지에 쓸 해설: 어느 수준으로 만들었든 가장 최근 것을 씁니다. */
export function latestWorkExplanation(itemKey: string) {
  const saved = explanationStore.read();
  const found = (Object.keys(artLevels) as ArtLevel[]).map(level => saved[`${itemKey}|${level}`]).filter(Boolean).sort((a, b) => b.at - a.at)[0];
  return found?.value as WorkExplanation | undefined;
}

export function creditText(item: ArtItem, image?: CommonsImage | null) {
  const work = [item.title, item.artist, item.year].filter(Boolean).join(", ");
  return image ? `${work}. 이미지: ${image.artist.slice(0, 160)} / Wikimedia Commons / ${image.license} (${image.sourceUrl})` : work;
}

// ── AI 해설 불러오기
export function useExplanation<T>(cacheKey: string, body: Record<string, unknown>) {
  const [level, setLevel] = useState<ArtLevel>("high");
  const [value, setValue] = useState<T | undefined>(() => readExplanation<T>(`${cacheKey}|high`));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  function changeLevel(next: ArtLevel) {
    controller.current?.abort();
    setLoading(false);
    setError("");
    setLevel(next);
    setValue(readExplanation<T>(`${cacheKey}|${next}`));
  }
  async function generate(regenerate = false) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError("");
    try {
      const data = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, level, regenerate }), signal: current.signal })
        .then(readJson<{ explanation: T }>);
      saveExplanation(`${cacheKey}|${level}`, data.explanation);
      setValue(data.explanation);
    } catch (reason) {
      if (!current.signal.aborted) setError(reason instanceof Error ? reason.message : "AI 해설을 만들지 못했어요.");
    } finally {
      if (controller.current === current) setLoading(false);
    }
  }
  return { level, changeLevel, value, loading, error, generate };
}

export function LevelToggle({ value, onChange, disabled }: { value: ArtLevel; onChange: (level: ArtLevel) => void; disabled?: boolean }) {
  return (
    <div role="group" aria-label="학생 수준" className="flex h-9 items-center gap-0.5 rounded-full border border-line bg-surface p-1">
      {(Object.keys(artLevels) as ArtLevel[]).map(level => (
        <button key={level} type="button" aria-pressed={value === level} disabled={disabled} onClick={() => onChange(level)}
          className={cn("h-7 rounded-full px-3 text-[.76rem] font-bold transition-colors disabled:opacity-50", value === level ? "bg-brand text-white" : "text-ink-3 hover:bg-brand-soft hover:text-brand-dark")}>{artLevels[level]}</button>
      ))}
    </div>
  );
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function ArtImage({ item, image, className, imgClassName, sizes = "card" }: { item: ArtItem; image: CommonsImage | null | undefined; className?: string; imgClassName?: string; sizes?: "card" | "large" }) {
  const [failed, setFailed] = useState(false);
  if (item.copyright || !item.file) {
    return <div className={cn("flex flex-col items-center justify-center gap-2 bg-[#f4f1ec] px-4 text-center text-[#7a6d5c]", className)}>
      <Lock size={sizes === "large" ? 28 : 20} aria-hidden="true" />
      <p className="text-[.78rem] font-bold">저작권 보호 작품</p>
      {sizes === "large" && <p className="max-w-xs break-keep text-[.74rem] leading-5">작가 사후 70년이 지나지 않아 이미지를 싣지 않았어요. 수업에서는 소장처 누리집의 공식 이미지를 보여 주세요.</p>}
    </div>;
  }
  if (image === undefined && !failed) return <div className={cn("flex items-center justify-center bg-[#f4f1ec] text-ink-4", className)}><LoaderCircle size={20} className="animate-spin" aria-label="이미지를 불러오는 중" /></div>;
  if (!image || failed) return <div className={cn("flex flex-col items-center justify-center gap-1 bg-[#f4f1ec] text-[.76rem] font-semibold text-ink-4", className)}><AlertCircle size={18} aria-hidden="true" /> 이미지를 불러오지 못했어요</div>;
  return <div className={cn("flex items-center justify-center bg-[#f4f1ec]", className)}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={image.imageUrl} alt={`${item.title} (${item.artist})`} width={image.width} height={image.height} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={cn("h-full w-full object-contain", imgClassName)} />
  </div>;
}

function Block({ icon: Icon, title, children, className }: { icon: typeof Palette; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("bg-surface px-5 py-4", className)}>
      <h4 className="flex items-center gap-2 text-[.8em] font-extrabold text-ink-3"><Icon size={15} className="text-brand" aria-hidden="true" /> {title}</h4>
      <div className="mt-2 break-keep text-[.93em] leading-[1.75] text-ink-2">{children}</div>
    </section>
  );
}

export function WorkExplanationCard({ value }: { value: WorkExplanation }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand/20 bg-surface shadow-[var(--lift-1)]">
      <p className="bg-[linear-gradient(135deg,var(--brand-page),var(--surface))] px-5 py-4 text-[1.02em] font-bold leading-7 text-ink">{value.oneLine}</p>
      <div className="grid gap-px bg-line">
        <Block icon={Palette} title="작품 소개"><p>{value.overview}</p></Block>
        <Block icon={Stars} title="작가와 시대 배경"><p>{value.background}</p></Block>
        <Block icon={ScanSearch} title="조형 요소·원리로 보기">
          <ul className="grid gap-2 sm:grid-cols-2">
            {value.elements.map(item => <li key={item.name} className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5"><strong className="text-ink">{item.name}</strong><p className="mt-0.5 text-[.93em] leading-6 text-ink-3">{item.observation}</p></li>)}
          </ul>
        </Block>
        <Block icon={MessageCircleQuestion} title="펠드먼 4단계 감상 안내">
          <ol className="space-y-2">
            {appreciationSteps.map((step, index) => (
              <li key={step.key} className="rounded-xl bg-brand-soft/45 px-3.5 py-2.5">
                <p className="font-semibold text-ink"><span className="mr-1.5 rounded-md bg-brand px-1.5 py-0.5 text-[.78em] text-white">{index + 1} {step.label}</span>{value.appreciation[step.key].question}</p>
                <p className="mt-1 text-[.92em] text-ink-3">선생님 참고 · {value.appreciation[step.key].hint}</p>
              </li>
            ))}
          </ol>
        </Block>
        <Block icon={Lightbulb} title="수업 발문">
          <ul className="space-y-1.5">{value.questions.map(item => <li key={item.question}><strong className="text-ink">“{item.question}”</strong><span className="text-ink-3"> — {item.intent}</span></li>)}</ul>
        </Block>
        <Block icon={Brush} title="수업 활동 아이디어">
          <ul className="grid gap-2 sm:grid-cols-2">{value.activities.map(item => <li key={item.title} className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5"><strong className="text-ink">{item.title}</strong><p className="mt-0.5 text-[.93em] leading-6 text-ink-3">{item.description}</p></li>)}</ul>
        </Block>
        {value.stories.length > 0 && <Block icon={Sparkles} title="흥미로운 이야기"><ul className="list-disc space-y-1 pl-5 marker:text-brand">{value.stories.map(story => <li key={story}>{story}</li>)}</ul></Block>}
        {value.terms.length > 0 && <Block icon={Palette} title="함께 가르칠 미술 용어"><ul className="flex flex-wrap gap-2">{value.terms.map(item => <li key={item.term} className="rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-[.92em]"><strong className="text-ink">{item.term}</strong> <span className="text-ink-3">{item.meaning}</span></li>)}</ul></Block>}
        <Block icon={Mic} title="학생에게 이렇게 말해 보세요" className="bg-brand-page"><p>{value.teacherScript}</p></Block>
      </div>
      <p className="flex gap-2 border-t border-[#eadfb8] bg-[#fffaf0] px-5 py-3 text-[.8em] leading-6 text-[#806426]"><AlertCircle size={15} className="mt-1 shrink-0" aria-hidden="true" /><span>{value.checkNote} AI가 만든 해설이므로 수업 전에 소장처 자료나 교과서로 한 번 더 확인해 주세요.</span></p>
    </div>
  );
}

export function TermExplanationCard({ value }: { value: TermExplanation }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand/20 bg-surface">
      <div className="grid gap-px bg-line">
        <Block icon={Palette} title="정의"><p>{value.definition}</p></Block>
        <Block icon={Sparkles} title="쉽게 풀면"><p>{value.easy}</p>{value.origin && <p className="mt-1.5 text-ink-3">유래 · {value.origin}</p>}</Block>
        <Block icon={ScanSearch} title="작품 속에서 찾아보기">
          <ul className="space-y-1.5">{value.examples.map(item => <li key={item.work}><strong className="text-ink">{item.work}</strong><span className="text-ink-3"> ({item.artist})</span> — {item.how}</li>)}</ul>
        </Block>
        <Block icon={Brush} title={`체험 활동 · ${value.activity.title}`}>
          <p className="text-ink-3">준비물 · {value.activity.materials}</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 marker:font-bold marker:text-brand">{value.activity.steps.map(stepText => <li key={stepText}>{stepText}</li>)}</ol>
        </Block>
        {(value.misconception || value.related.length > 0) && <Block icon={Lightbulb} title="헷갈리기 쉬운 점">
          {value.misconception && <p>{value.misconception}</p>}
          {value.related.length > 0 && <ul className="mt-1.5 space-y-1">{value.related.map(item => <li key={item.term}><strong className="text-ink">{item.term}</strong> <span className="text-ink-3">— {item.difference}</span></li>)}</ul>}
        </Block>}
        <Block icon={Mic} title="학생에게 이렇게 말해 보세요" className="bg-brand-page"><p>{value.teacherScript}</p></Block>
      </div>
      <p className="flex gap-2 border-t border-[#eadfb8] bg-[#fffaf0] px-5 py-3 text-[.8em] leading-6 text-[#806426]"><AlertCircle size={15} className="mt-1 shrink-0" aria-hidden="true" /><span>{value.checkNote} AI가 만든 풀이이므로 수업 전에 한 번 더 확인해 주세요.</span></p>
    </div>
  );
}

/** AI 해설 영역: 수준 선택, 만들기·다시 만들기, 결과 */
export function ExplanationPanel<T>({ state, label, render }: { state: ReturnType<typeof useExplanation<T>>; label: string; render: (value: T) => React.ReactNode }) {
  const { level, changeLevel, value, loading, error, generate } = state;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <LevelToggle value={level} onChange={changeLevel} disabled={loading} />
        {value
          ? <Button variant="secondary" size="sm" disabled={loading} onClick={() => void generate(true)}><RefreshCw size={14} className={cn(loading && "animate-spin")} /> 다시 만들기</Button>
          : <Button size="sm" disabled={loading} onClick={() => void generate()}>{loading ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />} {label}</Button>}
      </div>
      {error && <p role="alert" className="mt-3 flex items-center gap-2 rounded-xl border border-danger/15 bg-[var(--danger-page)] px-4 py-3 text-[.84rem] font-semibold text-danger"><AlertCircle size={16} /> {error}</p>}
      {loading && !value && <div className="mt-3 flex min-h-32 items-center justify-center gap-2 rounded-2xl border border-dashed border-brand/25 bg-brand-page text-[.86rem] font-semibold text-brand-dark"><LoaderCircle size={20} className="animate-spin" /> AI가 해설을 쓰는 중이에요… (20초쯤 걸려요)</div>}
      {value && <div className={cn("mt-3 transition-opacity", loading && "opacity-50")}>{render(value)}</div>}
    </div>
  );
}

/** 작품 한 점을 크게 보고 AI 해설을 만드는 창 */
export function ArtWorkDialog({ item, point, place, medium, terms, onClose, onOpenTerm }: {
  item: ArtItem; point?: string; place?: string; medium?: string; terms?: string[];
  onClose: () => void; onOpenTerm?: (termId: string) => void;
}) {
  const getImage = useArtImages([item.file]);
  const image = getImage(item.file);
  const collection = useCollection();
  const saved = collection.some(entry => entry.key === item.key);
  const [copied, setCopied] = useState(false);
  const figure = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const explanation = useExplanation<WorkExplanation>(item.key, item.workId ? { kind: "work", workId: item.workId } : { kind: "work", work: { title: item.title, artist: item.artist, year: item.year, description: item.description?.slice(0, 600) } });

  useEffect(() => {
    closeButton.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.fullscreenElement) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${item.original ?? item.title} ${item.artist} ${place ?? ""}`.trim())}`;
  return (
    <div role="dialog" aria-modal="true" aria-label={`${item.title} 자세히 보기`} className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#17151f]/70 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-[1200px] overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_30px_90px_rgba(20,16,40,.35)]">
        <button ref={closeButton} type="button" onClick={onClose} aria-label="닫기" className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-white/90 text-ink-2 shadow-md hover:bg-white hover:text-brand-dark"><X size={18} /></button>
        <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,1fr)]">
          <div ref={figure} className="relative bg-[#1f1d26] p-3 [&:fullscreen]:p-0">
            <ArtImage item={item} image={image} sizes="large" className="h-[46vh] rounded-xl bg-[#1f1d26] text-white/70 lg:h-[min(72vh,760px)] [:fullscreen_&]:h-screen [:fullscreen_&]:rounded-none" />
            {image && <button type="button" onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : figure.current?.requestFullscreen())} className="absolute bottom-5 right-5 flex min-h-9 items-center gap-1.5 rounded-full bg-black/55 px-3 text-[.76rem] font-bold text-white backdrop-blur hover:bg-black/75"><Maximize2 size={14} /> 전체 화면</button>}
          </div>
          <div className="flex flex-col gap-4 p-5 sm:p-6">
            <div className="pr-10">
              {item.movement && <p className="text-[.78rem] font-bold text-brand">{item.movement}</p>}
              <h2 className="mt-1 break-keep text-[1.5rem] font-extrabold leading-tight tracking-[-0.03em] text-ink">{item.title}</h2>
              {item.original && <p className="mt-1 text-[.86rem] font-semibold text-ink-3">{item.original}</p>}
              <p className="mt-2 text-[.92rem] font-semibold text-ink-2">{item.artist}{item.year && <span className="text-ink-3"> · {item.year}</span>}</p>
              {(medium || place) && <p className="mt-1 text-[.82rem] text-ink-3">{[medium, place].filter(Boolean).join(" · ")}</p>}
            </div>
            {point && <p className="rounded-xl bg-brand-page px-4 py-3 text-[.88rem] leading-6 text-ink-2"><strong className="text-brand-dark">교과서 포인트</strong> · {point}</p>}
            {!point && item.description && <p className="line-clamp-4 text-[.84rem] leading-6 text-ink-3">{item.description}</p>}
            {terms && terms.length > 0 && (
              <div>
                <p className="text-[.76rem] font-bold text-ink-3">관련 미술 용어</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {terms.map(id => findTerm(id)).filter(term => term !== undefined).map(term => (
                    <button key={term.id} type="button" onClick={() => onOpenTerm?.(term.id)} title={term.definition} className="min-h-8 rounded-lg border border-line bg-surface-2 px-2.5 text-[.8rem] font-semibold text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark">{term.term}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant={saved ? "secondary" : "primary"} size="sm" onClick={() => toggleCollection(item)}>{saved ? <><BookmarkCheck size={15} /> 자료함에 담김</> : <><BookmarkPlus size={15} /> 수업 자료함에 담기</>}</Button>
              <Button variant="secondary" size="sm" onClick={() => void copyText(creditText(item, image)).then(ok => { setCopied(ok); setTimeout(() => setCopied(false), 1600); })}><Copy size={14} /> {copied ? "복사했어요" : "출처 복사"}</Button>
              {image ? <a href={image.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-[11px] px-3 text-sm font-semibold text-ink-3 hover:bg-brand-page hover:text-brand-dark"><ExternalLink size={14} /> 원본 파일</a>
                : item.copyright && <a href={searchUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-[11px] px-3 text-sm font-semibold text-ink-3 hover:bg-brand-page hover:text-brand-dark"><ExternalLink size={14} /> 공식 이미지 찾기</a>}
            </div>
            {image && <p className="break-words text-[.72rem] leading-5 text-ink-4">이미지: {image.artist.slice(0, 200)} · <a href={image.sourceUrl} target="_blank" rel="noreferrer" className="underline">Wikimedia Commons</a> · {image.licenseUrl ? <a href={image.licenseUrl} target="_blank" rel="noreferrer" className="underline">{image.license}</a> : image.license}</p>}
          </div>
        </div>
        <div className="border-t border-line bg-surface-2 p-5 sm:p-6">
          <h3 className="mb-3 flex items-center gap-2 text-[1rem] font-extrabold text-ink"><Sparkles size={17} className="text-brand" /> AI 작품 해설</h3>
          <ExplanationPanel state={explanation} label="AI 해설 만들기" render={value => <WorkExplanationCard value={value} />} />
        </div>
      </div>
    </div>
  );
}
