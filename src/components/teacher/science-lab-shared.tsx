"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { Atom, ClipboardCheck, Copy, FlaskConical, LoaderCircle, Printer, ShieldCheck, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { problemSheetHtml, problemSheetText, type SheetOptions, type SheetSection } from "@/features/science/sheet";
import { cn } from "@/lib/utils";
import { copyToClipboard, PrintablePage } from "./hanmun-sheet";
import { Segmented, Toggle } from "./tool-panel";

/* 교사 지원실 · 과학의 하위 탭(실험 그림, 통합·탐구, 물리학, 화학, 생명과학, 지구과학)이 함께 쓰는 조각입니다. 사회 교과 도구(역사·지리·정치·법·경제·윤리)도 area만 바꿔 같이 씁니다. */

/** 교과 묶음(과학·사회)의 이름·아이콘과 브라우저 저장 키 앞부분입니다. */
export type LabArea = { name: string; icon: typeof Atom; storage: string };
export const SCIENCE_AREA: LabArea = { name: "과학", icon: FlaskConical, storage: "learncraft_science" };

export function ScienceHeader({ subject, title, description, tabs, area = SCIENCE_AREA }: { subject: string; title: string; description: string; tabs?: React.ReactNode; area?: LabArea }) {
  const AreaIcon = area.icon;
  return (
    <>
      <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><AreaIcon size={16} /> 교사 지원실 · {area.name} · {subject}</p>
          <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">{title}</h1>
          <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3">{description}</p>
        </div>
        <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
      </header>
      {tabs}
    </>
  );
}

export const tabClass = (active: boolean) => cn("flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-[.86rem] font-bold transition-colors", active ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark");
export const chipClass = (active: boolean) => cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-left text-[.8rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand",
  active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark");
export const fieldClass = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none placeholder:text-ink-5 focus:border-brand/50 focus:ring-2 focus:ring-brand/10";
export const panelClass = "rounded-[18px] border border-line bg-surface p-4 shadow-[var(--lift-1)]";

/** 과목 안의 보기(예: 운동 그래프 · 저항 회로)를 고르는 탭입니다. */
export function ViewTabs<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string; icon: typeof Atom }[]; onChange: (value: T) => void }) {
  return (
    <nav aria-label={label} className="mt-5 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {options.map(({ value: key, label: text, icon: Icon }) => (
        <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)} className={tabClass(value === key)}><Icon size={16} /> {text}</button>
      ))}
    </nav>
  );
}

const noop = () => () => {};
/** 단추를 누를 때만 부르는 무작위 seed입니다. 렌더 중에 부르지 않습니다. */
export const randomSeed = () => Math.floor(Math.random() * 1_000_000);
/** 브라우저에 저장한 설정을 읽은 뒤에 그립니다(서버 렌더와 어긋나지 않게). */
export function Hydrated({ label, children }: { label: string; children: () => React.ReactNode }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? <>{children()}</> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> {label}를 준비하는 중…</div>;
}
export function readStored<T>(key: string, parse: (value: unknown) => T): T {
  try {
    const saved = window.localStorage.getItem(key);
    return parse(saved ? JSON.parse(saved) : {});
  } catch {
    return parse({});
  }
}
export function writeStored(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장하지 못해도 이번 화면에서는 계속 쓸 수 있습니다. */ }
}

/** 숫자 입력칸. 고치는 동안에는 글자 그대로 두고, 올바른 숫자일 때만 값을 바꿉니다. */
export function NumberField({ label, value, onChange, min, max, step = 1, unit, className }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; unit?: string; className?: string }) {
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) { setShown(value); setText(String(value)); }
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-semibold text-ink-4">{label}</span>
      <span className="flex items-center gap-1.5">
        <input type="number" inputMode="decimal" value={text} min={min} max={max} step={step} onFocus={event => event.currentTarget.select()}
          onChange={event => {
            setText(event.target.value);
            const next = Number(event.target.value);
            if (event.target.value.trim() !== "" && Number.isFinite(next) && (min === undefined || next >= min) && (max === undefined || next <= max)) { setShown(next); onChange(next); }
          }}
          onBlur={() => setText(String(value))}
          className="min-h-9 w-full min-w-0 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/10" />
        {unit && <span className="shrink-0 text-xs text-ink-4">{unit}</span>}
      </span>
    </label>
  );
}

