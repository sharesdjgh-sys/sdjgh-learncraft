"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Maximize2, Shuffle, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneInfo, type Tone } from "@/features/chinese/pinyin";

export type ToneCard = { marked: string; base: string; tone: Tone; char: string };

/** 성조 높낮이 그림(5단계)입니다. */
export function ToneContour({ tone, className }: { tone: Tone; className?: string }) {
  const y = (level: number) => 44 - (level - 1) * 9;
  const points: Record<Tone, [number, number][]> = { 1: [[8, y(5)], [52, y(5)]], 2: [[8, y(3)], [52, y(5)]], 3: [[8, y(2)], [28, y(1)], [52, y(4)]], 4: [[8, y(5)], [52, y(1)]], 0: [] };
  return (
    <svg viewBox="0 0 60 50" className={className} role="img" aria-label={`${toneInfo[tone].name} ${toneInfo[tone].pitch}`}>
      {[1, 2, 3, 4, 5].map(level => <line key={level} x1="4" x2="56" y1={y(level)} y2={y(level)} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />)}
      {tone ? <polyline points={points[tone].map(point => point.join(",")).join(" ")} fill="none" stroke="#b3402a" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /> : <circle cx="30" cy={y(2)} r="4" fill="#b3402a" />}
    </svg>
  );
}

/** 수업 중 소리만 들려주고 성조를 맞히게 합니다. Space로 병음·글자·높낮이를 보여 줍니다. */
export function ToneFlash({ cards, speak, onClose }: { cards: ToneCard[]; speak: (text: string, rate?: number) => void; onClose: () => void }) {
  const [order, setOrder] = useState(() => cards.map((_, index) => index).sort(() => Math.random() - 0.5));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const last = cards.length - 1;
  const card = cards[order[index]];
  const fullscreen = () => void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen().catch(() => undefined));
  const play = () => card && speak(card.char, 0.7);
  const move = (step: number) => {
    const next = Math.max(0, Math.min(last, index + step));
    setIndex(next);
    setRevealed(false);
    const nextCard = cards[order[next]];
    if (nextCard && next !== index) speak(nextCard.char, 0.7);
  };
  const shuffle = () => {
    setOrder(current => [...current].sort(() => Math.random() - 0.5));
    setIndex(0);
    setRevealed(false);
  };
  const handlers = useRef({ move, play, reveal: () => setRevealed(value => !value) });
  useEffect(() => { handlers.current = { move, play, reveal: () => setRevealed(value => !value) }; });

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
      else if (["ArrowRight", "PageDown"].includes(event.key)) { event.preventDefault(); handlers.current.move(1); }
      else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); handlers.current.move(-1); }
      else if ([" ", "Enter"].includes(event.key)) { event.preventDefault(); handlers.current.reveal(); }
      else if (key === "s") handlers.current.play();
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
  const pill = "flex min-h-10 items-center gap-1.5 rounded-full bg-[#2b2418]/8 px-3.5 text-[.8rem] font-bold text-[#3b3226] transition hover:bg-[#2b2418]/15";
  if (!card) return null;
  return (
    <div ref={stage} role="dialog" aria-modal="true" aria-label="성조 듣기" className="fixed inset-0 z-[80] flex flex-col bg-[#fbf7ee] text-[#1f1a14]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="text-[.82rem] font-semibold tabular-nums text-[#6d6252]">{index + 1} / {cards.length} · 소리를 듣고 몇 성인지 맞혀 보세요</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={play} className={cn(pill, "bg-[#7a2f1f] text-white hover:bg-[#7a2f1f]")} title="다시 듣기 (S)"><Volume2 size={15} /> 듣기</button>
          <button type="button" onClick={() => setRevealed(value => !value)} className={pill} title="답 보이기·가리기 (Space)">{revealed ? <EyeOff size={15} /> : <Eye size={15} />} {revealed ? "답 가리기" : "답 보기"}</button>
          <button type="button" onClick={shuffle} className={pill} title="순서 섞기"><Shuffle size={15} /> 섞기</button>
          <button type="button" onClick={fullscreen} className={control} aria-label="전체 화면 (F)"><Maximize2 size={17} /></button>
          <button type="button" onClick={onClose} className={control} aria-label="닫기 (Esc)"><X size={18} /></button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-20 pb-6">
        <button type="button" onClick={play} className="grid size-[clamp(8rem,22vh,12rem)] place-items-center rounded-full bg-white shadow-[0_6px_30px_rgba(60,40,20,.12)] transition hover:scale-[1.03]" aria-label="소리 듣기"><Volume2 className="size-1/2 text-[#7a2f1f]" /></button>
        <div className={cn("flex flex-col items-center gap-3 transition-opacity", revealed ? "opacity-100" : "opacity-0")} aria-hidden={!revealed}>
          <p className="text-[clamp(3.5rem,11vw,8rem)] font-extrabold leading-none tracking-tight">{card.marked}</p>
          <div className="flex items-center gap-5">
            <span lang="zh-CN" className="font-zh text-[clamp(2.5rem,7vw,5rem)] leading-none">{card.char}</span>
            <ToneContour tone={card.tone} className="h-[clamp(4rem,10vh,6rem)] w-auto text-[#1f1a14]" />
            <span className="text-[clamp(1.3rem,2.6vw,2.2rem)] font-extrabold text-[#7a2f1f]">{toneInfo[card.tone].name}</span>
          </div>
        </div>
      </div>
      <button type="button" onClick={() => move(-1)} disabled={index === 0} className={cn(control, "fixed left-3 top-1/2 -translate-y-1/2")} aria-label="이전"><ChevronLeft size={22} /></button>
      <button type="button" onClick={() => move(1)} disabled={index >= last} className={cn(control, "fixed right-3 top-1/2 -translate-y-1/2")} aria-label="다음"><ChevronRight size={22} /></button>
      <p className="pb-2 text-center text-[.7rem] text-[#6d6252]/70">S 다시 듣기 · Space 답 보기 · ← → 넘기기(넘기면 바로 들려줘요) · F 전체 화면 · Esc 닫기</p>
    </div>
  );
}
