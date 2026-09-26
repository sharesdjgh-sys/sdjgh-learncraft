"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { BookOpenText, ClipboardCheck, Copy, FileText, Flower2, ImagePlus, LayoutGrid, LoaderCircle, MonitorPlay, Printer, ShieldCheck, Trash2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  CULTURE_TOPICS, cultureCategories, cultureSheetHtml, cultureSheetText, cultureSheetTypeKeys, cultureSheetTypes, stripRuby,
  type CultureCategory, type CultureSheetType, type CultureTopic,
} from "@/features/japanese/culture";
import { Card, Toggle } from "./tool-panel";
import { copyToClipboard, PrintablePage } from "./hanmun-sheet";
import type { ImageProvider } from "@/features/japanese/culture-image";
import { CultureImagePanel } from "./japanese-culture-image";
import { useTopicImages } from "./japanese-culture-images";
import { CultureReading, readReadingStored } from "./japanese-culture-reading";
import { JapaneseCultureShow } from "./japanese-culture-show";
import { RubyInline } from "./japanese-ruby";
import { speechNotice, useJapaneseSpeech } from "./japanese-speech";

type View = "cards" | "sheet" | "reading" | "image";

// 고른 주제와 활동지 설정은 이 브라우저에만 저장합니다.
const storageKey = "learncraft_japanese_culture_v1";
const topicIds = CULTURE_TOPICS.map(topic => topic.id) as [string, ...string[]];
const storedSchema = z.object({
  title: z.string().max(100).catch(""),
  selected: z.array(z.string()).catch(["shogatsu"]).transform(ids => ids.filter(id => topicIds.includes(id))),
  view: z.enum(["cards", "sheet", "reading", "image"]).catch("cards"),
  sheet: z.object({ types: z.array(z.enum(cultureSheetTypeKeys as [CultureSheetType, ...CultureSheetType[]])).catch(["words", "ox", "compare"]), furigana: z.boolean().catch(true), answers: z.boolean().catch(true), pictures: z.boolean().catch(true) })
    .catch({ types: ["words", "ox", "compare"], furigana: true, answers: true, pictures: true }),
});
type Stored = z.infer<typeof storedSchema>;
function readStored(): Stored {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return storedSchema.parse(saved ? JSON.parse(saved) : {});
  } catch {
    return storedSchema.parse({});
  }
}
const noop = () => () => {};

export function JapaneseCultureLab({ tabs, imageReady }: { tabs?: React.ReactNode; imageReady: Record<ImageProvider, boolean> }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? <CultureEditor initial={readStored()} tabs={tabs} imageReady={imageReady} /> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 일본문화 도구를 준비하는 중…</div>;
}

const fieldClass = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-ink-5 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
const chipClass = (active: boolean) => cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-[.82rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand",
  active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark");
const tabClass = (active: boolean) => cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", active ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark");

