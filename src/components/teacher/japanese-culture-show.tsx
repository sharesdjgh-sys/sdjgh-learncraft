"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { cultureCategories, stripRuby, type CultureTopic } from "@/features/japanese/culture";
import { RubyInline } from "./japanese-ruby";

const layers = [
  { key: "summary", label: "설명" },
  { key: "points", label: "핵심 내용" },
  { key: "words", label: "낱말·표현" },
  { key: "compare", label: "한국과 비교" },
  { key: "quiz", label: "O·X" },
] as const;
type Layer = (typeof layers)[number]["key"];

/** 수업 중에 주제를 한 장씩 크게 띄우고, 설명하는 순서대로 내용을 하나씩 켭니다. O·X는 Q로 답을 보여 줍니다. */
export function JapaneseCultureShow({ topics, images, speak, onClose }: { topics: CultureTopic[]; images: Record<string, string>; speak: (text: string) => void; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState<Record<Layer, boolean>>({ summary: true, points: false, words: false, compare: false, quiz: false });
  const [answers, setAnswers] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const last = topics.length - 1;
  const topic = topics[index];
  const toggle = (layer: Layer) => setShown(current => ({ ...current, [layer]: !current[layer] }));
  const fullscreen = () => void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen().catch(() => undefined));
  const move = (step: number) => {
    setIndex(value => Math.max(0, Math.min(last, value + step)));
    setAnswers(false);
  };
  const say = () => topic && speak(stripRuby(topic.phrase?.ja ?? topic.ja));
  const handlers = useRef({ move, say });
  useEffect(() => { handlers.current = { move, say }; });

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
      else if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); handlers.current.move(1); }
      else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); handlers.current.move(-1); }
      else if (/^[1-5]$/.test(key)) {
        const layer = layers[Number(key) - 1].key;
        setShown(current => ({ ...current, [layer]: !current[layer] }));
      }
      else if (key === "q") setAnswers(value => !value);
      else if (key === "s") handlers.current.say();
      else if (key === "f") void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen().catch(() => undefined));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, [onClose]);

  const control = "grid size-11 place-items-center rounded-full bg-[#2b2418]/8 text-[#3b3226] transition hover:bg-[#2b2418]/15 disabled:opacity-25";
  const pill = (active: boolean) => cn("min-h-10 rounded-full px-3.5 text-[.8rem] font-bold transition", active ? "bg-[#7a2f1f] text-white" : "bg-[#2b2418]/8 text-[#3b3226] hover:bg-[#2b2418]/15");
  if (!topic) return null;
  const box = "rounded-3xl bg-white/75 p-5 shadow-[0_2px_14px_rgba(60,40,20,.07)]";
  return (
    <div ref={stage} role="dialog" aria-modal="true" aria-label="일본문화 수업 화면" className="fixed inset-0 z-[80] flex flex-col bg-[#fbf7ee] text-[#1f1a14]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="text-[.82rem] font-semibold text-[#6d6252]">{index + 1} / {topics.length} · {cultureCategories[topic.category]}{topic.when ? ` · ${topic.when}` : ""}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {layers.map((layer, layerIndex) => (
            <button key={layer.key} type="button" aria-pressed={shown[layer.key]} onClick={() => toggle(layer.key)} title={`${layer.label} 보이기·가리기 (${layerIndex + 1})`} className={pill(shown[layer.key])}>
              <span className="mr-1 text-[.7em] opacity-60">{layerIndex + 1}</span>{layer.label}
            </button>
          ))}
          <button type="button" aria-pressed={answers} onClick={() => setAnswers(value => !value)} className={pill(answers)} title="O·X 답 보기 (Q)">답</button>
          <button type="button" onClick={say} className="flex min-h-10 items-center gap-1 rounded-full bg-[#2b2418]/8 px-3.5 text-[.8rem] font-bold text-[#3b3226] hover:bg-[#2b2418]/15" title="일본어 읽어 주기 (S)"><Volume2 size={15} /> 읽기</button>
          <button type="button" onClick={fullscreen} className={control} aria-label="전체 화면 (F)"><Maximize2 size={17} /></button>
          <button type="button" onClick={onClose} className={control} aria-label="닫기 (Esc)"><X size={18} /></button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-20">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5 py-4">
          <header className="text-center">
            <p className="font-ja text-[clamp(3rem,8vw,6.5rem)] leading-[1.5] [&_rt]:text-[.3em] [&_rt]:text-[#8a5a3c]" lang="ja"><RubyInline text={topic.ja} /></p>
            <p className="text-[clamp(1.2rem,2.4vw,2.2rem)] font-extrabold text-[#6d6252]">{topic.title}</p>
          </header>
          {images[topic.id] && (
            // eslint-disable-next-line @next/next/no-img-element -- GPT가 만든 base64 그림은 next/image 최적화 대상이 아닙니다.
            <img src={images[topic.id]} alt={`${topic.title} 그림`} className="mx-auto max-h-[46vh] w-auto max-w-full rounded-3xl shadow-[0_2px_14px_rgba(60,40,20,.1)]" />
          )}
          {shown.summary && <p className="mx-auto max-w-5xl break-keep text-center text-[clamp(1.1rem,1.9vw,1.75rem)] font-semibold leading-relaxed">{topic.summary}</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            {shown.points && (
              <ul className={cn(box, "space-y-2 text-[clamp(1rem,1.5vw,1.4rem)] leading-relaxed lg:col-span-2")}>
                {topic.points.map(point => <li key={point} className="flex gap-2 break-keep"><span className="text-[#a3402a]">●</span><span>{point}</span></li>)}
              </ul>
            )}
            {shown.words && (
              <div className={box}>
                <ul className="flex flex-wrap gap-2">
                  {topic.words.map(word => (
                    <li key={word.word}><button type="button" onClick={() => speak(word.reading)} className="rounded-2xl bg-[#fbf7ee] px-3.5 py-2 text-left text-[clamp(.95rem,1.4vw,1.25rem)] hover:bg-[#f3ead8]">
                      <span lang="ja" className="font-ja text-[1.25em] font-bold">{word.word}</span>
                      {word.reading !== word.word && <span lang="ja" className="font-ja ml-1 text-[#8a5a3c]">{word.reading}</span>}
                      <span className="ml-2 text-[#3b3226]">{word.meaning}</span>
                    </button></li>
                  ))}
                </ul>
                {topic.phrase && (
                  <button type="button" onClick={() => speak(stripRuby(topic.phrase!.ja))} className="mt-3 block w-full rounded-2xl bg-[#7a2f1f]/8 px-4 py-3 text-left hover:bg-[#7a2f1f]/12">
                    <span lang="ja" className="font-ja block text-[clamp(1.3rem,2.2vw,2rem)] font-bold text-[#7a2f1f] [&_rt]:text-[.45em]"><RubyInline text={topic.phrase.ja} /></span>
                    <span className="text-[clamp(.95rem,1.4vw,1.2rem)] text-[#3b3226]">{topic.phrase.ko}</span>
                  </button>
                )}
              </div>
            )}
            {shown.compare && (
              <div className={cn(box, "grid grid-cols-2 gap-3 text-[clamp(1rem,1.5vw,1.35rem)]")}>
                <div><p className="mb-1 text-[.8em] font-extrabold text-[#a3402a]">일본</p><p className="break-keep">{topic.japan}</p></div>
                <div><p className="mb-1 text-[.8em] font-extrabold text-[#2f5d8a]">한국</p><p className="break-keep">{topic.korea}</p></div>
                <p className="col-span-2 border-t border-[#2b2418]/10 pt-2 text-[.9em] text-[#6d6252]">{topic.think}</p>
              </div>
            )}
            {shown.quiz && (
              <ol className={cn(box, "space-y-2 text-[clamp(1rem,1.5vw,1.35rem)] lg:col-span-2")}>
                {topic.quiz.map((quiz, quizIndex) => (
                  <li key={quiz.statement} className="flex items-start gap-3 break-keep">
                    <span className="font-bold text-[#6d6252]">{quizIndex + 1}.</span>
                    <span className="flex-1">{quiz.statement}{answers && quiz.note && <span className="block text-[.85em] text-[#6d6252]">{quiz.note}</span>}</span>
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-[1.1em] font-extrabold", answers ? quiz.answer ? "bg-[#2f5d8a] text-white" : "bg-[#a3402a] text-white" : "bg-[#2b2418]/8 text-transparent")}>{quiz.answer ? "O" : "X"}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
      <button type="button" onClick={() => move(-1)} disabled={index === 0} className={cn(control, "fixed left-3 top-1/2 -translate-y-1/2")} aria-label="이전 주제"><ChevronLeft size={22} /></button>
      <button type="button" onClick={() => move(1)} disabled={index >= last} className={cn(control, "fixed right-3 top-1/2 -translate-y-1/2")} aria-label="다음 주제"><ChevronRight size={22} /></button>
      <p className="pb-2 text-center text-[.7rem] text-[#6d6252]/70">← → 주제 넘기기 · 1~5 켜고 끄기 · Q O·X 답 · S 읽어 주기 · F 전체 화면 · Esc 닫기</p>
    </div>
  );
}
