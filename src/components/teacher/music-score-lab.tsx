"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { AlertCircle, AlertTriangle, BookOpenCheck, CheckCircle2, ChevronDown, Delete, Download, FilePlus2, LoaderCircle, MoonStar, Music, PencilLine, Play, Printer, ShieldCheck, Square, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clefs, durationNames, measureCapacity, musicKeys, noteToken, parseScore, playbackEvents, solfegeNames, timeSignatures, type LabelMode, type ScoreNote, type ScoreSettings } from "@/lib/music-score/notation";
import { renderScore } from "@/lib/music-score/render";
import { scoreExamples as examples } from "@/lib/music-score/examples";
import { MusicScoreGuide } from "./music-score-guide";

const draftKey = "learncraft_music_score_draft";
const defaultSettings: ScoreSettings = { title: "", composer: "", lyricist: "", clef: "treble", key: "C", time: "4/4", tempo: 90, lyrics: "", perLine: 4, labels: "solfege" };
const durations = [1, 2, 4, 8, 16] as const;
const zoomLevels = [80, 90, 100] as const;
const inputClass = "min-h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10";
const selectClass = "min-h-10 w-full appearance-none rounded-xl border border-line bg-surface-2 py-2 pl-3 pr-9 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-brand";
const noop = () => () => {};

const floatingNotes = [
  { glyph: "♪", left: 4, size: 34, duration: 19, delay: 0 },
  { glyph: "♫", left: 13, size: 26, duration: 24, delay: 7 },
  { glyph: "♩", left: 22, size: 40, duration: 21, delay: 13 },
  { glyph: "♬", left: 78, size: 30, duration: 23, delay: 3 },
  { glyph: "♪", left: 87, size: 44, duration: 18, delay: 10 },
  { glyph: "♫", left: 95, size: 28, duration: 26, delay: 16 },
  { glyph: "♩", left: 50, size: 24, duration: 28, delay: 20 },
  { glyph: "♬", left: 64, size: 22, duration: 25, delay: 5 },
  { glyph: "♪", left: 36, size: 20, duration: 27, delay: 11 },
] as const;
/** 음표 하나를 비교용 문자열로 만듭니다. */
const noteSignature = (note: ScoreNote) => JSON.stringify(note);