function TopicCard({ topic, speak, image, onRemoveImage }: { topic: CultureTopic; speak: (text: string) => void; image?: string; onRemoveImage: () => void }) {
  return (
    <article className="space-y-3 rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)] sm:p-5">
      {image && (
        <figure className="relative overflow-hidden rounded-xl border border-line bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- GPT가 만든 base64 그림은 next/image 최적화 대상이 아닙니다. */}
          <img src={image} alt={`${topic.title} 그림`} className="mx-auto max-h-72 w-auto max-w-full" />
          <button type="button" onClick={onRemoveImage} className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-white/90 text-ink-4 shadow hover:text-danger" aria-label={`${topic.title} 그림 빼기`} title="그림 빼기"><Trash2 size={15} /></button>
        </figure>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[.72rem] font-bold text-brand">{cultureCategories[topic.category]}{topic.when ? ` · ${topic.when}` : ""}</p>
          <h3 className="mt-1 text-[1.15rem] font-extrabold text-ink"><span lang="ja" className="font-ja mr-2 text-[1.45rem] font-semibold [&_rt]:text-[.45em]"><RubyInline text={topic.ja} /></span>{topic.title}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => speak(stripRuby(topic.ja))} aria-label={`${topic.title} 일본어 듣기`} title="일본어 듣기"><Volume2 size={15} /></Button>
      </div>
      <p className="break-keep text-[.9rem] leading-7 text-ink-2">{topic.summary}</p>
      <ul className="space-y-1 text-[.84rem] leading-6 text-ink-2">{topic.points.map(point => <li key={point} className="flex gap-1.5 break-keep"><span className="text-brand">•</span>{point}</li>)}</ul>
      <ul className="flex flex-wrap gap-1.5">
        {topic.words.map(word => (
          <li key={word.word}><button type="button" onClick={() => speak(word.reading)} title="소리 듣기" className="rounded-xl border border-line bg-surface-2 px-2.5 py-1.5 text-left text-[.82rem] leading-5 hover:border-brand/30 hover:bg-brand-page">
            <span lang="ja" className="font-ja text-[1.02rem] font-bold text-ink">{word.word}</span>
            {word.reading !== word.word && <span lang="ja" className="font-ja ml-1 text-ink-4">{word.reading}</span>}
            <span className="ml-1.5 text-ink-2">{word.meaning}</span>
          </button></li>
        ))}
      </ul>
      {topic.phrase && (
        <button type="button" onClick={() => speak(stripRuby(topic.phrase!.ja))} className="block w-full rounded-xl bg-brand-page px-3 py-2 text-left hover:bg-brand-soft" title="소리 듣기">
          <span lang="ja" className="font-ja block text-[1.1rem] font-semibold text-brand-dark [&_rt]:text-[.5em]"><RubyInline text={topic.phrase.ja} /></span>
          <span className="text-[.8rem] text-ink-3">{topic.phrase.ko}</span>
        </button>
      )}
      <dl className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2 gap-y-1 rounded-xl bg-surface-2 px-3 py-2 text-[.82rem] leading-6">
        <dt className="font-bold text-[#a3402a]">일본</dt><dd className="break-keep text-ink-2">{topic.japan}</dd>
        <dt className="font-bold text-[#2f5d8a]">한국</dt><dd className="break-keep text-ink-2">{topic.korea}</dd>
      </dl>
      <ol className="space-y-1 text-[.82rem] leading-6 text-ink-2">
        {topic.quiz.map(quiz => <li key={quiz.statement} className="flex gap-2 break-keep"><span className={cn("font-extrabold", quiz.answer ? "text-[#2f5d8a]" : "text-[#a3402a]")}>{quiz.answer ? "O" : "X"}</span><span>{quiz.statement}{quiz.note && <span className="text-ink-4"> — {quiz.note}</span>}</span></li>)}
      </ol>
      <p className="border-t border-line pt-2 text-[.8rem] text-ink-3">생각해 보기: {topic.think}</p>
    </article>
  );
}

function CultureEditor({ initial, tabs, imageReady }: { initial: Stored; tabs?: React.ReactNode; imageReady: Record<ImageProvider, boolean> }) {
  const [title, setTitle] = useState(initial.title);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [view, setView] = useState<View>(initial.view);
  const [sheet, setSheet] = useState(initial.sheet);
  const [copied, setCopied] = useState(false);
  const [showing, setShowing] = useState(false);
  const [reading] = useState(readReadingStored);
  const closeShow = useCallback(() => setShowing(false), []);
  const { supported, hasVoice, speak } = useJapaneseSpeech();
  const { images, save: saveImage, error: imageError } = useTopicImages();
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify({ title, selected, view, sheet })); } catch { /* 저장하지 못해도 이번 화면에서는 계속 쓸 수 있습니다. */ }
  }, [title, selected, view, sheet]);

  const topics = CULTURE_TOPICS.filter(topic => selected.includes(topic.id));
  const toggle = (id: string) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const sheetOptions = { title, ...sheet, pictures: sheet.pictures ? images : undefined };
  const pictureCount = topics.filter(topic => images[topic.id]).length;
  async function removeImage(topic: CultureTopic) {
    if (await confirm({ eyebrow: "주제 그림", title: "그림을 뺄까요?", tone: "danger", confirmLabel: "빼기", description: `‘${topic.title}’ 카드·수업 화면·활동지에서 AI 그림 1장을 뺍니다.`, note: "뺀 그림은 되돌릴 수 없어요. 필요하면 먼저 그림을 저장해 두세요." })) void saveImage(topic.id, null);
  }
  const notice = speechNotice(supported, hasVoice);
  const firstTopic = topics[0] ?? CULTURE_TOPICS[0];

  async function copy() {
    await copyToClipboard({ text: cultureSheetText(topics, sheetOptions), html: cultureSheetHtml(topics, sheetOptions, "clipboard") });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><Flower2 size={16} /> 교사 지원실 · 일본문화</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">일본문화 주제 카드 · 활동지 · 읽기 자료</h1>
          <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3 lg:min-h-12 xl:min-h-6">연중 행사·음식·생활 예절·전통 문화 등 22개 주제를 고르면 설명과 핵심 낱말, 한일 비교, O·X 퀴즈를 카드와 수업 화면으로 보여 주고 활동지로 인쇄할 수 있어요. 교과서 단원에 맞춘 읽기 자료는 AI로 만들 수 있습니다.</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
      </header>
      {tabs}

      <section className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-4">
          <Card title={`주제 고르기 · ${topics.length}개`} help="고른 주제로 카드·수업 화면·활동지를 만듭니다. 읽기 자료 탭에서는 첫 번째로 고른 주제가 기본 주제가 돼요." action={selected.length > 0 && <button type="button" onClick={() => setSelected([])} className="rounded-lg px-2 py-1 text-xs font-bold text-ink-4 hover:bg-surface-2 hover:text-danger">모두 빼기</button>}>
            <div className="space-y-3">
              {(Object.keys(cultureCategories) as CultureCategory[]).map(category => {
                const items = CULTURE_TOPICS.filter(topic => topic.category === category);
                const every = items.every(topic => selected.includes(topic.id));
                return (
                  <div key={category}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[.76rem] font-bold text-ink-3">{cultureCategories[category]}</p>
                      <button type="button" onClick={() => setSelected(current => every ? current.filter(id => !items.some(topic => topic.id === id)) : [...new Set([...current, ...items.map(topic => topic.id)])])} className="rounded-lg px-2 py-0.5 text-[.72rem] font-bold text-ink-4 hover:bg-brand-page hover:text-brand-dark">{every ? "모두 빼기" : "모두 넣기"}</button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {items.map(topic => <button key={topic.id} type="button" aria-pressed={selected.includes(topic.id)} onClick={() => toggle(topic.id)} title={stripRuby(topic.ja)} className={chipClass(selected.includes(topic.id))}>{topic.title}</button>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          {notice && <p role="status" className="rounded-xl border border-warn/25 bg-[var(--warn-page)] px-3.5 py-2.5 text-[.76rem] font-semibold leading-5 text-warn">{notice}</p>}
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <nav aria-label="일본문화 보기" className="flex w-fit flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
              <button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")} className={tabClass(view === "cards")}><LayoutGrid size={16} /> 주제 카드</button>
              <button type="button" aria-pressed={view === "sheet"} onClick={() => setView("sheet")} className={tabClass(view === "sheet")}><FileText size={16} /> 활동지</button>
              <button type="button" aria-pressed={view === "reading"} onClick={() => setView("reading")} className={tabClass(view === "reading")}><BookOpenText size={16} /> 읽기 자료 (AI)</button>
              <button type="button" aria-pressed={view === "image"} onClick={() => setView("image")} className={tabClass(view === "image")}><ImagePlus size={16} /> 그림 만들기 (AI)</button>
            </nav>
            {(view === "cards" || view === "sheet") && <Button variant="secondary" size="sm" disabled={!topics.length} onClick={() => setShowing(true)} title="주제를 한 장씩 크게 띄워요"><MonitorPlay size={15} /> 수업 화면</Button>}
          </div>

          {imageError && <p role="alert" className="mb-3 rounded-lg bg-[var(--danger-page)] px-3 py-2 text-[.8rem] font-semibold text-danger">{imageError}</p>}
          {view === "image" ? (
            <CultureImagePanel topics={[...topics, ...CULTURE_TOPICS.filter(topic => !selected.includes(topic.id))]} ready={imageReady} attached={images} onAttach={(id, image) => void saveImage(id, image)} />
          ) : view === "reading" ? (
            <CultureReading topics={CULTURE_TOPICS} initialTopic={`${firstTopic.title}(${stripRuby(firstTopic.ja)})`} initial={reading} />
          ) : !topics.length ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-8 text-center text-[.9rem] text-ink-3">
              <Flower2 size={24} className="text-brand" />
              <ol className="grid w-full max-w-3xl gap-2 text-left sm:grid-cols-3">
                {[
                  ["주제 고르기", "왼쪽에서 오늘 다룰 주제를 골라요. 설날·칠석처럼 시기에 맞는 행사부터 음식·예절·전통 문화까지 있어요."],
                  ["수업 화면", "‘수업 화면’으로 주제를 크게 띄우고 1~5로 설명·핵심 내용·낱말·한일 비교·O·X를 하나씩 켜요."],
                  ["활동지·읽기 자료", "낱말·O·X·한일 비교표·생각해 보기 활동지를 인쇄하고, 단원에 맞춘 읽기 자료는 AI로 만들어요."],
                ].map(([heading, body], index) => (
                  <li key={heading} className="rounded-xl bg-surface p-3.5 shadow-[var(--lift-1)]">
                    <p className="flex items-center gap-2 font-bold text-ink"><span className="grid size-6 place-items-center rounded-full bg-brand-soft text-[.75rem] text-brand-dark">{index + 1}</span>{heading}</p>
                    <p className="mt-1.5 break-keep text-[.82rem] leading-6">{body}</p>
                  </li>
                ))}
              </ol>
              <Button variant="secondary" size="sm" onClick={() => setSelected(CULTURE_TOPICS.filter(topic => topic.category === "events").map(topic => topic.id))}><Flower2 size={15} /> 연중 행사 8개 넣기</Button>
            </div>
          ) : view === "cards" ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {topics.map(topic => <TopicCard key={topic.id} topic={topic} speak={speak} image={images[topic.id]} onRemoveImage={() => void removeImage(topic)} />)}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
              <Card title="활동 유형" help="고른 주제마다 문항이 들어갑니다. 한일 비교표는 일본 칸을 채워 두고 한국 칸을 학생이 씁니다.">
                <div className="flex flex-wrap gap-1.5">
                  {cultureSheetTypeKeys.map(type => <button key={type} type="button" aria-pressed={sheet.types.includes(type)} onClick={() => setSheet({ ...sheet, types: sheet.types.includes(type) ? sheet.types.filter(item => item !== type) : [...sheet.types, type] })} className={chipClass(sheet.types.includes(type))}>{cultureSheetTypes[type].label}</button>)}
                </div>
                <div className="mt-3 border-t border-line pt-2">
                  <Toggle label="낱말에 후리가나 달기" checked={sheet.furigana} onChange={furigana => setSheet({ ...sheet, furigana })} help="켜면 읽기를 달고 뜻만 묻습니다. 끄면 읽는 법과 뜻을 모두 묻습니다." />
                  <Toggle label="정답지 붙이기" checked={sheet.answers} onChange={answers => setSheet({ ...sheet, answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다. 한일 비교표는 예시 답을 적습니다." />
                  <Toggle label={`주제 그림 넣기${pictureCount ? ` (${pictureCount}장)` : ""}`} checked={sheet.pictures} onChange={pictures => setSheet({ ...sheet, pictures })} help="‘그림 만들기 (AI)’에서 주제에 넣은 그림을 활동지 맨 앞에 싣습니다." />
                </div>
                <label className="mt-2 block text-[.76rem] font-bold text-ink-3">활동지 제목
                  <input value={title} maxLength={100} onChange={event => setTitle(event.target.value)} placeholder="예: 일본의 연중 행사" className={cn(fieldClass, "mt-1")} />
                </label>
              </Card>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button variant="secondary" size="sm" disabled={!sheet.types.length} onClick={() => void copy()} title="한글·워드에 붙여 넣을 수 있게 복사해요">{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "한글에 붙여 넣기용 복사"}</Button>
                  <Button variant="secondary" size="sm" disabled={!sheet.types.length} onClick={() => window.print()} title="A4 세로로 인쇄해요"><Printer size={15} /> 인쇄</Button>
                </div>
                {sheet.types.length
                  ? <PrintablePage id="culture-sheet-print" html={cultureSheetHtml(topics, sheetOptions, "screen")} />
                  : <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-16 text-center text-[.9rem] text-ink-3">활동 유형을 하나 이상 골라 주세요.</p>}
              </div>
            </div>
          )}
        </div>
      </section>
      {confirmDialog}
      {showing && <JapaneseCultureShow topics={topics} images={images} speak={speak} onClose={closeShow} />}
    </div>
  );
}