/** 학습지 미리보기와 인쇄·한글 복사 단추입니다. 화면에 PrintablePage는 하나만 둡니다(인쇄할 때 그 부분만 나오도록). */
export function SheetPreview({ id, html, clipboard, empty, extra }: { id: string; html: string | null; clipboard?: () => { text: string; html: string }; empty?: string; extra?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!clipboard) return;
    await copyToClipboard(clipboard());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {extra}
        {clipboard && <Button variant="secondary" size="sm" disabled={!html} onClick={() => void copy()} title="한글·워드에 붙여 넣을 수 있게 복사해요(그림은 빠져요)">{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "한글에 붙여 넣기용 복사"}</Button>}
        <Button variant="secondary" size="sm" disabled={!html} onClick={() => window.print()} title="A4 세로로 인쇄해요"><Printer size={15} /> 인쇄</Button>
      </div>
      {html ? <PrintablePage id={id} html={html} /> : <p className="rounded-2xl border border-dashed border-line bg-surface-2 px-6 py-16 text-center text-[.9rem] text-ink-3">{empty ?? "학습지에 넣을 문항을 골라 주세요."}</p>}
    </div>
  );
}

/** 문제 묶음(SheetSection)으로 된 학습지를 미리보기합니다. clipboard는 한글에 붙여 넣을 HTML을 한 번 더 고칩니다(예: 수식을 글로). */
export function ProblemSheet({ id, sections: raw, options, extra, clipboard = html => html }: { id: string; sections: SheetSection[]; options: SheetOptions; extra?: React.ReactNode; clipboard?: (html: string) => string }) {
  // 무작위로 만든 문제가 똑같이 나오면 한 번만 싣습니다.
  const seen = new Set<string>();
  const sections = raw.map(section => ({ ...section, problems: section.problems.filter(problem => !seen.has(problem.text) && Boolean(seen.add(problem.text))) }));
  const has = sections.some(section => section.problems.length || section.intro);
  return <SheetPreview id={id} extra={extra} html={has ? problemSheetHtml(sections, options, "screen") : null} clipboard={() => ({ text: problemSheetText(sections, options), html: clipboard(problemSheetHtml(sections, options, "clipboard")) })} />;
}