/** 오른쪽 창을 화면 가운데 무대 자리에 놓습니다. */
function placeOnStage(card: HTMLElement) {
  const width = Math.min(window.innerWidth - 32, 1500);
  card.style.width = `${width}px`;
  card.style.left = `${(window.innerWidth - width) / 2}px`;
  card.style.top = "0px";
  card.style.top = `${Math.max(24, (window.innerHeight - card.offsetHeight) / 2)}px`;
}
/** to 자리에 놓인 카드를 from 자리·크기에 있는 것처럼 보이게 하는 변환입니다. */
function flipTransform(from: DOMRect, to: DOMRect) {
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width})`;
}
function flyFrom(card: HTMLElement, from: DOMRect, to: DOMRect, timing: KeyframeAnimationOptions) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  card.animate([{ transform: flipTransform(from, to) }, { transform: "none" }], { ...timing, duration: reduce ? 0 : timing.duration, fill: "backwards" });
}

type Draft = { text: string; settings: ScoreSettings };
function readDraft(): Draft {
  try {
    const saved = JSON.parse(window.localStorage.getItem(draftKey) ?? "null") as Partial<Draft> | null;
    if (saved && typeof saved.text === "string") return { text: saved.text, settings: { ...defaultSettings, ...saved.settings } };
  } catch { /* 저장된 초안을 읽지 못하면 예시로 시작합니다. */ }
  return { text: examples[0].text, settings: { ...defaultSettings, ...examples[0].settings } };
}
const fileName = (title: string, extension: string) => `${(title.trim() || "악보").replace(/[\\/:*?"<>|]+/g, " ").slice(0, 60)}.${extension}`;

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn("block", className)}><span className="mb-1.5 block text-xs font-semibold text-ink-4">{label}</span>{children}</label>;
}
function Select({ label, value, onChange, children }: { label: string; value: string | number; onChange: (value: string) => void; children: React.ReactNode }) {
  return <Field label={label}><span className="relative block"><select value={value} onChange={event => onChange(event.target.value)} className={selectClass}>{children}</select><ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-4" /></span></Field>;
}
const labelHelp: Record<LabelMode, string> = {
  solfege: "계이름은 조에 따라 ‘도’의 자리가 옮겨 가는 이름이에요. 사장조에서는 솔 자리가 ‘도’가 돼요. 노래 부르기 수업에 알맞아요.",
  letter: "음이름은 조와 상관없이 건반마다 정해진 이름이에요. 다·라·마·바·사·가·나가 영어 C·D·E·F·G·A·B에 해당해요. 악기 연주 수업에 알맞아요.",
  none: "음표 아래에 글자를 넣지 않아요. 악보 읽기 연습이나 시험지에 알맞아요.",
};
function ViewOption({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <div className="min-w-0"><p className="mb-1.5 text-xs font-bold text-ink-2">{label}</p>{children}<p className="mt-1.5 break-keep text-xs leading-5 text-ink-4">{help}</p></div>;
}
function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-1">
    {options.map(option => <button key={String(option.value)} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}
      className={cn("min-h-8 flex-1 whitespace-nowrap rounded-lg px-2 text-xs font-bold transition-colors", value === option.value ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>{option.label}</button>)}
  </div>;
}

export function MusicScoreLab() {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? <MusicScoreEditor initial={readDraft()} /> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 악보 도구를 준비하는 중…</div>;
}

function MusicScoreEditor({ initial }: { initial: Draft }) {
  const [text, setText] = useState(initial.text);
  const [settings, setSettings] = useState<ScoreSettings>(initial.settings);
  const [duration, setDuration] = useState<ScoreNote["duration"]>(4);
  const [dotted, setDotted] = useState(false);
  const [shift, setShift] = useState(0);
  const [alter, setAlter] = useState(0);
  const [chord, setChord] = useState("");
  const [guideOpen, setGuideOpen] = useState(false);
  const [zoom, setZoom] = useState<number>(100);
  // 악보 몰입: 불이 꺼지듯 주변을 어둡게 하고, 오른쪽 창(보기 설정·바로 고치기·악보)이 제자리에서 화면 가운데로 떠올랐다가 끝나면 제자리로 돌아갑니다.
  const [immersion, setImmersion] = useState<"off" | "on" | "leaving">("off");
  const [homeHeight, setHomeHeight] = useState(0);
  const scoreCardRef = useRef<HTMLDivElement>(null);
  const scoreHomeRef = useRef<HTMLDivElement>(null);
  const enterFrom = useRef<DOMRect | null>(null);
  const immersionRef = useRef(immersion);
  const previousNotes = useRef<string[]>([]);
  useEffect(() => { immersionRef.current = immersion; }, [immersion]);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [exporting, setExporting] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const noteElements = useRef<(SVGElement | undefined)[]>([]);
  const playback = useRef<{ context: AudioContext; frame: number; active: number } | null>(null);

  const parsed = useMemo(() => parseScore(text, settings), [text, settings]);
  const errorMeasures = useMemo(() => new Set(parsed.errors.flatMap(issue => issue.measure ? [issue.measure] : [])), [parsed]);
  const noteCount = parsed.measures.reduce((sum, measure) => sum + measure.notes.length, 0);
  const update = (patch: Partial<ScoreSettings>) => setSettings(current => ({ ...current, ...patch }));

  useEffect(() => {
    try { window.localStorage.setItem(draftKey, JSON.stringify({ text, settings })); } catch { /* 저장소를 쓸 수 없어도 편집은 계속됩니다. */ }
  }, [text, settings]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    renderScore(host, parsed, settings, errorMeasures).then(result => {
      if (cancelled) return;
      noteElements.current = result.noteElements;
      setRenderFailed(false);
      // 몰입 중에 악보를 고치면 앞뒤로 같은 부분을 뺀 가운데, 곧 바뀐 음표만 금빛으로 잠깐 빛나게 합니다.
      const notes = parsed.measures.flatMap(measure => measure.notes.map(noteSignature));
      const before = previousNotes.current;
      previousNotes.current = notes;
      if (immersionRef.current !== "on" || !before.length) return;
      let start = 0;
      while (start < notes.length && start < before.length && notes[start] === before[start]) start += 1;
      let end = 0;
      while (end < notes.length - start && end < before.length - start && notes[notes.length - 1 - end] === before[before.length - 1 - end]) end += 1;
      for (let i = start; i < notes.length - end; i += 1) result.noteElements[i]?.classList.add("score-changed");
    }).catch(() => { if (!cancelled) setRenderFailed(true); });
    return () => { cancelled = true; };
  }, [parsed, settings, errorMeasures]);

  useEffect(() => {
    if (immersion === "off") return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = overflow; };
  }, [immersion]);

  useEffect(() => {
    if (immersion !== "on" || guideOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") exitImmersion(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // 몰입에 들어가면 카드를 무대 가운데에 놓고, 원래 자리에서 날아오듯 움직입니다.
  useLayoutEffect(() => {
    const card = scoreCardRef.current;
    if (immersion !== "on" || !card) return;
    placeOnStage(card);
    const first = enterFrom.current;
    enterFrom.current = null;
    if (first) flyFrom(card, first, card.getBoundingClientRect(), { duration: 900, delay: 180, easing: "cubic-bezier(.2,.8,.2,1)" });
    const onResize = () => placeOnStage(card);
    const observer = new ResizeObserver(onResize);
    observer.observe(card);
    window.addEventListener("resize", onResize);
    return () => { observer.disconnect(); window.removeEventListener("resize", onResize); };
  }, [immersion]);


  useEffect(() => () => {
    if (!playback.current) return;
    cancelAnimationFrame(playback.current.frame);
    void playback.current.context.close();
  }, []);

  function insert(token: string) {
    const element = textRef.current;
    const position = element ? element.selectionEnd : text.length;
    const before = text.slice(0, position);
    const after = text.slice(position);
    let piece = `${before && !/\s$/.test(before) ? " " : ""}${token}`;
    // 끝에 음표를 넣어 마디가 꽉 차면 마디 구분을 자동으로 붙입니다.
    if (!after.trim() && token !== "|") {
      const next = parseScore(before + piece, settings);
      const last = next.measures.at(-1);
      if (last && last.units === measureCapacity(settings.time) && !next.errors.length) piece += " |";
    }
    piece += after && !/^\s/.test(after) ? " " : "";
    const value = before + piece + after;
    setText(value);
    requestAnimationFrame(() => {
      const cursor = before.length + piece.length;
      element?.focus();
      element?.setSelectionRange(cursor, cursor);
    });
  }
  // 코드 칸에 적은 코드는 다음에 넣는 음표 하나에만 붙이고 비웁니다.
  function insertNote(token: string) {
    insert(chord ? `[${chord}]${token}` : token);
    setChord("");
  }
  function appendExample(example: string) {
    const current = text.trimEnd();
    const next = current ? `${current}${current.endsWith("|") ? "" : " |"}
${example}` : example;
    setText(next);
    setGuideOpen(false);
    requestAnimationFrame(() => { textRef.current?.focus(); textRef.current?.setSelectionRange(next.length, next.length); });
  }
  function replaceWithExample(example: string, patch: Partial<ScoreSettings> = {}) {
    stop();
    setText(example);
    setSettings(current => ({ ...current, ...patch }));
    setGuideOpen(false);
  }
  function removeLast() {
    const element = textRef.current;
    const position = element ? element.selectionEnd : text.length;
    const before = text.slice(0, position).replace(/\S+\s*$/, "");
    setText(before + text.slice(position));
    requestAnimationFrame(() => { element?.focus(); element?.setSelectionRange(before.length, before.length); });
  }

  function enterImmersion() {
    const card = scoreCardRef.current;
    if (!card || immersion !== "off") return;
    enterFrom.current = card.getBoundingClientRect();
    setHomeHeight(enterFrom.current.height);
    setImmersion("on");
  }
  function exitImmersion() {
    const card = scoreCardRef.current;
    const home = scoreHomeRef.current;
    if (!card || !home || immersion !== "on") return;
    setImmersion("leaving");
    // 스크롤 막대가 돌아온 뒤의 제자리를 재야 마지막에 튀지 않고 정확히 내려앉습니다.
    document.documentElement.style.removeProperty("overflow");
    const from = card.getBoundingClientRect();
    const to = home.getBoundingClientRect();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animation = card.animate([{ transform: "none" }, { transform: flipTransform(to, from) }], { duration: reduce ? 0 : 700, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" });
    animation.onfinish = () => {
      flushSync(() => setImmersion("off"));
      card.style.removeProperty("width");
      card.style.removeProperty("left");
      card.style.removeProperty("top");
      animation.cancel();
    };
  }

  function clearHighlight() {
    const active = playback.current?.active ?? -1;
    if (active >= 0) noteElements.current[active]?.classList.remove("score-active");
  }
  function stop() {
    if (playback.current) {
      clearHighlight();
      cancelAnimationFrame(playback.current.frame);
      void playback.current.context.close();
      playback.current = null;
    }
    setPlaying(false);
  }
  function play() {
    stop();
    const { sounds, highlights, total } = playbackEvents(parsed, settings.tempo);
    if (!sounds.length) return;
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
    const start = context.currentTime + 0.12;
    for (const sound of sounds) {
      const at = start + sound.start;
      const end = at + Math.max(0.06, sound.length - 0.02);
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = 440 * 2 ** ((sound.midi - 69) / 12);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.32, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.16, Math.max(at + 0.03, Math.min(end - 0.02, at + 0.35)));
      gain.gain.linearRampToValueAtTime(0, end);
      oscillator.connect(gain).connect(master);
      oscillator.start(at);
      oscillator.stop(end + 0.02);
    }
    const state = { context, frame: 0, active: -1 };
    playback.current = state;
    setPlaying(true);
    // 소리 장치가 없으면 오디오 시계가 멈춰 있으므로 강조와 종료는 화면 시계로 맞춥니다.
    const startedAt = performance.now() + (start - context.currentTime) * 1000;
    const tick = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      if (elapsed > total + 0.15) { stop(); return; }
      let index = -1;
      for (let i = 0; i < highlights.length && highlights[i] <= elapsed; i += 1) index = i;
      if (index !== state.active) {
        clearHighlight();
        state.active = index;
        if (index >= 0) noteElements.current[index]?.classList.add("score-active");
      }
      state.frame = requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);
  }

  async function downloadPng() {
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      await renderScore(canvas, parsed, settings, new Set(), 3);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("PNG");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName(settings.title, "png");
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setRenderFailed(true); } finally { setExporting(false); }
  }
  function loadExample(index: number) {
    const example = examples[index];
    if (!example) return;
    stop();
    setSettings({ ...defaultSettings, labels: settings.labels, perLine: settings.perLine, ...example.settings });
    setText(example.text);
  }
  function clearScore() {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return; }
    stop();
    setConfirmClear(false);
    setText("");
    setSettings(current => ({ ...defaultSettings, labels: current.labels, perLine: current.perLine }));
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <style>{`.score-active path,.score-active text{fill:#5b3fd6!important;stroke:#5b3fd6}
.score-stage{background:radial-gradient(ellipse 75% 65% at 50% 45%,rgba(40,32,70,.55),rgba(0,0,0,0) 70%),rgba(7,5,14,.93);backdrop-filter:blur(12px) saturate(.4);animation:score-lights-down 1s cubic-bezier(.4,0,.2,1) both}
.score-stage::before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 42% 70% at 50% -8%,rgba(255,236,200,.2),rgba(255,236,200,.05) 55%,rgba(0,0,0,0) 75%);animation:score-spotlight 1.4s .7s ease-out both}
.score-stage[data-leaving]{animation:score-lights-up .7s cubic-bezier(.4,0,.2,1) both}
.score-stage[data-leaving]::before{animation:score-spotlight-off .35s ease-in both}
.score-on-stage{transform-origin:top left}
.score-on-stage #music-score-print{box-shadow:0 0 0 1px rgba(255,255,255,.06),0 50px 140px -20px rgba(0,0,0,.75),0 -20px 120px -40px rgba(255,236,200,.35)!important}
.score-stage[data-playing]::before{animation:score-beat var(--beat) cubic-bezier(.2,.7,.3,1) infinite}
.score-float{position:absolute;bottom:-60px;color:rgba(255,236,200,.13);text-shadow:0 0 18px rgba(255,236,200,.25);animation:score-float linear infinite;will-change:transform}
.score-changed path,.score-changed text{animation:score-changed-ink 1.8s ease-out both}
.score-changed{animation:score-changed-glow 1.8s ease-out both}
.score-on-stage .score-active{filter:drop-shadow(0 0 7px rgba(91,63,214,.65))}
@keyframes score-beat{0%{opacity:1}100%{opacity:.45}}
@keyframes score-float{0%{transform:translateY(0) rotate(-10deg);opacity:0}12%{opacity:1}85%{opacity:1}100%{transform:translateY(-115vh) rotate(12deg);opacity:0}}
@keyframes score-changed-ink{0%,45%{fill:#d97706;stroke:#d97706}}
@keyframes score-changed-glow{0%{filter:drop-shadow(0 0 0 rgba(245,158,11,0))}15%{filter:drop-shadow(0 0 9px rgba(245,158,11,.95))}100%{filter:drop-shadow(0 0 0 rgba(245,158,11,0))}}
@keyframes score-lights-down{from{opacity:0;backdrop-filter:blur(0) saturate(1)}}
@keyframes score-lights-up{to{opacity:0;backdrop-filter:blur(0) saturate(1)}}
@keyframes score-spotlight{0%{opacity:0}35%{opacity:1}55%{opacity:.65}100%{opacity:1}}
@keyframes score-spotlight-off{to{opacity:0}}
@media (prefers-reduced-motion:reduce){.score-stage,.score-stage::before,.score-float,.score-changed,.score-changed path,.score-changed text{animation:none!important}.score-float{display:none}}
@media print{body *:not(:has(#music-score-print)):not(#music-score-print):not(#music-score-print *){display:none!important}body *:has(#music-score-print),#music-score-print{display:block!important;position:static!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;max-width:none!important;background:#fff!important}#music-score-print>div{width:100%!important}#music-score-print svg{width:100%!important;min-width:0!important}@page{size:A4;margin:14mm}}`}</style>
      <MusicScoreGuide open={guideOpen} onClose={() => setGuideOpen(false)} hasScore={Boolean(text.trim())} onAppend={appendExample} onReplace={replaceWithExample} />
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><Music size={16} /> 교사 지원실 · 음악</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">수업용 악보 만들기</h1>
          <p className="mt-2 max-w-3xl break-keep text-[.86rem] leading-6 text-ink-3">한글 계이름으로 적거나 건반을 눌러 악보를 만들고, 소리로 확인한 뒤 그림 파일로 저장하거나 인쇄합니다.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
      </header>

      <section className="mt-6 grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)] xl:items-start">
        <div className="space-y-4">
          <div className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-ink">악보 정보</h2>
              <div className="flex gap-1.5">
                <span className="relative">
                  <select aria-label="예시 불러오기" value="" onChange={event => loadExample(Number(event.target.value))} className="min-h-9 appearance-none rounded-lg border border-line bg-surface py-1.5 pl-2.5 pr-8 text-xs font-semibold text-ink-3 hover:border-brand/30">
                    <option value="" disabled>예시 불러오기</option>
                    {(["기초 연습", "쉬운 가락"] as const).map(group => <optgroup key={group} label={group}>
                      {examples.map((example, index) => example.group === group && <option key={example.name} value={index}>{example.name}</option>)}
                    </optgroup>)}
                  </select>
                  <ChevronDown size={13} aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-4" />
                </span>
                <Button variant={confirmClear ? "danger" : "ghost"} size="sm" onClick={clearScore}><FilePlus2 size={14} /> {confirmClear ? "한 번 더 누르면 지워요" : "새 악보"}</Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="제목" className="sm:col-span-2"><input value={settings.title} maxLength={60} onChange={event => update({ title: event.target.value })} placeholder="악보 제목" className={inputClass} /></Field>
              <Field label="작사"><input value={settings.lyricist} maxLength={40} onChange={event => update({ lyricist: event.target.value })} className={inputClass} /></Field>
              <Field label="작곡"><input value={settings.composer} maxLength={40} onChange={event => update({ composer: event.target.value })} className={inputClass} /></Field>
              <Select label="음자리표" value={settings.clef} onChange={value => update({ clef: value as ScoreSettings["clef"] })}>
                {Object.entries(clefs).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
              <Select label="조" value={settings.key} onChange={value => update({ key: value as ScoreSettings["key"] })}>
                <optgroup label="장조">{musicKeys.filter(key => !key.minor).map(key => <option key={key.id} value={key.id}>{key.name}</option>)}</optgroup>
                <optgroup label="단조">{musicKeys.filter(key => key.minor).map(key => <option key={key.id} value={key.id}>{key.name}</option>)}</optgroup>
              </Select>
              <Select label="박자" value={settings.time} onChange={value => update({ time: value as ScoreSettings["time"] })}>
                {timeSignatures.map(time => <option key={time} value={time}>{time}박자</option>)}
              </Select>
              <Field label={`빠르기 (1분에 ${settings.time.endsWith("/8") ? "8분음표" : "4분음표"} ${settings.tempo}번)`}>
                <input type="number" min={40} max={220} value={settings.tempo} onChange={event => update({ tempo: Math.min(220, Math.max(40, Number(event.target.value) || 90)) })} className={inputClass} />
              </Field>
            </div>
          </div>

          <div className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
            <label htmlFor="score-text" className="text-sm font-extrabold text-ink">계이름으로 입력</label>
            <textarea id="score-text" ref={textRef} value={text} onChange={event => setText(event.target.value)} rows={6} spellCheck={false}
              placeholder="도4 레8 미8 파4 솔4 | 라2 솔2 |" className="mt-2 w-full resize-y rounded-xl border border-line bg-surface-2 px-3 py-2.5 font-mono text-[.95rem] leading-7 text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10" />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
              <p className="font-mono text-xs text-ink-3">예: 도4 레8 미8 파4. 솔8 | 쉼4 높은도2. |</p>
              <Button variant="secondary" size="sm" onClick={() => setGuideOpen(true)} aria-haspopup="dialog"><BookOpenCheck size={14} /> 입력 방법 배우기</Button>
            </div>
          </div>

          <div className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
            <h2 className="text-sm font-extrabold text-ink">건반으로 입력</h2>
            <p className="mt-1 text-xs text-ink-4">커서 위치에 들어가요. 마디가 꽉 차면 마디 구분이 자동으로 붙어요.</p>
            <div className="mt-3 space-y-2">
              <Segmented label="음표 길이" value={duration} onChange={value => { setDuration(value); if (value === 16) setDotted(false); }} options={durations.map(value => ({ value, label: durationNames[value] }))} />
              <div className="flex flex-wrap gap-2">
                <Segmented label="점음표" value={dotted ? "dot" : "plain"} onChange={value => setDotted(value === "dot" && duration !== 16)} options={[{ value: "plain", label: "점 없음" }, { value: "dot", label: "점음표" }]} />
                <Segmented label="음 높이" value={shift} onChange={setShift} options={[{ value: -1, label: "낮은" }, { value: 0, label: "가운데" }, { value: 1, label: "높은" }]} />
                <Segmented label="올림·내림" value={alter} onChange={setAlter} options={[{ value: -1, label: "내림 b" }, { value: 0, label: "없음" }, { value: 1, label: "올림 #" }]} />
              </div>
            </div>
            <label className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-1.5">
              <span className="shrink-0 text-xs font-semibold text-ink-3">코드</span>
              <input value={chord} maxLength={10} onChange={event => setChord(event.target.value.replace(/[\s[\]|]/g, ""))} placeholder="예: C, G7, Am (다음 음표 위에 표시)" className="min-h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-4" />
              {chord && <button type="button" onClick={() => setChord("")} className="shrink-0 text-xs font-semibold text-ink-4 hover:text-brand-dark">지우기</button>}
            </label>
            <div className="mt-3 grid grid-cols-7 gap-1 rounded-xl bg-[#2d2a3e] p-1.5">
              {solfegeNames.map((name, degree) => <button key={name} type="button" onClick={() => insertNote(noteToken({ degree, alter, shift, duration, dotted }))}
                className="flex min-h-20 flex-col items-center justify-end rounded-b-lg rounded-t-sm bg-white pb-2 text-[.95rem] font-extrabold text-ink shadow-[inset_0_-4px_0_#e4e1ef] transition active:translate-y-px active:shadow-none hover:bg-brand-page">
                {name}<span className="text-[.62rem] font-semibold text-ink-4">{alter > 0 ? "#" : alter < 0 ? "b" : ""}{shift > 0 ? "높은" : shift < 0 ? "낮은" : ""}</span>
              </button>)}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <Button variant="secondary" size="sm" onClick={() => insertNote(noteToken({ rest: true, duration, dotted }))}>쉼표 넣기</Button>
              <Button variant="secondary" size="sm" onClick={() => insert("|")}>마디 나누기</Button>
              <Button variant="secondary" size="sm" onClick={removeLast}><Delete size={14} /> 하나 지우기</Button>
            </div>
          </div>

          <div className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
            <label htmlFor="score-lyrics" className="text-sm font-extrabold text-ink">가사</label>
            <p className="mt-1 text-xs text-ink-4">띄어쓰기로 나눈 글자가 음표에 차례로 붙어요. 쉼표와 붙임줄 뒤 음은 건너뛰고, ‘-’는 음표 하나를 비워요.</p>
            <textarea id="score-lyrics" value={settings.lyrics} onChange={event => update({ lyrics: event.target.value })} rows={3} placeholder="반 짝 반 짝 작 은 별" className="mt-2 w-full resize-y rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm leading-6 text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10" />
          </div>
        </div>

        {/* sticky 칸은 자체 쌓임 맥락을 만들므로, 몰입 중에는 칸을 상단 메뉴보다 위로 올려 무대가 화면 전체를 덮게 합니다. 칸은 제자리 높이를 지켜 돌아올 자리를 남깁니다. */}
        <div ref={scoreHomeRef} className={cn("min-w-0 xl:sticky xl:top-24", immersion !== "off" && "relative z-[60]")} style={immersion !== "off" ? { height: homeHeight } : undefined}>
          {immersion !== "off" && <div data-leaving={immersion === "leaving" || undefined} data-playing={playing || undefined} style={{ "--beat": `${60 / settings.tempo}s` } as React.CSSProperties} className="score-stage fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
            {floatingNotes.map((note, i) => <span key={i} className="score-float" style={{ left: `${note.left}%`, fontSize: note.size, animationDuration: `${note.duration}s`, animationDelay: `-${note.delay}s` }}>{note.glyph}</span>)}
          </div>}
          <div ref={scoreCardRef} className={cn("space-y-3", immersion !== "off" && "score-on-stage scrollbar-subtle fixed z-[51] max-h-[calc(100dvh-48px)] overflow-y-auto rounded-[18px]")}>
            <div className="rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-ink">악보 보기 설정</h2>
                <div className="flex flex-wrap items-center gap-1.5">
                  {immersion === "off"
                    ? <Button variant="secondary" size="sm" onClick={enterImmersion} disabled={!noteCount} title="주변을 어둡게 하고 이 창만 무대에 띄워요"><MoonStar size={14} /> 악보 몰입</Button>
                    : <Button variant="secondary" size="sm" onClick={exitImmersion} disabled={immersion === "leaving"}><Sun size={14} /> 몰입 끝내기 <kbd className="rounded border border-line px-1 font-sans text-[.65rem] text-ink-4">Esc</kbd></Button>}
                  {playing
                    ? <Button size="sm" onClick={stop}><Square size={14} /> 정지</Button>
                    : <Button size="sm" onClick={play} disabled={!noteCount}><Play size={14} /> 소리 듣기</Button>}
                  <Button variant="secondary" size="sm" onClick={downloadPng} disabled={!noteCount || exporting}>{exporting ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} PNG 저장</Button>
                  <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={!noteCount}><Printer size={14} /> 인쇄</Button>
                </div>
              </div>
              <div className="mt-3 grid gap-4 border-t border-line pt-3 lg:grid-cols-3">
                <ViewOption label="음표 아래 글자" help={labelHelp[settings.labels]}>
                  <Segmented label="음표 아래 글자" value={settings.labels} onChange={(value: LabelMode) => update({ labels: value })} options={[{ value: "solfege", label: "계이름 (도레미)" }, { value: "letter", label: "음이름 (다라마)" }, { value: "none", label: "글자 없음" }]} />
                </ViewOption>
                <ViewOption label="한 줄에 넣을 마디 수" help={`악보 한 줄에 마디를 ${settings.perLine}개씩 놓아요. 적을수록 마디가 넓어져 음표 사이가 여유 있고, 많을수록 한 장에 더 많이 들어가요. 저학년은 2~3마디, 보통은 4마디가 알맞아요.`}>
                  <Segmented label="한 줄에 넣을 마디 수" value={settings.perLine} onChange={value => update({ perLine: value })} options={[2, 3, 4, 5, 6].map(value => ({ value, label: `${value}마디` }))} />
                </ViewOption>
                <ViewOption label="화면에서 보는 크기" help="지금 화면에서 보는 크기만 바뀌어요. 100%는 미리보기 칸 너비에 꽉 맞춘 크기이고, 줄이면 한 화면에 더 많은 줄이 보여요. 인쇄와 PNG 저장 크기에는 영향이 없어요.">
                  <Segmented label="화면에서 보는 크기" value={zoom} onChange={setZoom} options={zoomLevels.map(value => ({ value, label: `${value}%` }))} />
                </ViewOption>
              </div>
              <details open={quickEditOpen} onToggle={event => setQuickEditOpen(event.currentTarget.open)} className="group mt-3 border-t border-line pt-3">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-ink-2 hover:text-brand-dark [&::-webkit-details-marker]:hidden">
                  <PencilLine size={14} /> 계이름으로 바로 고치기
                  <span className="font-semibold text-ink-4">왼쪽 입력창과 같은 내용이에요</span>
                  <ChevronDown size={15} aria-hidden="true" className="ml-auto text-ink-4 transition-transform group-open:rotate-180" />
                </summary>
                <textarea aria-label="계이름으로 바로 고치기" value={text} onChange={event => setText(event.target.value)} rows={4} spellCheck={false}
                  placeholder="도4 레8 미8 파4 솔4 | 라2 솔2 |" className="mt-2 w-full resize-y rounded-xl border border-line bg-surface-2 px-3 py-2.5 font-mono text-[.95rem] leading-7 text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10" />
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="break-keep text-xs leading-5 text-ink-4">고치면 바로 악보에 반영되고, 틀린 곳은 악보 아래에 안내돼요.</p>
                  <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)} aria-haspopup="dialog"><BookOpenCheck size={14} /> 입력 방법 배우기</Button>
                </div>
              </details>
            </div>

            <div id="music-score-print" className="overflow-x-auto rounded-[18px] border border-line bg-white p-3 shadow-[var(--lift-2)] sm:p-5">
              <div ref={hostRef} role="img" aria-label={`${settings.title || "악보"} 미리보기, ${parsed.measures.length}마디`} style={{ width: `${zoom}%` }} className="mx-auto [&>svg]:block" />
              {!noteCount && <div className="py-10 text-center text-sm text-ink-4"><p>왼쪽에 계이름을 적거나 건반을 눌러 악보를 시작하세요.</p><button type="button" onClick={() => setGuideOpen(true)} className="mt-2 font-bold text-brand-dark underline-offset-4 hover:underline">처음이라면 입력 방법 배우기 →</button></div>}
            </div>

            <div className="rounded-[18px] border border-line bg-surface px-4 py-3 text-[.82rem] shadow-[var(--lift-1)]" aria-live="polite">
              {renderFailed && <p className="flex items-center gap-2 font-semibold text-danger"><AlertCircle size={15} /> 악보를 그리지 못했어요. 입력을 확인해 주세요.</p>}
              {parsed.errors.map(issue => <p key={issue.message} className="flex items-start gap-2 py-0.5 text-[#c2410c]"><AlertCircle size={15} className="mt-0.5 shrink-0" /> {issue.message}</p>)}
              {parsed.warnings.map(issue => <p key={issue.message} className="flex items-start gap-2 py-0.5 text-[#806426]"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> {issue.message}</p>)}
              {!parsed.errors.length && !renderFailed && <p className="flex items-center gap-2 font-semibold text-ok"><CheckCircle2 size={15} /> {parsed.measures.length}마디 · 음표 {noteCount}개 · 박자가 모두 맞아요.</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
