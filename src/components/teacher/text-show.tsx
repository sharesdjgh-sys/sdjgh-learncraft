"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { plainOf, type TextProfile } from "@/features/study-text/core";
import { StudyLine, type EditableSentence } from "./text-sentence";

const layers = [
  { key: "ruby", label: "읽기" },
  { key: "spaced", label: "끊어 읽기" },
  { key: "meaning", label: "해석" },
  { key: "grammar", label: "문법" },
  { key: "words", label: "낱말" },
] as const;
type Layer = (typeof layers)[number]["key"];
const rates = [0.6, 0.8, 1] as const;

// 긴 문장도 한 화면에 들어가도록 글자 수에 따라 글자 크기를 줄입니다.
const lineSize = (count: number) => count <= 12 ? "text-[clamp(2.4rem,6vw,5.6rem)]" : count <= 24 ? "text-[clamp(2rem,4.4vw,4.2rem)]" : count <= 40 ? "text-[clamp(1.7rem,3.3vw,3.1rem)]" : "text-[clamp(1.4rem,2.5vw,2.4rem)]";

/** 수업 중에 본문을 크게 띄우고, 설명하는 순서대로 읽기(후리가나·병음)·끊어 읽기·해석·문법을 하나씩 켭니다. S를 누르면 문장을 읽어 줍니다. */
export function StudyTextShow({ profile, title, sentences, speak, onClose }: { profile: TextProfile; title: string; sentences: EditableSentence[]; speak: (text: string, rate?: number) => void; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [all, setAll] = useState(false);
  const [rate, setRate] = useState<(typeof rates)[number]>(0.8);
  const [shown, setShown] = useState<Record<Layer, boolean>>({ ruby: false, spaced: false, meaning: false, grammar: false, words: false });
  const stage = useRef<HTMLDivElement>(null);
  const last = sentences.length - 1;
  const toggle = (layer: Layer) => setShown(current => ({ ...current, [layer]: !current[layer] }));
  const fullscreen = () => void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen().catch(() => undefined));
  const say = useRef(() => {});
  useEffect(() => { say.current = () => speak(all ? sentences.map(sentence => plainOf(sentence.ruby)).join("") : plainOf(sentences[index]?.ruby ?? ""), rate); });

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
      else if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); setIndex(value => Math.min(last, value + 1)); }
      else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); setIndex(value => Math.max(0, value - 1)); }
      else if (/^[1-5]$/.test(key)) {
        const layer = layers[Number(key) - 1].key;
        setShown(current => ({ ...current, [layer]: !current[layer] }));
      }
      else if (key === "a") setAll(value => !value);
      else if (key === "s") say.current();
      else if (key === "f") void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen().catch(() => undefined));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, [last, onClose]);

  const control = "grid size-11 place-items-center rounded-full bg-[#2b2418]/8 text-[#3b3226] transition hover:bg-[#2b2418]/15 disabled:opacity-25";
  const pill = (active: boolean) => cn("min-h-10 rounded-full px-3.5 text-[.8rem] font-bold transition", active ? "bg-[#7a2f1f] text-white" : "bg-[#2b2418]/8 text-[#3b3226] hover:bg-[#2b2418]/15");
  const list = all ? sentences : sentences.slice(index, index + 1);
  return (
    <div ref={stage} role="dialog" aria-modal="true" aria-label={`${profile.language} 수업 화면`} className="fixed inset-0 z-[80] flex flex-col bg-[#fbf7ee] text-[#1f1a14]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="min-w-0 truncate text-[.82rem] font-semibold text-[#6d6252]">{title || `${profile.language} 본문`} · {all ? `전체 ${sentences.length}문장` : `${index + 1} / ${sentences.length}`}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {layers.map((layer, layerIndex) => (
            <button key={layer.key} type="button" aria-pressed={shown[layer.key]} onClick={() => toggle(layer.key)} title={`${layer.key === "ruby" ? profile.rubyName : layer.label} 보이기·가리기 (${layerIndex + 1})`} className={pill(shown[layer.key])}>
              <span className="mr-1 text-[.7em] opacity-60">{layerIndex + 1}</span>{layer.key === "ruby" ? profile.rubyName : layer.label}
            </button>
          ))}
          <button type="button" aria-pressed={all} onClick={() => setAll(value => !value)} title="한 문장씩·전체 보기 (A)" className={cn("min-h-10 rounded-full px-3.5 text-[.8rem] font-bold transition", all ? "bg-[#3b3226] text-white" : "bg-[#2b2418]/8 text-[#3b3226] hover:bg-[#2b2418]/15")}>전체</button>
          <span className="flex items-center gap-0.5 rounded-full bg-[#2b2418]/8 p-0.5">
            <button type="button" onClick={() => say.current()} className="flex min-h-9 items-center gap-1 rounded-full px-3 text-[.8rem] font-bold text-[#3b3226] hover:bg-[#2b2418]/10" title="읽어 주기 (S)"><Volume2 size={15} /> 읽기</button>
            {rates.map(value => <button key={value} type="button" aria-pressed={rate === value} onClick={() => setRate(value)} className={cn("min-h-9 rounded-full px-2 text-[.72rem] font-bold", rate === value ? "bg-white text-[#3b3226] shadow" : "text-[#6d6252]")} title="읽기 빠르기">{value === 1 ? "보통" : value === 0.8 ? "조금 느리게" : "느리게"}</button>)}
          </span>
          <button type="button" onClick={fullscreen} className={control} aria-label="전체 화면 (F)"><Maximize2 size={17} /></button>
          <button type="button" onClick={onClose} className={control} aria-label="닫기 (Esc)"><X size={18} /></button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-20">
        <div className={cn("mx-auto flex min-h-full max-w-[1500px] flex-col", all ? "gap-8 py-6" : "justify-center gap-6 py-4")}>
          {list.map(sentence => (
            <section key={sentence.id} className={cn(all ? "border-b border-[#2b2418]/10 pb-6" : "text-center")}>
              <StudyLine profile={profile} ruby={sentence.ruby} showRuby={shown.ruby} spaced={shown.spaced} accent="text-[#a3402a]"
                className={cn("text-[#1f1a14] [&_rt]:text-[#8a5a3c]", all ? "text-[clamp(1.6rem,3vw,2.8rem)]" : lineSize([...plainOf(sentence.ruby)].length), shown.ruby && "leading-[2.3]")} />
              {shown.meaning && sentence.translation && <p className={cn("mt-4 break-keep font-semibold text-[#2b2418]", all ? "text-[clamp(1rem,1.5vw,1.35rem)]" : "text-[clamp(1.15rem,2.1vw,2rem)]")}>{sentence.translation}</p>}
              {shown.grammar && sentence.grammar.length > 0 && (
                <ul className={cn("mt-4 flex flex-wrap gap-2", !all && "justify-center")}>
                  {sentence.grammar.map((item, itemIndex) => (
                    <li key={itemIndex} className="rounded-2xl bg-[#7a2f1f]/8 px-3.5 py-2 text-[clamp(.95rem,1.4vw,1.25rem)]">
                      <span lang={profile.speech} className={cn(profile.fontClass, "text-[1.2em] font-bold text-[#7a2f1f]")}>{item.pattern || item.surface}</span>
                      <span className="ml-2 text-[#3b3226]">{item.meaning}</span>
                    </li>
                  ))}
                </ul>
              )}
              {shown.words && sentence.words.length > 0 && (
                <ul className={cn("mt-4 flex flex-wrap gap-2", !all && "justify-center")}>
                  {sentence.words.map((word, wordIndex) => (
                    <li key={wordIndex} className="rounded-2xl bg-white/80 px-3.5 py-2 text-[clamp(.95rem,1.4vw,1.25rem)] shadow-[0_2px_10px_rgba(60,40,20,.08)]">
                      <span lang={profile.speech} className={cn(profile.fontClass, "text-[1.2em] font-bold")}>{word.word}</span>
                      {word.reading && word.reading !== word.word && <span lang={profile.speech} className={cn(profile.fontClass, "ml-1 text-[#8a5a3c]")}>{word.reading}</span>}
                      <span className="ml-2 text-[#3b3226]">{word.meaning}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        {!all && <>
          <button type="button" onClick={() => setIndex(value => Math.max(0, value - 1))} disabled={index === 0} className={cn(control, "fixed left-3 top-1/2 -translate-y-1/2")} aria-label="이전 문장"><ChevronLeft size={22} /></button>
          <button type="button" onClick={() => setIndex(value => Math.min(last, value + 1))} disabled={index >= last} className={cn(control, "fixed right-3 top-1/2 -translate-y-1/2")} aria-label="다음 문장"><ChevronRight size={22} /></button>
        </>}
      </div>
      <p className="pb-2 text-center text-[.7rem] text-[#6d6252]/70">← → 문장 넘기기 · 1~5 켜고 끄기 · S 읽어 주기 · A 전체 · F 전체 화면 · Esc 닫기</p>
    </div>
  );
}