/** SVG 문자열을 그대로 보여 줍니다. 모든 글은 만드는 쪽에서 이스케이프합니다. */
export function SvgView({ svg, className, label }: { svg: string; className?: string; label: string }) {
  return <div role="img" aria-label={label} className={cn("[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full", className)} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** 보기 하나의 설정을 이 브라우저에 따로 저장합니다. Hydrated 안에서만 씁니다. */
export function useStored<T extends object>(key: string, schema: z.ZodType<T>) {
  const [state, setState] = useState<T>(() => readStored(key, value => schema.parse(value)));
  useEffect(() => writeStored(key, state), [key, state]);
  const update = useCallback((patch: Partial<T>) => setState(current => ({ ...current, ...patch })), []);
  return [state, update] as const;
}

/** 학습지 공통 설정(제목·문항 수·정답지·다시 섞기)의 저장 형식입니다. */
export const sheetSchema = (count: number) => z.object({
  title: z.string().max(100).catch(""),
  count: z.number().int().min(1).max(30).catch(count),
  seed: z.number().int().catch(1),
  answers: z.boolean().catch(true),
}).catch({ title: "", count, seed: 1, answers: true });
export type SheetSettings = { title: string; count: number; seed: number; answers: boolean };

/** 여러 개를 고르는 칩입니다. */
export function MultiChips<T extends string>({ options, value, onChange, className }: { options: Record<T, string>; value: T[]; onChange: (value: T[]) => void; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {(Object.keys(options) as T[]).map(key => (
        <button key={key} type="button" aria-pressed={value.includes(key)} onClick={() => onChange(value.includes(key) ? value.filter(item => item !== key) : [...value, key])} className={chipClass(value.includes(key))}>{options[key]}</button>
      ))}
    </div>
  );
}

/** 학습지 설정 카드. children에 묻는 것 같은 과목별 설정을 넣습니다. */
export function SheetCard({ sheet, onChange, counts = [4, 6, 8, 10], countLabel = "문항 수", placeholder, help, children }: {
  sheet: SheetSettings; onChange: (sheet: SheetSettings) => void; counts?: number[]; countLabel?: string; placeholder: string; help?: string; children?: React.ReactNode;
}) {
  return (
    <section className={panelClass} aria-label="학습지 설정">
      <h2 className="mb-3 text-sm font-extrabold text-ink" title={help}>학습지</h2>
      {children}
      {counts.length > 0 && <>
        <p className="mb-1 mt-3 text-xs font-semibold text-ink-4">{countLabel}</p>
        <Segmented label={countLabel} value={counts.includes(sheet.count) ? sheet.count : counts[0]} onChange={count => onChange({ ...sheet, count })} options={counts.map(value => ({ value, label: `${value}개` }))} />
      </>}
      <input value={sheet.title} maxLength={100} onChange={event => onChange({ ...sheet, title: event.target.value })} placeholder={placeholder} className={cn(fieldClass, "mt-3")} />
      <Toggle label="정답지 붙이기" checked={sheet.answers} onChange={answers => onChange({ ...sheet, answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
      <Button variant="ghost" size="sm" onClick={() => onChange({ ...sheet, seed: sheet.seed + 1 })}><Shuffle size={14} /> 다른 문제로</Button>
    </section>
  );
}

/** 왼쪽 설정 · 오른쪽 결과로 나눈 보기 틀입니다. */
export function ToolLayout({ aside, children }: { aside: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4">{aside}</aside>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

/** 계산 결과 한 칸입니다. */
export function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return <div className="rounded-xl bg-surface-2 px-3 py-2 text-center"><p className="text-[.74rem] text-ink-4">{label}</p><p className="text-[1rem] font-extrabold text-ink">{value}</p>{note && <p className="text-[.68rem] text-ink-4">{note}</p>}</div>;
}

/** 이미 이스케이프한 HTML 조각(표 등)을 흰 바탕으로 보여 줍니다. */
export function HtmlView({ html, className }: { html: string; className?: string }) {
  return <div className={cn("overflow-x-auto text-black [&_td]:bg-white", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

export type SubjectView = { value: string; label: string; icon: typeof Atom; note: string; render: () => React.ReactNode };
/** 과목 탭 하나: 머리글 + 보기 탭 + 고른 보기. 마지막에 본 보기를 기억합니다. */
type SubjectLabProps = { id: string; subject: string; title: string; description: string; tabs?: React.ReactNode; views: SubjectView[]; area?: LabArea };
export function SubjectLab(props: SubjectLabProps) {
  return <Hydrated label={`${props.subject} 도구`}>{() => <SubjectBody {...props} />}</Hydrated>;
}
const viewSchema = z.object({ view: z.string().catch("") });
function SubjectBody({ id, subject, title, description, tabs, views, area = SCIENCE_AREA }: SubjectLabProps) {
  const [state, update] = useStored(`${area.storage}_${id}_view`, viewSchema);
  const current = views.find(view => view.value === state.view) ?? views[0];
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <ScienceHeader subject={subject} title={title} description={description} tabs={tabs} area={area} />
      <ViewTabs label={`${subject} 보기`} value={current.value} onChange={view => update({ view })} options={views.map(({ value, label, icon }) => ({ value, label, icon }))} />
      <p className="mt-2 break-keep px-1 text-[.8rem] leading-5 text-ink-4">{current.note}</p>
      <div key={current.value}>{current.render()}</div>
    </div>
  );
}

/** 묻는 것 여러 개를 고르는 칩의 저장 형식입니다. */
export const asksSchema = <T extends string>(options: Record<T, string>, fallback: NoInfer<T>[]) => z.array(z.enum(Object.keys(options) as [T, ...T[]])).catch(fallback);
