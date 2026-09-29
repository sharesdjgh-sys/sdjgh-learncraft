"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Maximize2, Shuffle, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { conjugate, dictionaryForm, formLabel, groupLabels, kindLabels, type ConjEntry, type ConjForm } from "@/features/japanese/conjugation";
import { RubyText } from "./japanese-ruby";

type Card = { entry: ConjEntry; form: string };
const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let position = next.length - 1; position > 0; position -= 1) {
    const other = Math.floor(Math.random() * (position + 1));
    [next[position], next[other]] = [next[other], next[position]];
  }
  return next;
};

/** 낱말과 활용을 무작위로 띄우고, 학생이 답한 뒤 활용한 모양을 보여 줍니다. */
export function JapaneseVerbShow({ entries, forms, speak, onClose }: { entries: ConjEntry[]; forms: string[]; speak: (text: string) => void; onClose: () => void }) {
  const [deck, setDeck] = useState<Card[]>(() => shuffle(entries.flatMap(entry => forms.filter(form => conjugate(entry, form as ConjForm)).map(form => ({ entry, form })))));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const last = deck.length - 1;
  const card = deck[index];
  const answer = card ? conjugate(card.entry, card.form as ConjForm) : null;
  const fullscreen = () => void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen().catch(() => undefined));
  const move = (step: number) => {
    setIndex(value => Math.max(0, Math.min(last, value + step)));
    setRevealed(false);
  };
  const reveal = () => {
    if (!revealed && answer) speak(answer.reading);
    setRevealed(!revealed);
  };
  const handlers = useRef({ move, reveal });
  useEffect(() => { handlers.current = { move, reveal }; });

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
      else if (["ArrowRight", "PageDown"].includes(event.key)) { event.preventDefault(); handlers.current.move(1); }
      else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); handlers.current.move(-1); }
      else if ([" ", "Enter"].includes(event.key)) { event.preventDefault(); handlers.current.reveal(); }
      else if (event.key.toLowerCase() === "f") void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen().catch(() => undefined));
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
  if (!card || !answer) return null;
  const base = dictionaryForm(card.entry);
  const { label, hint } = formLabel(card.entry.kind, card.form);
  return (
    <div ref={stage} role="dialog" aria-modal="true" aria-label="활용 퀴즈" className="fixed inset-0 z-[80] flex flex-col bg-[#fbf7ee] text-[#1f1a14]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="text-[.82rem] font-semibold tabular-nums text-[#6d6252]">{index + 1} / {deck.length}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={reveal} className={cn(pill, revealed && "bg-[#7a2f1f] text-white hover:bg-[#7a2f1f]")} title="답 보이기·가리기 (Space)">{revealed ? <EyeOff size={15} /> : <Eye size={15} />} {revealed ? "답 가리기" : "답 보기"}</button>
          <button type="button" onClick={() => speak(revealed ? answer.reading : base.reading)} className={pill} title="소리 듣기"><Volume2 size={15} /> 소리</button>
          <button type="button" onClick={() => { setDeck(current => shuffle(current)); setIndex(0); setRevealed(false); }} className={pill} title="순서 섞기"><Shuffle size={15} /> 섞기</button>
          <button type="button" onClick={fullscreen} className={control} aria-label="전체 화면 (F)"><Maximize2 size={17} /></button>
          <button type="button" onClick={onClose} className={control} aria-label="닫기 (Esc)"><X size={18} /></button>
        </div>
      </div>
      <button type="button" onClick={reveal} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-20 pb-6" aria-label={revealed ? "답 가리기" : "답 보기"}>
        <span className="text-[clamp(1rem,1.6vw,1.4rem)] font-bold text-[#6d6252]">{kindLabels[card.entry.kind]}{card.entry.group ? ` · ${groupLabels[card.entry.group]}` : ""} · {card.entry.meaning}</span>
        <RubyText value={base} className="text-[clamp(3.5rem,11vw,8rem)] leading-[1.6] [&_rt]:text-[.3em]" />
        <span className="rounded-full bg-[#7a2f1f] px-6 py-2 text-[clamp(1.4rem,3vw,2.6rem)] font-extrabold text-white"><span lang="ja" className="font-ja">{label}</span> <span className="text-[.6em] font-bold opacity-80">{hint}</span></span>
        <span className={cn("flex min-h-[8rem] flex-col items-center transition-opacity", revealed ? "opacity-100" : "opacity-0")} aria-hidden={!revealed}>
          <RubyText value={answer} base={base} className="text-[clamp(3rem,9vw,7rem)] leading-[1.6] [&_rt]:text-[.3em]" />
          {card.entry.note && <span className="text-[clamp(.9rem,1.3vw,1.15rem)] text-[#6d6252]">{card.entry.note}</span>}
        </span>
      </button>
      <button type="button" onClick={() => move(-1)} disabled={index === 0} className={cn(control, "fixed left-3 top-1/2 -translate-y-1/2")} aria-label="이전 문제"><ChevronLeft size={22} /></button>
      <button type="button" onClick={() => move(1)} disabled={index >= last} className={cn(control, "fixed right-3 top-1/2 -translate-y-1/2")} aria-label="다음 문제"><ChevronRight size={22} /></button>
      <p className="pb-2 text-center text-[.7rem] text-[#6d6252]/70">Space 답 보기 · ← → 넘기기 · F 전체 화면 · Esc 닫기</p>
    </div>
  );
}
