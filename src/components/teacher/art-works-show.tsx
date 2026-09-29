"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { appreciationSteps } from "@/lib/art-works/explanation";
import { ArtImage, latestWorkExplanation, useArtImages, type ArtItem } from "./art-works-shared";

/** 수업 자료함의 작품을 한 점씩, 또는 두 점씩 나란히 크게 보여 줍니다. */
export function ArtSlideshow({ items, pair, start = 0, onClose }: { items: ArtItem[]; pair: boolean; start?: number; onClose: () => void }) {
  const [index, setIndex] = useState(Math.min(start, Math.max(0, items.length - (pair ? 2 : 1))));
  const [caption, setCaption] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const getImage = useArtImages(items.map(item => item.file));
  const last = Math.max(0, items.length - (pair ? 2 : 1));
  const shown = items.slice(index, index + (pair ? 2 : 1));

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
      else if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); setIndex(value => Math.min(last, value + 1)); }
      else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); setIndex(value => Math.max(0, value - 1)); }
      else if (event.key.toLowerCase() === "c") setCaption(value => !value);
      else if (event.key.toLowerCase() === "f") void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen());
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, [last, onClose]);

  const control = "grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-25";
  return (
    <div ref={stage} role="dialog" aria-modal="true" aria-label="작품 슬라이드" className="fixed inset-0 z-[80] flex flex-col bg-[#101014] text-white">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <p className="text-[.8rem] font-semibold tabular-nums text-white/60">{pair ? `${index + 1}–${index + shown.length}` : index + 1} / {items.length}{pair && " · 비교 보기"}</p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setCaption(value => !value)} className="flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[.78rem] font-bold hover:bg-white/20" title="작품 정보 가리기·보이기 (C)">{caption ? <EyeOff size={15} /> : <Eye size={15} />} {caption ? "정보 가리기" : "정보 보이기"}</button>
          <button type="button" onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen())} className={control} aria-label="전체 화면 (F)"><Maximize2 size={17} /></button>
          <button type="button" onClick={onClose} className={control} aria-label="닫기 (Esc)"><X size={18} /></button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-stretch gap-4 px-4 pb-4 sm:px-16">
        {shown.map(item => {
          const image = getImage(item.file);
          return (
            <figure key={item.key} className="flex min-w-0 flex-1 flex-col">
              <ArtImage item={item} image={image} sizes="large" className="min-h-0 flex-1 bg-transparent text-white/70" />
              <figcaption className={cn("mt-3 text-center transition-opacity", caption ? "opacity-100" : "opacity-0")} aria-hidden={!caption}>
                <p className="break-keep text-[clamp(1.1rem,2.2vw,2rem)] font-extrabold tracking-[-0.02em]">{item.title}</p>
                <p className="mt-1 text-[clamp(.85rem,1.3vw,1.2rem)] font-semibold text-white/70">{item.artist}{item.year && ` · ${item.year}`}</p>
                {image && <p className="mt-1 text-[.7rem] text-white/35">{image.license} · Wikimedia Commons</p>}
              </figcaption>
            </figure>
          );
        })}
        <button type="button" onClick={() => setIndex(value => Math.max(0, value - 1))} disabled={index === 0} className={cn(control, "absolute left-3 top-1/2 -translate-y-1/2")} aria-label="이전 작품"><ChevronLeft size={22} /></button>
        <button type="button" onClick={() => setIndex(value => Math.min(last, value + 1))} disabled={index >= last} className={cn(control, "absolute right-3 top-1/2 -translate-y-1/2")} aria-label="다음 작품"><ChevronRight size={22} /></button>
      </div>
    </div>
  );
}

/** 인쇄할 때만 나타나는 작품 감상 활동지(작품마다 A4 한 장) */
export function ArtWorksheet({ items, title }: { items: ArtItem[]; title: string }) {
  const getImage = useArtImages(items.map(item => item.file));
  return (
    <div id="art-sheet-print" className="hidden print:block">
      <style>{`@media print{body *:not(:has(#art-sheet-print)):not(#art-sheet-print):not(#art-sheet-print *){display:none!important}body *:has(#art-sheet-print),#art-sheet-print{display:block!important;position:static!important;height:auto!important;max-height:none!important;overflow:visible!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;max-width:none!important;background:#fff!important}.art-sheet-page{break-after:page}.art-sheet-page:last-child{break-after:auto}@page{size:A4;margin:14mm}}`}</style>
      {items.map((item, index) => {
        const image = getImage(item.file);
        const explanation = latestWorkExplanation(item.key);
        return (
          <section key={item.key} className="art-sheet-page text-[10.5pt] leading-[1.55] text-black">
            <header className="flex items-end justify-between border-b-2 border-black pb-1.5">
              <p className="text-[15pt] font-extrabold">{title || "작품 감상 활동지"} <span className="text-[10pt] font-semibold text-neutral-500">{index + 1}/{items.length}</span></p>
              <p className="text-[9.5pt]">&nbsp;학년 &nbsp;&nbsp;&nbsp;반 &nbsp;&nbsp;&nbsp;번 &nbsp;이름 ________________</p>
            </header>
            <div className="mt-3 flex h-[95mm] items-center justify-center">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.imageUrl} alt={item.title} referrerPolicy="no-referrer" className="max-h-full max-w-full object-contain" />
              ) : <ArtImage item={item} image={image} className="h-full w-full" />}
            </div>
            <p className="mt-2 text-center text-[12pt] font-bold">{item.title}</p>
            <p className="text-center text-[9.5pt]">{item.artist}{item.year && ` · ${item.year}`}</p>
            {image && <p className="text-center text-[7.5pt] text-neutral-500">이미지 출처: {image.artist.slice(0, 120)} / Wikimedia Commons / {image.license}</p>}
            <ol className="mt-3 space-y-2.5">
              {appreciationSteps.map((step, stepIndex) => (
                <li key={step.key}>
                  <p className="font-bold">{stepIndex + 1}. {step.label} — <span className="font-semibold">{explanation?.appreciation[step.key].question ?? step.fallback}</span></p>
                  {[0, 1, 2].map(line => <div key={line} className="h-[6.5mm] border-b border-neutral-400" />)}
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
