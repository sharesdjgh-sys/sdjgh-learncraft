"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { hanjaOf } from "@/features/hanmun/content";
import { HanmunLine, type EditableSentence } from "./hanmun-sentence";

const layers = [
  { key: "slash", label: "끊어 읽기" },
  { key: "to", label: "토" },
  { key: "reading", label: "독음" },
  { key: "meaning", label: "풀이" },
  { key: "words", label: "어휘" },
] as const;
type Layer = (typeof layers)[number]["key"];

// 긴 문장도 한 화면에 들어가도록 한자 수에 따라 글자 크기를 줄입니다.
const lineSize = (count: number) => count <= 8 ? "text-[clamp(2.6rem,7vw,6.5rem)]" : count <= 16 ? "text-[clamp(2.2rem,5.2vw,5rem)]" : count <= 28 ? "text-[clamp(1.8rem,3.8vw,3.6rem)]" : "text-[clamp(1.5rem,2.8vw,2.7rem)]";

/** 수업 중에 원문을 크게 띄우고, 설명하는 순서대로 끊어 읽기·토·독음·풀이를 하나씩 켭니다. */
export function HanmunShow({ title, sentences, onClose }: { title: string; sentences: EditableSentence[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [all, setAll] = useState(false);
  const [shown, setShown] = useState<Record<Layer, boolean>>({ slash: false, to: false, reading: false, meaning: false, words: false });
  const stage = useRef<HTMLDivElement>(null);
  const last = sentences.length - 1;
  const toggle = (layer: Layer) => setShown(current => ({ ...current, [layer]: !current[layer] }));
  const fullscreen = () => void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen().catch(() => undefined));

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
  const list = all ? sentences : sentences.slice(index, index + 1);
  return (
    <div ref={stage} role="dialog" aria-modal="true" aria-label="한문 수업 화면" className="fixed inset-0 z-[80] flex flex-col bg-[#fbf7ee] text-[#1f1a14]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="min-w-0 truncate text-[.82rem] font-semibold text-[#6d6252]">{title || "한문 원문"} · {all ? `전체 ${sentences.length}문장` : `${index + 1} / ${sentences.length}`}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {layers.map((layer, layerIndex) => (
            <button key={layer.key} type="button" aria-pressed={shown[layer.key]} onClick={() => toggle(layer.key)} title={`${layer.label} 보이기·가리기 (${layerIndex + 1})`}
              className={cn("min-h-10 rounded-full px-3.5 text-[.8rem] font-bold transition", shown[layer.key] ? "bg-[#7a2f1f] text-white" : "bg-[#2b2418]/8 text-[#3b3226] hover:bg-[#2b2418]/15")}>
              <span className="mr-1 text-[.7em] opacity-60">{layerIndex + 1}</span>{layer.label}
            </button>
          ))}
          <button type="button" aria-pressed={all} onClick={() => setAll(value => !value)} title="한 문장씩·전체 보기 (A)" className={cn("min-h-10 rounded-full px-3.5 text-[.8rem] font-bold transition", all ? "bg-[#3b3226] text-white" : "bg-[#2b2418]/8 text-[#3b3226] hover:bg-[#2b2418]/15")}>전체</button>
          <button type="button" onClick={fullscreen} className={control} aria-label="전체 화면 (F)"><Maximize2 size={17} /></button>
          <button type="button" onClick={onClose} className={control} aria-label="닫기 (Esc)"><X size={18} /></button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-20">
        <div className={cn("mx-auto flex min-h-full max-w-[1500px] flex-col", all ? "gap-8 py-6" : "justify-center gap-6 py-4")}>
          {list.map(sentence => {
            const count = hanjaOf(sentence.hyeonto).length;
            return (
              <section key={sentence.id} className={cn(all ? "border-b border-[#2b2418]/10 pb-6" : "text-center")}>
                <HanmunLine sentence={sentence} slash={shown.slash} to={shown.to} reading={shown.reading} accent="text-[#a3402a]"
                  className={cn("text-[#1f1a14] [&_rt]:text-[#8a5a3c]", all ? "text-[clamp(1.6rem,3vw,2.8rem)]" : lineSize(count), shown.reading && "leading-[2.4]")} />
                {shown.meaning && (
                  <div className={cn("mt-4 space-y-1 break-keep", all ? "text-[clamp(1rem,1.5vw,1.35rem)]" : "text-[clamp(1.15rem,2.1vw,2rem)]")}>
                    <p className="font-semibold text-[#2b2418]">{sentence.literal}</p>
                    {sentence.free && sentence.free !== sentence.literal && <p className="text-[.85em] text-[#6d6252]">{sentence.free}</p>}
                  </div>
                )}
                {shown.words && sentence.words.length > 0 && (
                  <ul className={cn("mt-4 flex flex-wrap gap-2", !all && "justify-center")}>
                    {sentence.words.map((word, wordIndex) => (
                      <li key={wordIndex} className="rounded-2xl bg-white/80 px-3.5 py-2 text-[clamp(.95rem,1.4vw,1.25rem)] shadow-[0_2px_10px_rgba(60,40,20,.08)]">
                        <span className="font-learning text-[1.3em] font-bold">{word.term}</span>
                        {word.reading && <span className="ml-1 text-[#8a5a3c]">{word.reading}</span>}
                        <span className="ml-2 text-[#3b3226]">{word.meaning}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
        {!all && <>
          <button type="button" onClick={() => setIndex(value => Math.max(0, value - 1))} disabled={index === 0} className={cn(control, "fixed left-3 top-1/2 -translate-y-1/2")} aria-label="이전 문장"><ChevronLeft size={22} /></button>
          <button type="button" onClick={() => setIndex(value => Math.min(last, value + 1))} disabled={index >= last} className={cn(control, "fixed right-3 top-1/2 -translate-y-1/2")} aria-label="다음 문장"><ChevronRight size={22} /></button>
        </>}
      </div>
      <p className="pb-2 text-center text-[.7rem] text-[#6d6252]/70">← → 문장 넘기기 · 1~5 켜고 끄기 · A 전체 · F 전체 화면 · Esc 닫기</p>
    </div>
  );
}
