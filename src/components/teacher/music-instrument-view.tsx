"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Eye, EyeOff, Headphones, Lightbulb, LoaderCircle, Maximize2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CommonsImage } from "@/lib/commons-media";
import { familyGuides, initialConsonants, instruments, nameChoices, noteLabel, noteToMidi, PIANO_HIGH, PIANO_LOW, quizPieces, rangePercent, type Instrument, type QuizPiece } from "@/features/teacher-activities/music-instruments";

/* 악기 소개 목록과 수업용 크게 보기 팝업이 함께 쓰는 조각입니다. */

export function InstrumentImage({ item, image, className, large = false }: { item: Instrument; image: CommonsImage | null | undefined; className?: string; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const box = cn("flex items-center justify-center bg-[#f4f1ec]", className);
  if (image === undefined && !failed) return <span className={cn(box, "text-ink-4")}><LoaderCircle size={20} className="animate-spin" aria-label="사진을 불러오는 중" /></span>;
  if (!image || failed) return <span className={cn(box, "flex-col gap-1 text-[.76rem] font-semibold text-ink-4")}><AlertCircle size={18} aria-hidden="true" />사진을 불러오지 못했어요</span>;
  return <span className={box}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={image.imageUrl} alt={item.name} width={image.width} height={image.height} loading={large ? "eager" : "lazy"} referrerPolicy="no-referrer" onError={() => setFailed(true)} className={cn("h-full w-full object-contain", large ? "p-3" : "p-2")} />
  </span>;
}

export function ImageCredit({ image, className }: { image: CommonsImage; className?: string }) {
  return <p className={cn("break-words text-[.7rem] leading-5 text-ink-4", className)}>사진: {image.artist.slice(0, 120)} · <a href={image.sourceUrl} target="_blank" rel="noreferrer" className="underline">Wikimedia Commons</a> · {image.licenseUrl ? <a href={image.licenseUrl} target="_blank" rel="noreferrer" className="underline">{image.license}</a> : image.license}</p>;
}

export const octaveMarks = [1, 2, 3, 4, 5, 6, 7, 8].map(octave => ({ label: `C${octave}`, left: (noteToMidi(`C${octave}`) - PIANO_LOW) / (PIANO_HIGH - PIANO_LOW) * 100 }));
export function RangeBar({ range, active = true, className }: { range: { low: string; high: string }; active?: boolean; className?: string }) {
  const { left, width } = rangePercent(range);
  return <div className={cn("relative h-3 rounded-full bg-surface-2 ring-1 ring-line", className)} role="img" aria-label={`음역 ${noteLabel(range.low)}부터 ${noteLabel(range.high)}까지`}>
    {octaveMarks.map(mark => <span key={mark.label} className="absolute inset-y-0 w-px bg-line" style={{ left: `${mark.left}%` }} aria-hidden="true" />)}
    <span className={cn("absolute inset-y-0 rounded-full", active ? "bg-brand" : "bg-brand/40")} style={{ left: `${left}%`, width: `${width}%` }} />
  </div>;
}
export function OctaveAxis({ className }: { className?: string }) {
  return <div className={cn("relative h-4 text-[.66rem] font-bold text-ink-4", className)} aria-hidden="true">{octaveMarks.map(mark => <span key={mark.label} className={cn("absolute", mark.left > 97 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: `${mark.left}%` }}>{mark.label}</span>)}</div>;
}

const textSizes = [{ value: 16, label: "보통" }, { value: 20, label: "크게" }, { value: 25, label: "아주 크게" }] as const;

/** 수업 화면에 띄워 악기 하나를 크게 살펴봅니다. 맞히기 모드에서는 이름과 설명을 가려 두었다가 하나씩 엽니다. */
export function InstrumentStudyDialog({ item, items, image, added, full, onToggle, onMove, onClose }: {
  item: Instrument; items: Instrument[]; image: (file: string) => CommonsImage | null | undefined;
  added: boolean; full: boolean; onToggle: () => void; onMove: (id: string) => void; onClose: () => void;
}) {
  const [size, setSize] = useState<number>(20);
  const [quiz, setQuiz] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const index = items.findIndex(other => other.id === item.id);
  const previous = index > 0 ? items[index - 1] : undefined;
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : undefined;
  const toggleFullscreen = useCallback(() => { void (document.fullscreenElement ? document.exitFullscreen() : stage.current?.requestFullscreen())?.catch(() => {}); }, []);

  useEffect(() => { closeButton.current?.focus(); }, []);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) onClose();
      else if (event.key === "ArrowRight" && next) { event.preventDefault(); onMove(next.id); }
      else if (event.key === "ArrowLeft" && previous) { event.preventDefault(); onMove(previous.id); }
      else if (event.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", onKey); };
  }, [next, previous, onMove, onClose, toggleFullscreen]);
  useEffect(() => () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); }, []);

  const control = "grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink-2 hover:border-brand/30 hover:text-brand-dark disabled:opacity-30";
  return <div role="dialog" aria-modal="true" aria-label={`${quiz ? "악기" : item.name} 크게 보기`} className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#17151f]/70 p-2 backdrop-blur-sm sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={stage} className="relative w-full max-w-[1440px] overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_30px_90px_rgba(20,16,40,.35)] [&:fullscreen]:max-w-none [&:fullscreen]:overflow-y-auto [&:fullscreen]:rounded-none">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-line bg-surface/95 px-3 py-2.5 backdrop-blur sm:px-5">
        <button type="button" className={control} onClick={() => previous && onMove(previous.id)} disabled={!previous} aria-label="이전 악기" title="이전 악기 (←)"><ChevronLeft size={18} /></button>
        <p className="min-w-12 text-center text-[.8rem] font-bold tabular-nums text-ink-3">{index + 1} / {items.length}</p>
        <button type="button" className={control} onClick={() => next && onMove(next.id)} disabled={!next} aria-label="다음 악기" title="다음 악기 (→)"><ChevronRight size={18} /></button>
        <div role="group" aria-label="글자 크기" className="ml-1 flex gap-1 rounded-xl border border-line bg-surface-2 p-1">{textSizes.map(option => <button key={option.value} type="button" aria-pressed={size === option.value} onClick={() => setSize(option.value)} className={cn("min-h-8 rounded-lg px-2.5 text-xs font-bold", size === option.value ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>{option.label}</button>)}</div>
        <Button variant={quiz ? "primary" : "secondary"} size="sm" onClick={() => setQuiz(value => !value)} aria-pressed={quiz} title="이름과 설명을 가려 두고 학생과 함께 하나씩 열어 봅니다.">{quiz ? <EyeOff size={15} /> : <Eye size={15} />} 맞히기 모드</Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant={added ? "secondary" : "ghost"} size="sm" onClick={onToggle} disabled={!added && full}>{added ? <><Check size={15} /> 활동지에 담음</> : <><Plus size={15} /> 활동지에 담기</>}</Button>
          <Button variant="secondary" size="sm" onClick={toggleFullscreen} title="전체 화면 (F)"><Maximize2 size={15} /> 전체 화면</Button>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="닫기" className={control}><X size={18} /></button>
        </div>
      </div>
      <Study key={`${item.id}:${quiz}`} item={item} image={image} quiz={quiz} size={size} onMove={onMove} />
    </div>
  </div>;
}

function Study({ item, image, quiz, size, onMove }: { item: Instrument; image: (file: string) => CommonsImage | null | undefined; quiz: boolean; size: number; onMove: (id: string) => void }) {
  // 맞히기 모드의 진행 상태입니다. 악기를 바꾸거나 모드를 바꾸면 처음부터 다시 시작합니다.
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<string[]>([]);
  const [hint, setHint] = useState(false);
  const [opened, setOpened] = useState<string[]>([]);
  const [openAll, setOpenAll] = useState(false);
  const named = !quiz || solved;
  const photo = image(item.file);
  const family = instruments.filter(other => other.family === item.family);
  const ranged = family.filter(other => other.range).sort((a, b) => noteToMidi(a.range!.low) - noteToMidi(b.range!.low));
  const label = (other: Instrument) => other.id === item.id && !named ? "?" : other.name;
  // 빈칸이 있는 글. 같은 칸을 가리키도록 칸마다 key를 붙입니다.
  const text = (key: string, value: string, limit = 3) => quiz
    ? <QuizText pieces={quizPieces(value, item, limit)} name={item.name} named={named} isOpen={index => openAll || opened.includes(`${key}:${index}`)} onOpen={index => setOpened(list => [...list, `${key}:${index}`])} />
    : value;
  const choose = (choice: Instrument) => { if (choice.id === item.id) setSolved(true); else setWrong(list => [...list, choice.id]); };

  return <div style={{ fontSize: size }} className="text-ink-2">
    <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="border-b border-line bg-[#f4f1ec] lg:border-b-0 lg:border-r">
        <InstrumentImage item={item} image={photo} className="h-[42vh] lg:h-[min(68vh,720px)]" large />
        {photo && <ImageCredit image={photo} className="bg-surface px-5 py-2" />}
      </div>
      <div className="space-y-[.9em] p-5 sm:p-7">
        <header>
          <p className="text-[.7em] font-bold text-brand-dark">{item.family}{named && ` · ${item.kind}`}</p>
          {named
            ? <h2 className="mt-1 break-keep text-[2em] font-extrabold leading-tight tracking-[-0.03em] text-ink">{item.name} <span className="text-[.5em] font-semibold text-ink-4">{item.english}</span>{quiz && <span className="ml-2 inline-flex items-center gap-1 align-middle text-[.4em] font-bold text-[#1f7a4d]"><Check className="size-[1.1em]" aria-hidden="true" /> 정답!</span>}</h2>
            : <div className="mt-2 rounded-2xl border border-dashed border-brand/40 bg-brand-page p-[.9em]">
              <p className="break-keep text-[1.15em] font-extrabold text-brand-dark">이 악기의 이름은 무엇일까요?</p>
              <p className="mt-[.2em] text-[.72em] text-ink-3">아래 설명의 빈칸을 먼저 추리해 보면 실마리가 보여요.</p>
              <div className="mt-[.6em] grid grid-cols-2 gap-[.4em]">{nameChoices(item).map(choice => <button key={choice.id} type="button" onClick={() => choose(choice)} disabled={wrong.includes(choice.id)} className={cn("min-h-[2.4em] rounded-xl border px-[.6em] text-[.9em] font-bold", wrong.includes(choice.id) ? "border-danger/25 bg-[var(--danger-page)] text-danger line-through" : "border-line bg-surface text-ink hover:border-brand hover:text-brand-dark")}>{choice.name}</button>)}</div>
              <div className="mt-[.6em] flex flex-wrap items-center gap-[.5em] text-[.75em]">
                {wrong.length > 0 && <p role="status" className="font-bold text-danger">다시 생각해 봐요!</p>}
                <button type="button" onClick={() => setHint(true)} className="rounded-lg border border-line bg-surface px-[.6em] py-[.2em] font-bold text-ink-2 hover:text-brand-dark">{hint ? <>초성 힌트: <span className="tracking-[.15em] text-brand-dark">{initialConsonants(item.name)}</span></> : "초성 힌트"}</button>
                <button type="button" onClick={() => setSolved(true)} className="px-[.3em] font-semibold text-ink-4 underline hover:text-brand-dark">정답 보기</button>
              </div>
            </div>}
        </header>
        {quiz && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-[.8em] py-[.5em] text-[.72em] text-ink-3"><span>점선 칸의 초성을 보고 낱말을 추리한 뒤 눌러서 확인해요.</span><button type="button" onClick={() => setOpenAll(true)} disabled={openAll} className="font-bold text-brand-dark underline disabled:opacity-40">빈칸 모두 열기</button></div>}
        <Block title="소개"><p>{text("summary", item.summary)}</p></Block>
        <Block title="소리 내는 방법"><p>{text("sound", item.sound)}</p></Block>
        <Block title="특징"><ul className="list-disc space-y-[.3em] pl-[1.2em]">{item.features.map((feature, index) => <li key={feature}>{text(`feature${index}`, feature)}</li>)}</ul></Block>
      </div>
    </div>

    <div className="grid gap-5 border-t border-line bg-surface-2 p-5 sm:p-7 lg:grid-cols-2">
      <Block title={quiz && !named ? `음역 · ${item.family} 비교 · ‘?’는 어느 악기일까요?` : `음역 · ${item.family} 비교`} card>
        {ranged.length ? <div className="space-y-[.35em]">
          <div className="grid grid-cols-[6.5em_minmax(0,1fr)] gap-x-3"><span /><OctaveAxis className="text-[.6em]" /></div>
          {ranged.map(other => <button key={other.id} type="button" onClick={() => onMove(other.id)} className={cn("grid w-full grid-cols-[6.5em_minmax(0,1fr)] items-center gap-x-3 rounded-lg px-1 py-[.2em] text-left", other.id === item.id ? "bg-brand-page" : "hover:bg-surface")}>
            <span className={cn("truncate text-[.75em] font-bold", other.id === item.id ? "text-brand-dark" : "text-ink-3")}>{label(other)}</span>
            <RangeBar range={other.range!} active={other.id === item.id} className="h-[.7em]" />
          </button>)}
          <p className="pt-1 text-[.7em] text-ink-3">{item.range ? <><b className="text-ink-2">{label(item)}</b> {noteLabel(item.range.low)} ~ {noteLabel(item.range.high)} (실음){item.rangeNote && ` · ${item.rangeNote}`} · 가운데 도는 C4</> : item.rangeNote ?? "일정한 음높이가 없는 타악기예요."}</p>
        </div> : <p className="text-[.8em] text-ink-3">{item.rangeNote ?? "일정한 음높이가 없는 타악기예요."}</p>}
      </Block>
      <Block title="함께 들어 볼 곡" card>
        <ul className="space-y-[.7em]">{item.works.map((work, index) => <li key={work.title} className="flex gap-[.6em]"><Headphones className="mt-[.25em] size-[1em] shrink-0 text-brand" aria-hidden="true" /><div><p className="font-bold text-ink">{work.composer} {text(`work${index}`, work.title, 0)}</p><p className="text-[.82em] text-ink-3">{text(`workNote${index}`, work.note)}</p></div></li>)}</ul>
      </Block>
      <div className="rounded-2xl border border-line bg-surface p-[1em] lg:col-span-2">
        <p className="flex gap-[.5em] break-keep leading-[1.7]"><Lightbulb className="mt-[.3em] size-[1em] shrink-0 text-brand" aria-hidden="true" /><span><b className="text-brand-dark">수업 포인트</b> {text("tip", item.tip, 0)}</span></p>
        <p className="mt-[.6em] break-keep text-[.8em] leading-[1.7] text-ink-3"><b className="text-ink-2">{item.family}</b> · {familyGuides[item.family]}</p>
      </div>
      <div className="lg:col-span-2">
        <p className="mb-[.4em] text-[.7em] font-bold text-ink-3">같은 악기군의 다른 악기</p>
        <div className="flex flex-wrap gap-[.4em]">{family.map(other => <button key={other.id} type="button" onClick={() => onMove(other.id)} aria-current={other.id === item.id ? "true" : undefined} className={cn("min-h-9 rounded-full border px-[.9em] text-[.75em] font-bold", other.id === item.id ? "border-brand bg-brand-page text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:text-brand-dark")}>{label(other)}</button>)}</div>
      </div>
    </div>
  </div>;
}

function Block({ title, card = false, children }: { title: string; card?: boolean; children: React.ReactNode }) {
  return <section className={cn(card && "rounded-2xl border border-line bg-surface p-[1em]")}>
    <h3 className="mb-[.35em] text-[.72em] font-extrabold text-ink-3">{title}</h3>
    <div className="break-keep leading-[1.75]">{children}</div>
  </section>;
}

/** 초성 빈칸은 누르면 낱말이 드러나고, 악기 이름은 정답을 맞힐 때까지 〇〇로 가립니다. */
function QuizText({ pieces, name, named, isOpen, onOpen }: { pieces: QuizPiece[]; name: string; named: boolean; isOpen: (index: number) => boolean; onOpen: (index: number) => void }) {
  return <>{pieces.map((piece, index) => {
    if ("text" in piece) return <span key={index}>{piece.text}</span>;
    if ("name" in piece) return named ? <b key={index} className="text-brand-dark">{name}</b> : <span key={index} className="font-bold tracking-[.1em] text-ink-4" aria-label="가려진 악기 이름">〇〇</span>;
    return isOpen(index)
      ? <b key={index} className="rounded bg-[#e6f4ec] px-[.2em] text-[#1f7a4d]">{piece.answer}</b>
      : <button key={index} type="button" onClick={() => onOpen(index)} aria-label={`빈칸, 초성 ${piece.hint}. 눌러서 확인`} className="mx-[.1em] inline-flex min-w-[2.2em] justify-center rounded-md border border-dashed border-brand/50 bg-brand-page px-[.35em] align-baseline font-bold tracking-[.12em] text-brand-dark hover:border-brand">{piece.hint}</button>;
  })}</>;
}
