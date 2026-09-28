"use client";

import { useCallback, useState } from "react";
import { Check, ExternalLink, Lightbulb, Maximize2, Plus, Search, Waves, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CommonsImage } from "@/lib/commons-media";
import { defaultInstrumentSheet, familyGuides, findInstrument, instrumentFamilies, instruments, instrumentSheetHtml, instrumentSheetSchema, noteLabel, noteToMidi, type Instrument, type InstrumentFamily } from "@/features/teacher-activities/music-instruments";
import { useArtImages } from "./art-works-shared";
import { ImageCredit, InstrumentImage, InstrumentStudyDialog, OctaveAxis, RangeBar } from "./music-instrument-view";
import { activityField, ActivityInput, ActivityLayout, ActivityReady, ActivitySheet, useActivityDraft } from "./activity-shared";
import { Card, Segmented, Toggle } from "./tool-panel";

const MAX_SHEET = 12;
const allFiles = instruments.map(item => item.file);
const credit = (image: CommonsImage) => `사진: ${image.artist.slice(0, 80)} / Wikimedia Commons / ${image.license}`;

export function MusicInstrumentsLab({ tabs }: { tabs: React.ReactNode }) { return <ActivityReady><Explorer tabs={tabs} /></ActivityReady>; }

function Explorer({ tabs }: { tabs: React.ReactNode }) {
  const [family, setFamily] = useState<InstrumentFamily | "all">("all");
  const [query, setQuery] = useState("");
  const [currentId, setCurrentId] = useState("violin");
  const [studying, setStudying] = useState(false);
  const [sheet, setSheet, error] = useActivityDraft("learncraft_music_instruments_v1", instrumentSheetSchema, defaultInstrumentSheet);
  const image = useArtImages(allFiles);
  const word = query.trim().toLowerCase();
  const shown = instruments.filter(item => (family === "all" || item.family === family) && (!word || [item.name, item.english, item.kind].some(text => text.toLowerCase().includes(word))));
  const current = findInstrument(currentId) ?? instruments[0];
  // 다른 악기군을 고르면 그 악기군의 첫 악기를 보여 줍니다.
  const pickFamily = (next: InstrumentFamily | "all") => {
    setFamily(next);
    if (next !== "all" && current.family !== next) setCurrentId(instruments.find(item => item.family === next)!.id);
  };
  const inSheet = (id: string) => sheet.selected.includes(id);
  const toggleSheet = (id: string) => setSheet({ ...sheet, selected: inSheet(id) ? sheet.selected.filter(other => other !== id) : [...sheet.selected, id].slice(0, MAX_SHEET) });
  const closeStudy = useCallback(() => setStudying(false), []);
  const html = instrumentSheetHtml(sheet, item => { const found = image(item.file); return found ? { url: found.imageUrl, credit: credit(found) } : null; });

  return <ActivityLayout subject="음악" title="악기 소개" description="관현악 악기와 국악기의 생김새, 소리 내는 방법, 음역, 감상곡을 한눈에 살펴보고 소개 카드나 탐구 활동지로 인쇄하세요." tabs={tabs} error={error}>
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1"><Segmented label="악기군" value={family} onChange={pickFamily} options={[{ value: "all", label: "전체" }, ...instrumentFamilies.map(value => ({ value, label: value }))]} /></div>
      <label className="relative block w-full sm:w-64"><span className="sr-only">악기 찾기</span><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="악기 이름 찾기" className={cn(activityField, "pl-9")} /></label>
    </div>
    {family !== "all" && <p className="break-keep rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm leading-6 text-ink-2"><b className="text-brand-dark">{family}</b> · {familyGuides[family]}</p>}

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="min-w-0">
        {shown.length ? <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map(item => <li key={item.id}>
            <button type="button" onClick={() => setCurrentId(item.id)} aria-pressed={item.id === current.id} className={cn("group w-full overflow-hidden rounded-[18px] border bg-surface text-left shadow-[var(--lift-1)] transition-colors", item.id === current.id ? "border-brand ring-2 ring-brand/20" : "border-line hover:border-brand/40")}>
              <InstrumentImage item={item} image={image(item.file)} className="aspect-[4/3]" />
              <span className="block px-3 py-2.5">
                <span className="flex items-center justify-between gap-2"><span className="font-extrabold text-ink">{item.name}</span>{inSheet(item.id) && <Check size={14} className="shrink-0 text-brand" aria-label="활동지에 담김" />}</span>
                <span className="mt-0.5 block truncate text-[.74rem] text-ink-4">{item.english} · {item.kind}</span>
              </span>
            </button>
          </li>)}
        </ul> : <p className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-3">찾는 악기가 없어요. 다른 이름으로 찾아보세요.</p>}
      </div>
      <Detail item={current} image={image(current.file)} added={inSheet(current.id)} full={sheet.selected.length >= MAX_SHEET} onToggle={() => toggleSheet(current.id)} onStudy={() => setStudying(true)} />
    </div>

    <RangeChart items={(family === "all" ? instruments : instruments.filter(item => item.family === family)).filter(item => item.range)} current={current.id} onPick={setCurrentId} />

    <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card title="활동지 설정" help="소개 카드는 교사용 설명 자료로, 탐구 활동지는 학생이 소리 내는 방법과 느낌을 직접 채우는 활동지로 인쇄됩니다.">
          <div className="space-y-3">
            <ActivityInput label="활동지 제목" value={sheet.title} maxLength={100} onChange={title => setSheet({ ...sheet, title })} />
            <Segmented label="활동지 형식" value={sheet.mode} onChange={mode => setSheet({ ...sheet, mode })} options={[{ value: "card", label: "소개 카드" }, { value: "explore", label: "탐구 활동지" }]} />
            <Toggle label="사진 넣기" checked={sheet.images} onChange={images => setSheet({ ...sheet, images })} help="Wikimedia Commons의 퍼블릭 도메인·CC 사진을 출처와 함께 싣습니다." />
          </div>
        </Card>
        <Card title={`담은 악기 ${sheet.selected.length}/${MAX_SHEET}`} help="위 목록에서 악기를 고른 뒤 ‘활동지에 담기’를 누르세요.">
          {sheet.selected.length ? <ul className="flex flex-wrap gap-1.5">{sheet.selected.map(id => { const item = findInstrument(id); return item && <li key={id}><button type="button" onClick={() => toggleSheet(id)} aria-label={`${item.name} 빼기`} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line bg-surface-2 px-3 text-xs font-bold text-ink-2 hover:border-danger/30 hover:text-danger">{item.name}<X size={12} aria-hidden="true" /></button></li>; })}</ul> : <p className="text-sm text-ink-3">아직 담은 악기가 없어요.</p>}
        </Card>
      </div>
      <ActivitySheet id="music-instruments-print" html={html} disabled={!sheet.selected.length} />
    </div>
    {studying && <InstrumentStudyDialog item={current} items={shown.some(item => item.id === current.id) ? shown : instruments} image={image} added={inSheet(current.id)} full={sheet.selected.length >= MAX_SHEET} onToggle={() => toggleSheet(current.id)} onMove={setCurrentId} onClose={closeStudy} />}
  </ActivityLayout>;
}

function Detail({ item, image, added, full, onToggle, onStudy }: { item: Instrument; image: CommonsImage | null | undefined; added: boolean; full: boolean; onToggle: () => void; onStudy: () => void }) {
  return <article aria-label={`${item.name} 소개`} className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-[var(--lift-1)] xl:sticky xl:top-4">
    <button type="button" onClick={onStudy} aria-label={`${item.name} 크게 보기`} className="group relative block w-full">
      <InstrumentImage key={item.id} item={item} image={image} className="aspect-[16/11]" large />
      <span className="absolute bottom-3 right-3 flex min-h-9 items-center gap-1.5 rounded-full bg-black/55 px-3 text-[.76rem] font-bold text-white backdrop-blur group-hover:bg-black/75"><Maximize2 size={14} aria-hidden="true" /> 크게 보기</span>
    </button>
    {image && <ImageCredit image={image} className="border-b border-line px-5 py-2" />}
    <div className="space-y-4 px-5 py-4">
      <header className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-bold text-brand-dark">{item.family} · {item.kind}</p><h2 className="mt-1 text-[1.45rem] font-extrabold tracking-[-0.03em]">{item.name} <span className="text-sm font-semibold text-ink-4">{item.english}</span></h2></div>
        <Button variant={added ? "secondary" : "primary"} size="sm" onClick={onToggle} disabled={!added && full} title={!added && full ? `활동지에는 ${MAX_SHEET}개까지 담을 수 있어요.` : undefined}>{added ? <><Check size={15} /> 담음</> : <><Plus size={15} /> 활동지에 담기</>}</Button>
      </header>
      <p className="break-keep text-[.93rem] leading-7 text-ink-2">{item.summary}</p>
      <Button variant="secondary" size="sm" className="w-full" onClick={onStudy}><Maximize2 size={15} /> 크게 보기</Button>
      <Section title="소리 내는 방법"><p>{item.sound}</p></Section>
      <Section title="특징"><ul className="list-disc space-y-1 pl-5">{item.features.map(feature => <li key={feature}>{feature}</li>)}</ul></Section>
      <Section title="음역">{item.range ? <><RangeBar range={item.range} /><p className="mt-1.5 text-[.8rem] text-ink-3">{noteLabel(item.range.low)} ~ {noteLabel(item.range.high)} (실음){item.rangeNote && ` · ${item.rangeNote}`}</p></> : <p className="text-[.85rem] text-ink-3">{item.rangeNote ?? "일정한 음높이가 없는 타악기예요."}</p>}</Section>
      <Section title="함께 들어 볼 곡"><ul className="space-y-2">{item.works.map(work => <li key={work.title}><p className="font-bold text-ink">{work.composer} {work.title}</p><p className="text-[.84rem] text-ink-3">{work.note}</p></li>)}</ul></Section>
      <p className="flex gap-2 break-keep rounded-xl bg-brand-page px-3 py-2.5 text-[.85rem] leading-6 text-ink-2"><Lightbulb size={16} className="mt-1 shrink-0 text-brand" aria-hidden="true" /><span><b className="text-brand-dark">수업 포인트</b> {item.tip}</span></p>
      {image && <a href={image.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-4 hover:text-brand-dark"><ExternalLink size={12} /> 원본 사진 보기</a>}
    </div>
  </article>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h3 className="mb-1 text-[.78rem] font-extrabold text-ink-3">{title}</h3><div className="break-keep text-[.9rem] leading-6 text-ink-2">{children}</div></section>;
}

function RangeChart({ items, current, onPick }: { items: Instrument[]; current: string; onPick: (id: string) => void }) {
  if (!items.length) return <Card title="음역 비교"><p className="flex items-center gap-2 text-sm text-ink-3"><Waves size={16} aria-hidden="true" /> 국악기는 율명으로 음높이를 나타내므로 음역 비교 막대를 싣지 않았어요.</p></Card>;
  const sorted = [...items].sort((a, b) => noteToMidi(a.range!.low) - noteToMidi(b.range!.low) || noteToMidi(a.range!.high) - noteToMidi(b.range!.high));
  return <Card title="음역 비교" help="피아노 건반 전체(A0~C8)를 기준으로 각 악기가 실제로 내는 소리의 일반적인 음역을 나타냈어요. 가운데 도는 C4입니다.">
    <div className="overflow-x-auto"><div className="min-w-[560px]">
      <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3">
        <span />
        <OctaveAxis className="mb-1" />
      </div>
      <ul className="space-y-1">{sorted.map(item => <li key={item.id}>
        <button type="button" onClick={() => onPick(item.id)} aria-pressed={item.id === current} className={cn("grid w-full grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 rounded-lg px-1 py-1 text-left", item.id === current ? "bg-brand-page" : "hover:bg-surface-2")}>
          <span className={cn("truncate text-[.8rem] font-bold", item.id === current ? "text-brand-dark" : "text-ink-2")}>{item.name}</span>
          <RangeBar range={item.range!} active={item.id === current} />
        </button>
      </li>)}</ul>
    </div></div>
  </Card>;
}
