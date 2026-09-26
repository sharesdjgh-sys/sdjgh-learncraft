"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Maximize2, Shuffle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HanjaCard } from "@/features/hanmun/hanja";

/** 수업 중 한자를 한 글자씩 크게 띄우고, 학생이 답한 뒤 훈음과 한자어를 보여 줍니다. */
export function HanjaFlash({ cards, onClose }: { cards: HanjaCard[]; onClose: () => void }) {
  const [order, setOrder] = useState(() => cards.map((_, index) => index));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const last = cards.length - 1;
  const card = cards[order[index]];
  const fullscreen = () => void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen().catch(() => undefined));
  const shuffle = () => {
    setOrder(current => {
      const next = [...current];
      for (let position = next.length - 1; position > 0; position -= 1) {
        const other = Math.floor(Math.random() * (position + 1));
        [next[position], next[other]] = [next[other], next[position]];
      }
      return next;
    });
    setIndex(0);
    setRevealed(false);
  };
  const move = (step: number) => {
    setIndex(value => Math.max(0, Math.min(last, value + step)));
    setRevealed(false);
  };

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
      else if (["ArrowRight", "PageDown"].includes(event.key)) { event.preventDefault(); setIndex(value => Math.min(last, value + 1)); setRevealed(false); }
      else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); setIndex(value => Math.max(0, value - 1)); setRevealed(false); }
      else if ([" ", "Enter"].includes(event.key)) { event.preventDefault(); setRevealed(value => !value); }
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
  const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-[#2b2418]/8 px-3.5 text-[.8rem] font-bold text-[#3b3226] transition hover:bg-[#2b2418]/15";
  if (!card) return null;
  return (
    <div ref={stage} role="dialog" aria-modal="true" aria-label="한자 플래시 카드" className="fixed inset-0 z-[80] flex flex-col bg-[#fbf7ee] text-[#1f1a14]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="text-[.82rem] font-semibold tabular-nums text-[#6d6252]">{index + 1} / {cards.length}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setRevealed(value => !value)} className={cn(pill, revealed && "bg-[#7a2f1f] text-white hover:bg-[#7a2f1f]")} title="훈음 보이기·가리기 (Space)">{revealed ? <EyeOff size={15} /> : <Eye size={15} />} {revealed ? "훈음 가리기" : "훈음 보기"}</button>
          <button type="button" onClick={shuffle} className={pill} title="순서 섞기"><Shuffle size={15} /> 섞기</button>
          <button type="button" onClick={fullscreen} className={control} aria-label="전체 화면 (F)"><Maximize2 size={17} /></button>
          <button type="button" onClick={onClose} className={control} aria-label="닫기 (Esc)"><X size={18} /></button>
        </div>
      </div>
      <button type="button" onClick={() => setRevealed(value => !value)} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-20 pb-6" aria-label={revealed ? "훈음 가리기" : "훈음 보기"}>
        <span className="font-learning text-[clamp(8rem,34vh,20rem)] leading-none">{card.char}</span>
        <span className={cn("flex min-h-[9rem] flex-col items-center gap-3 transition-opacity", revealed ? "opacity-100" : "opacity-0")} aria-hidden={!revealed}>
          <span className="text-[clamp(2rem,5vw,4rem)] font-extrabold tracking-[-0.02em]">{card.meaning || "훈음 없음"}</span>
          <span className="text-[clamp(.95rem,1.5vw,1.3rem)] font-semibold text-[#6d6252]">{[card.radical && `부수 ${card.radical}`, card.strokes && `${card.strokes}획`].filter(Boolean).join(" · ")}</span>
          {card.words.length > 0 && (
            <span className="flex flex-wrap justify-center gap-2">
              {card.words.map(word => <span key={word.word} className="rounded-2xl bg-white/80 px-3.5 py-2 text-[clamp(1rem,1.6vw,1.4rem)] shadow-[0_2px_10px_rgba(60,40,20,.08)]"><span className="font-learning font-bold">{word.word}</span> <span className="text-[#8a5a3c]">{word.reading}</span>{word.meaning && <span className="ml-1.5 text-[#3b3226]">{word.meaning}</span>}</span>)}
            </span>
          )}
        </span>
      </button>
      <button type="button" onClick={() => move(-1)} disabled={index === 0} className={cn(control, "fixed left-3 top-1/2 -translate-y-1/2")} aria-label="이전 한자"><ChevronLeft size={22} /></button>
      <button type="button" onClick={() => move(1)} disabled={index >= last} className={cn(control, "fixed right-3 top-1/2 -translate-y-1/2")} aria-label="다음 한자"><ChevronRight size={22} /></button>
      <p className="pb-2 text-center text-[.7rem] text-[#6d6252]/70">Space 훈음 보기 · ← → 넘기기 · F 전체 화면 · Esc 닫기</p>
    </div>
  );
}
