"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Maximize2, PenLine, Shuffle, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { scriptLabels, strokeCount, type KanaItem } from "@/features/japanese/kana";
import { StrokeOrder } from "./japanese-strokes";

/** 수업 중 가나를 한 글자씩 크게 띄우고, 학생이 읽은 뒤 발음·획순을 보여 줍니다. */
export function KanaFlash({ items, speak, onClose }: { items: KanaItem[]; speak: (text: string) => void; onClose: () => void }) {
  const [order, setOrder] = useState(() => items.map((_, index) => index));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [strokes, setStrokes] = useState(false);
  const [play, setPlay] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const last = items.length - 1;
  const item = items[order[index]];
  const fullscreen = () => void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen().catch(() => undefined));
  const move = (step: number) => {
    setIndex(value => Math.max(0, Math.min(last, value + step)));
    setRevealed(false);
  };
  const reveal = () => {
    if (!revealed && autoSpeak && item) speak(item.char);
    setRevealed(!revealed);
  };
  const drawStrokes = () => {
    setStrokes(true);
    setPlay(value => value + 1);
  };
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

  // 키보드 조작은 최신 상태를 쓰도록 ref로 넘깁니다.
  const handlers = useRef({ reveal, move, drawStrokes, say: () => item && speak(item.char) });
  useEffect(() => { handlers.current = { reveal, move, drawStrokes, say: () => item && speak(item.char) }; });

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
      else if (["ArrowRight", "PageDown"].includes(event.key)) { event.preventDefault(); handlers.current.move(1); }
      else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); handlers.current.move(-1); }
      else if ([" ", "Enter"].includes(event.key)) { event.preventDefault(); handlers.current.reveal(); }
      else if (key === "s") handlers.current.say();
      else if (key === "g") handlers.current.drawStrokes();
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
  if (!item) return null;
  const count = strokeCount(item.char);
  return (
    <div ref={stage} role="dialog" aria-modal="true" aria-label="가나 플래시 카드" className="fixed inset-0 z-[80] flex flex-col bg-[#fbf7ee] text-[#1f1a14]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="text-[.82rem] font-semibold tabular-nums text-[#6d6252]">{index + 1} / {items.length} · {scriptLabels[item.script]}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={reveal} className={cn(pill, revealed && "bg-[#7a2f1f] text-white hover:bg-[#7a2f1f]")} title="발음 보이기·가리기 (Space)">{revealed ? <EyeOff size={15} /> : <Eye size={15} />} {revealed ? "발음 가리기" : "발음 보기"}</button>
          <button type="button" onClick={() => speak(item.char)} className={pill} title="소리 듣기 (S)"><Volume2 size={15} /> 소리</button>
          <button type="button" onClick={drawStrokes} disabled={!count} className={cn(pill, "disabled:opacity-30")} title="획순 그리기 (G)"><PenLine size={15} /> 획순</button>
          <button type="button" aria-pressed={autoSpeak} onClick={() => setAutoSpeak(value => !value)} className={cn(pill, autoSpeak && "bg-[#3b3226] text-white hover:bg-[#3b3226]")} title="발음을 보일 때 소리도 들려줘요">자동 소리</button>
          <button type="button" onClick={shuffle} className={pill} title="순서 섞기"><Shuffle size={15} /> 섞기</button>
          <button type="button" onClick={fullscreen} className={control} aria-label="전체 화면 (F)"><Maximize2 size={17} /></button>
          <button type="button" onClick={onClose} className={control} aria-label="닫기 (Esc)"><X size={18} /></button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-20 pb-6 lg:flex-row lg:gap-16">
        <button type="button" onClick={reveal} className="font-ja leading-none" aria-label={revealed ? "발음 가리기" : "발음 보기"} lang="ja">
          <span className={cn("block", [...item.char].length > 1 ? "text-[clamp(6rem,26vh,15rem)]" : "text-[clamp(8rem,34vh,20rem)]")}>{item.char}</span>
        </button>
        {strokes && count ? (
          <div className="flex flex-col items-center gap-2">
            <StrokeOrder char={item.char} play={play} className="size-[clamp(9rem,30vh,17rem)] text-[#1f1a14]" />
            <button type="button" onClick={drawStrokes} className="text-[.8rem] font-bold text-[#6d6252] hover:text-[#1f1a14]">{count}획 · 다시 그리기</button>
          </div>
        ) : null}
      </div>
      <div className={cn("flex min-h-[7.5rem] flex-col items-center gap-2 px-6 pb-4 text-center transition-opacity", revealed ? "opacity-100" : "opacity-0")} aria-hidden={!revealed}>
        <p className="text-[clamp(2rem,5vw,4rem)] font-extrabold tracking-[-0.02em]">{item.romaji} <span className="text-[#8a5a3c]">· {item.korean}</span></p>
        <p className="text-[clamp(.95rem,1.5vw,1.3rem)] font-semibold text-[#6d6252]">
          <span lang="ja" className="font-ja text-[1.3em]">{item.pair}</span> ({scriptLabels[item.script === "hira" ? "kata" : "hira"]}){count ? ` · ${count}획` : ""}
        </p>
        {item.tip && <p className="max-w-3xl break-keep text-[clamp(.9rem,1.3vw,1.15rem)] text-[#3b3226]">{item.tip}</p>}
      </div>
      <button type="button" onClick={() => move(-1)} disabled={index === 0} className={cn(control, "fixed left-3 top-1/2 -translate-y-1/2")} aria-label="이전 글자"><ChevronLeft size={22} /></button>
      <button type="button" onClick={() => move(1)} disabled={index >= last} className={cn(control, "fixed right-3 top-1/2 -translate-y-1/2")} aria-label="다음 글자"><ChevronRight size={22} /></button>
      <p className="pb-2 text-center text-[.7rem] text-[#6d6252]/70">Space 발음 보기 · S 소리 · G 획순 · ← → 넘기기 · F 전체 화면 · Esc 닫기</p>
    </div>
  );
}
