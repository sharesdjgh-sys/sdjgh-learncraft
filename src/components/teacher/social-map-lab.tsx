"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ChevronDown, ChevronLeft, ChevronRight, ClipboardCopy, Download, Eye, EyeOff, FileDown, FilePlus2, Hand, LoaderCircle,
  LocateFixed, MapIcon, MapPin, Maximize, Minimize2, MousePointer2, MoveUpRight, PaintBucket, Pentagon, Printer, Redo2, Ruler, ShieldCheck,
  Spline, Trash2, Type, Undo2, Upload, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { countryKoreanName } from "@/lib/social-map/country-names";
import { blankDoc, mapExamples } from "@/lib/social-map/examples";
import { HISTORY_SOURCE, historyGroups, historyPeriod, historyPeriods } from "@/lib/social-map/history";
import {
  distanceKm, formatDistance, MAP_HEIGHT, MAP_WIDTH, palette, parseMapDoc, presets, projectionHelp, projectionNames,
  type Annotation, type CountryNameMode, type MapDoc, type MapOptions, type MarkerSymbol, type ProjectionKind, type Tool,
} from "@/lib/social-map/model";
import { clampView, fitView, zoomView } from "@/lib/social-map/projection";
import { SocialMapCanvas, type Selection, type ToolStyle } from "./social-map-canvas";
import { Card, HelpTip, Range, Segmented, Toggle } from "./tool-panel";

const draftKey = "learncraft_social_map_draft";
const noop = () => () => {};
const inputClass = "min-h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10";

const tools: { id: Tool; label: string; key: string; icon: typeof MapPin; help: string }[] = [
  { id: "move", label: "선택·이동", key: "V", icon: MousePointer2, help: "지도를 끌어 옮기고, 그린 것이나 나라 이름을 눌러 고치거나 끌어서 옮겨요." },
  { id: "paint", label: "나라 색칠", key: "B", icon: PaintBucket, help: "나라를 누르면 고른 색으로 칠해요. 같은 색으로 한 번 더 누르면 지워져요." },
  { id: "text", label: "글자", key: "T", icon: Type, help: "누른 자리에 글자를 넣어요. 오른쪽 창에서 내용과 크기를 바꿔요." },
  { id: "marker", label: "지점", key: "P", icon: MapPin, help: "도시·유적지·전투지 같은 지점을 표시해요." },
  { id: "arrow", label: "화살표", key: "A", icon: MoveUpRight, help: "지나가는 곳을 차례로 누르고 두 번 눌러 끝내요. 이동·침입·교역 경로에 알맞아요." },
  { id: "line", label: "선", key: "L", icon: Spline, help: "강·성곽·경계선처럼 화살촉 없는 선을 그려요." },
  { id: "area", label: "영역", key: "R", icon: Pentagon, help: "꼭짓점을 차례로 눌러 옛 나라의 영역이나 문화권을 칠해요. 첫 점을 다시 누르면 닫혀요." },
  { id: "measure", label: "거리 재기", key: "M", icon: Ruler, help: "두 지점을 누르면 가장 짧은 길(대권)과 거리를 보여 줘요." },
];
const symbols: { id: MarkerSymbol; label: string }[] = [{ id: "dot", label: "● 점" }, { id: "star", label: "★ 별" }, { id: "square", label: "■ 네모" }, { id: "triangle", label: "▲ 세모" }];
const nameModes: { value: CountryNameMode; label: string }[] = [{ value: "auto", label: "알맞게" }, { value: "all", label: "모두" }, { value: "filled", label: "색칠한 나라" }, { value: "none", label: "숨김" }];

type Stored = { doc: MapDoc };
function readDraft(): MapDoc {
  try {
    const saved = JSON.parse(window.localStorage.getItem(draftKey) ?? "null") as Stored | null;
    const doc = saved && parseMapDoc(saved.doc);
    if (doc) return doc;
  } catch { /* 저장된 초안을 읽지 못하면 새 지도로 시작합니다. */ }
  return blankDoc("korea");
}
const fileName = (title: string, extension: string) => `${(title.trim() || "사회 지도").replace(/[\\/:*?"<>|]+/g, " ").slice(0, 60)}.${extension}`;
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** 화면의 지도(SVG)를 편집 표시 없이 PNG 그림으로 바꿉니다. */
async function mapToPng(svg: SVGSVGElement, ratio = 2) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-export='skip']").forEach(node => node.remove());
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(MAP_WIDTH * ratio));
  clone.setAttribute("height", String(MAP_HEIGHT * ratio));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("지도 그림을 만들지 못했어요.")); image.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = MAP_WIDTH * ratio;
    canvas.height = MAP_HEIGHT * ratio;
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("지도 그림을 만들지 못했어요.");
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

function Swatches({ value, onChange, label = "색" }: { value?: number; onChange: (value: number) => void; label?: string }) {
  return <div role="group" aria-label={label} className="flex flex-wrap gap-1">
    {palette.map((color, index) => <button key={color.name} type="button" title={color.name} aria-label={color.name} aria-pressed={value === index} onClick={() => onChange(index)}
      className={cn("size-7 rounded-full border-2 transition-transform hover:scale-110", value === index ? "border-ink ring-2 ring-brand/25" : "border-white shadow-[0_0_0_1px_rgba(0,0,0,.12)]")}
      style={{ background: `linear-gradient(135deg, ${color.fill} 50%, ${color.ink} 50%)` }} />)}
  </div>;
}
function MapButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} className="grid size-9 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-brand-page hover:text-brand-dark">{children}</button>;
}
export function SocialMapLab() {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  return hydrated ? <SocialMapEditor initial={readDraft()} /> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-4"><LoaderCircle size={18} className="mr-2 animate-spin" /> 지도 도구를 준비하는 중…</div>;
}

function SocialMapEditor({ initial }: { initial: MapDoc }) {
  const [doc, setDoc] = useState(initial);
  const [past, setPast] = useState<MapDoc[]>([]);
  const [future, setFuture] = useState<MapDoc[]>([]);
  const [homeView, setHomeView] = useState(initial.view);
  const [tool, setTool] = useState<Tool>("move");
  const [toolStyle, setToolStyle] = useState<ToolStyle>({ color: 0, symbol: "dot", dashed: false, curved: true, width: 4 });
  const [selection, setSelection] = useState<Selection>(null);
  // 방금 만든 글자·지점처럼 이름 입력칸에 바로 커서를 둘 항목입니다.
  const [focusId, setFocusId] = useState<string | null>(null);
  const [quiz, setQuiz] = useState(false);
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const [fullscreen, setFullscreen] = useState(false);
  const [busy, setBusy] = useState<"" | "png" | "copy">("");
  const [message, setMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const docRef = useRef(doc);
  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editBefore = useRef<MapDoc | null>(null);

  /* ───── 문서·되돌리기 ───── */
  const update = useCallback((next: MapDoc, record = true) => {
    if (record) { const before = docRef.current; setPast(items => [...items.slice(-59), before]); setFuture([]); }
    docRef.current = next;
    setDoc(next);
  }, []);
  const record = useCallback((before: MapDoc) => { setPast(items => [...items.slice(-59), before]); setFuture([]); }, []);
  // 되돌리기는 그린 내용만 바꾸고, 지금 보고 있는 지도 모양(도법·확대·위치)은 그대로 둡니다.
  const keepCamera = (target: MapDoc): MapDoc => ({ ...target, projection: docRef.current.projection, meridian: docRef.current.meridian, view: docRef.current.view });
  const undo = () => {
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast(past.slice(0, -1));
    setFuture([docRef.current, ...future]);
    update(keepCamera(previous), false);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture(future.slice(1));
    setPast([...past, docRef.current]);
    update(keepCamera(next), false);
  };
  const setOptions = (patch: Partial<MapOptions>) => update({ ...docRef.current, options: { ...docRef.current.options, ...patch } });
  /** 글자 입력처럼 계속 바뀌는 값은 입력을 마칠 때 한 번만 되돌리기 기록에 남깁니다. */
  const beginEdit = () => { editBefore.current ??= docRef.current; };
  const endEdit = () => { if (editBefore.current && editBefore.current !== docRef.current) record(editBefore.current); editBefore.current = null; };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { window.localStorage.setItem(draftKey, JSON.stringify({ doc } satisfies Stored)); } catch { /* 저장 공간이 없으면 이번 화면에서만 유지합니다. */ }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [doc]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const loadDoc = (next: MapDoc) => {
    update(next);
    setHomeView(next.view);
    setSelection(null);
    setRevealed(new Set());
  };
  const choosePreset = (id: string) => {
    const preset = presets.find(item => item.id === id);
    if (!preset) return;
    const view = fitView(preset.projection, preset.meridian, preset.bounds);
    update({ ...docRef.current, projection: preset.projection, meridian: preset.meridian, view }, false);
    setHomeView(view);
  };
  const chooseProjection = (projection: ProjectionKind) => {
    const current = docRef.current;
    const meridian = projection === "globe" ? current.meridian : Math.round(current.view.center[0] / 10) * 10;
    const view = projection === "naturalEarth" && current.projection !== "naturalEarth" && current.view.scale < 400
      ? fitView("naturalEarth", meridian, [[-180, -58], [180, 82]]) : clampView(projection, current.view);
    update({ ...current, projection, meridian, view }, false);
  };
  const chooseEra = (era: string | null) => {
    update({ ...docRef.current, era });
    setSelection(null);
    setRevealed(new Set());
  };
  const eraIndex = historyPeriods.findIndex(item => item.id === doc.era);
  const stepEra = (delta: number) => {
    const next = eraIndex < 0 ? (delta > 0 ? 0 : historyPeriods.length - 1) : eraIndex + delta;
    chooseEra(next < 0 || next >= historyPeriods.length ? null : historyPeriods[next].id);
  };
  const zoomBy = (factor: number) => { const current = docRef.current; update({ ...current, view: zoomView(current.projection, current.meridian, current.view, factor) }, false); };
  const goHome = () => update({ ...docRef.current, view: homeView }, false);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stageRef.current?.requestFullscreen().catch(() => setMessage("이 브라우저에서는 전체 화면을 쓸 수 없어요."));
  };
  const clearMap = () => {
    if (!confirmClear) { setConfirmClear(true); window.setTimeout(() => setConfirmClear(false), 3000); return; }
    setConfirmClear(false);
    loadDoc({ ...blankDoc(), projection: doc.projection, meridian: doc.meridian, view: doc.view, options: doc.options });
  };
  const onSelect = useCallback((next: Selection, focus?: boolean) => {
    setSelection(next);
    setFocusId(focus && next?.type === "note" ? next.id : null);
  }, []);
  const onReveal = useCallback((key: string) => setRevealed(current => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  }), []);

  const selectedNote = selection?.type === "note" ? doc.annotations.find(note => note.id === selection.id) ?? null : null;
  const selectedCountry = selection?.type === "country" ? selection.name : null;
  const selectedLabel = selection?.type === "country" ? selection.label : "";
  const eraCountry = Boolean(selectedCountry?.startsWith("h:"));
  const period = historyPeriod(doc.era);
  const patchNote = (id: string, patch: Partial<Annotation>, rec = true) => update({ ...docRef.current, annotations: docRef.current.annotations.map(note => note.id === id ? { ...note, ...patch } as Annotation : note) }, rec);
  const deleteNote = (id: string) => { update({ ...docRef.current, annotations: docRef.current.annotations.filter(note => note.id !== id) }); setSelection(null); };
  const patchCountry = (name: string, patch: MapDoc["countries"][string], rec = true) => update({ ...docRef.current, countries: { ...docRef.current.countries, [name]: { ...docRef.current.countries[name], ...patch } } }, rec);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && Boolean(event.target.closest("input, textarea, select, [contenteditable='true']"));
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { if (typing) return; event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { if (typing) return; event.preventDefault(); redo(); return; }
      if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === "Delete" && selectedNote) { event.preventDefault(); deleteNote(selectedNote.id); return; }
      if (event.key === "Escape" && selection) { setSelection(null); return; }
      if (event.key === "+" || event.key === "=") { zoomBy(1.4); return; }
      if (event.key === "-" || event.key === "_") { zoomBy(1 / 1.4); return; }
      const next = tools.find(item => item.key.toLowerCase() === event.key.toLowerCase());
      if (next) setTool(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ───── 내보내기 ───── */
  async function savePng() {
    if (!svgRef.current) return;
    setBusy("png");
    try { download(await mapToPng(svgRef.current), fileName(doc.title, "png")); setMessage("PNG 그림으로 저장했어요."); }
    catch { setMessage("그림을 만들지 못했어요. 다시 시도해 주세요."); }
    finally { setBusy(""); }
  }
  async function copyPng() {
    const svg = svgRef.current;
    if (!svg) return;
    setBusy("copy");
    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") throw new Error("unsupported");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": mapToPng(svg) })]);
      setMessage("지도를 복사했어요. 한글·PPT에 붙여 넣으세요.");
    } catch { setMessage("이 브라우저에서는 그림 복사를 쓸 수 없어요. PNG 저장을 이용해 주세요."); }
    finally { setBusy(""); }
  }
  const saveFile = () => download(new Blob([JSON.stringify(doc, null, 1)], { type: "application/json" }), fileName(doc.title, "map.json"));
  const openFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseMapDoc(JSON.parse(await file.text()));
      if (!parsed) throw new Error("invalid");
      loadDoc(parsed);
      setMessage("지도 파일을 불러왔어요.");
    } catch { setMessage("사회 지도 파일(.map.json)이 아니거나 내용이 손상되었어요."); }
  };

  /* ───── 화면 ───── */
  const usedColors = useMemo(() => {
    const used = new Set<number>();
    Object.values(doc.countries).forEach(style => { if (style.fill !== undefined) used.add(style.fill); });
    doc.annotations.forEach(note => { if (note.kind !== "text" && note.kind !== "measure") used.add(note.color); });
    Object.entries(doc.legend).forEach(([index, name]) => { if (name.trim()) used.add(Number(index)); });
    return [...used].sort((a, b) => a - b);
  }, [doc.countries, doc.annotations, doc.legend]);
  const filledCount = Object.values(doc.countries).filter(style => style.fill !== undefined).length;
  const activeTool = tools.find(item => item.id === tool)!;
  const opts = doc.options;
  const summary = `${projectionNames[doc.projection]} · 글자 ${opts.textScale}%`;

  return <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <style>{`
.map-hoverable [data-country]:hover{filter:brightness(.93) saturate(1.15)}
@media print{body *:not(:has(#social-map-print)):not(#social-map-print):not(#social-map-print *){display:none!important}body *:has(#social-map-print),#social-map-print{display:block!important;position:static!important;height:auto!important;max-height:none!important;overflow:visible!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;max-width:none!important;background:#fff!important;aspect-ratio:auto!important}#social-map-print svg{width:100%!important;height:auto!important}#social-map-print [data-export='skip']{display:none!important}@page{size:A4 landscape;margin:10mm}}`}</style>
    <header className="grid gap-4 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p className="flex items-center gap-2 text-[.82rem] font-bold text-brand"><MapIcon size={16} /> 교사 지원실 · 사회</p>
        <h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">수업용 사회 지도</h1>
        <p className="mt-2 break-keep text-[.86rem] leading-6 text-ink-3">한국사·지리·세계사 수업용 지도를 확대해 보고, 색칠하고 화살표·지점을 그린 뒤 그림으로 저장하거나 인쇄합니다.</p>
      </div>
      <span className="flex w-fit items-center gap-2 rounded-full border border-brand/15 bg-brand-page px-3 py-2 text-[.78rem] font-bold text-brand-dark"><ShieldCheck size={15} /> 교사·관리자에게만 표시됨</span>
    </header>

    <section className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start">
      <div className="scrollbar-subtle space-y-4 xl:sticky xl:top-24 xl:-m-1 xl:h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:p-1">
        <Card title="지도 정보" action={<div className="flex gap-1.5">
          <span className="relative">
            <select aria-label="수업 예시 불러오기" value="" onChange={event => { const example = mapExamples[Number(event.target.value)]; if (example) loadDoc(example.build()); }} className="min-h-9 w-32 appearance-none truncate rounded-lg border border-line bg-surface py-1.5 pl-2.5 pr-8 text-xs font-semibold text-ink-3 hover:border-brand/30">
              <option value="" disabled>수업 예시</option>
              {(["한국사", "지리", "세계사"] as const).map(subject => <optgroup key={subject} label={subject}>
                {mapExamples.map((example, index) => example.subject === subject && <option key={example.name} value={index}>{example.name}</option>)}
              </optgroup>)}
            </select>
            <ChevronDown size={13} aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-4" />
          </span>
          <Button variant={confirmClear ? "danger" : "ghost"} size="sm" className="whitespace-nowrap" onClick={clearMap}><FilePlus2 size={14} /> {confirmClear ? "한 번 더 누르면 지워요" : "새 지도"}</Button>
        </div>}>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-ink-4">지도 제목 (지도 위 왼쪽에 보여요)</span>
            <input value={doc.title} maxLength={80} onFocus={beginEdit} onBlur={endEdit} onChange={event => update({ ...docRef.current, title: event.target.value }, false)} placeholder="예: 삼국의 항쟁과 발전" className={inputClass} />
          </label>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={saveFile} title="다시 고칠 수 있는 지도 파일로 저장해요. 다른 선생님과 나눠 쓸 수 있어요."><FileDown size={14} /> 지도 파일 저장</Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => fileRef.current?.click()}><Upload size={14} /> 불러오기</Button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={event => { void openFile(event.target.files?.[0]); event.target.value = ""; }} />
          </div>
        </Card>

        <Card title="지역 바로가기" help="누르면 그 지역이 화면에 꼭 맞게 보여요. 그다음 휠·두 손가락으로 더 확대할 수 있어요.">
          {(["우리나라", "아시아", "세계"] as const).map(group => <div key={group} className="mb-2 last:mb-0">
            <p className="mb-1 text-[.7rem] font-bold text-ink-4">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {presets.filter(preset => preset.group === group).map(preset => <button key={preset.id} type="button" onClick={() => choosePreset(preset.id)} className="min-h-8 rounded-lg border border-line bg-surface-2 px-2.5 text-xs font-bold text-ink-2 transition-colors hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark">{preset.name}</button>)}
            </div>
          </div>)}
        </Card>

        <Card title="시대 지도" help="고른 시기의 나라 경계를 보여 줘요. 옛 나라를 누르면(선택·이동 도구) 이름·색을 바꾸거나 영역을 숨길 수 있어요. 오늘날의 해안선 위에 그린 대략적인 모습이에요.">
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="이전 시기" title="이전 시기" onClick={() => stepEra(-1)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink-3 hover:border-brand/30 hover:text-brand-dark"><ChevronLeft size={16} /></button>
            <span className="relative min-w-0 flex-1">
              <select aria-label="시대 지도 고르기" value={doc.era ?? ""} onChange={event => chooseEra(event.target.value || null)} className="min-h-10 w-full appearance-none truncate rounded-xl border border-line bg-surface-2 py-2 pl-3 pr-9 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-brand">
                <option value="">오늘날의 국경</option>
                {historyGroups.map(group => <optgroup key={group} label={group}>
                  {historyPeriods.filter(item => item.group === group).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                </optgroup>)}
              </select>
              <ChevronDown size={15} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-4" />
            </span>
            <button type="button" aria-label="다음 시기" title="다음 시기" onClick={() => stepEra(1)} className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-ink-3 hover:border-brand/30 hover:text-brand-dark"><ChevronRight size={16} /></button>
          </div>
          {period && <div className="mt-2 space-y-1.5 break-keep text-xs leading-5">
            <p className="font-semibold text-ink-2">{period.note}</p>
            {Object.entries(doc.countries).some(([key, style]) => key.startsWith("h:") && style.hideShape) && <button type="button" onClick={() => update({ ...docRef.current, countries: Object.fromEntries(Object.entries(docRef.current.countries).map(([key, style]) => [key, key.startsWith("h:") ? { ...style, hideShape: undefined } : style])) })} className="font-bold text-brand-dark underline-offset-2 hover:underline">숨긴 영역 되살리기</button>}
            <p className="text-ink-4">경계는 공개 자료 <a className="underline underline-offset-2 hover:text-brand-dark" href={HISTORY_SOURCE.url} target="_blank" rel="noreferrer">historical-basemaps</a>({HISTORY_SOURCE.license})를 바탕으로 한 대략적인 모습이에요.{period.koreaRedrawn && " 한반도·만주 영역은 교과서 지도를 참고해 다시 그렸어요."} 수업 전에 교과서 지도와 한 번 견주어 보세요.</p>
          </div>}
        </Card>

        <Card title="지도 모양">
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-bold text-ink-2">도법<HelpTip label="도법" text={projectionHelp[doc.projection]} /></p>
              <Segmented label="도법" value={doc.projection} onChange={chooseProjection} options={(["mercator", "naturalEarth", "globe"] as const).map(value => ({ value, label: projectionNames[value], title: projectionHelp[value] }))} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-bold text-ink-2">색</p>
              <Segmented label="지도 색" value={opts.theme} onChange={theme => setOptions({ theme })} options={[{ value: "color", label: "컬러" }, { value: "print", label: "흑백 인쇄용" }]} />
            </div>
            <Toggle label="나라 경계선" checked={opts.borders} onChange={borders => setOptions({ borders })} help="끄면 오늘날의 국경이 사라지고 땅 모양만 남아요. 옛 나라의 영역을 그리는 역사 수업에 알맞아요." />
          </div>
        </Card>

        <Card title="글자와 이름">
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 flex items-center justify-between text-xs font-bold text-ink-2"><span className="flex items-center gap-1">지도 글자 크기<HelpTip label="지도 글자 크기" text="나라·바다 이름과 직접 넣은 글자를 모두 한꺼번에 키우거나 줄여요. 교실 뒤에서도 보이게 하려면 150% 이상을 권해요." /></span><span className="text-brand-dark">{opts.textScale}%</span></p>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="글자 작게" onClick={() => setOptions({ textScale: Math.max(50, opts.textScale - 10) })} className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-sm font-extrabold text-ink-3 hover:text-brand-dark">가</button>
                <input type="range" min={50} max={250} step={10} value={opts.textScale} aria-label="지도 글자 크기" onChange={event => update({ ...docRef.current, options: { ...docRef.current.options, textScale: Number(event.target.value) } }, false)} onPointerDown={beginEdit} onPointerUp={endEdit} className="w-full accent-[var(--brand)]" />
                <button type="button" aria-label="글자 크게" onClick={() => setOptions({ textScale: Math.min(250, opts.textScale + 10) })} className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-lg font-extrabold text-ink-3 hover:text-brand-dark">가</button>
              </div>
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-bold text-ink-2">나라 이름<HelpTip label="나라 이름" text="‘알맞게’는 확대한 정도에 맞춰 겹치지 않는 이름만 보여요. 나라를 눌러(선택·이동 도구) 이름을 바꾸거나(예: 소련) 숨길 수 있어요." /></p>
              <Segmented label="나라 이름" value={opts.countryNames} onChange={countryNames => setOptions({ countryNames })} options={nameModes} />
            </div>
            <Toggle label="바다·섬 이름" checked={opts.placeNames} onChange={placeNames => setOptions({ placeNames })} help="대양과 동해·황해·남해 같은 바다 이름, 확대하면 울릉도·독도 같은 섬 이름을 보여요." />
          </div>
        </Card>

        <Card title="경위선">
          <Toggle label="경선·위선" checked={opts.graticule} onChange={graticule => setOptions({ graticule })} help="확대할수록 촘촘한 간격(30°→10°→5°→1°)으로 바뀌어요." />
          <Toggle label="경도·위도 숫자" checked={opts.coordLabels} onChange={coordLabels => setOptions({ coordLabels })} />
          <Toggle label="적도·회귀선·극권·본초 자오선" checked={opts.specialLines} onChange={specialLines => setOptions({ specialLines })} />
        </Card>

        <Card title="범례" help="같은 색은 나라 색칠·영역·선에 함께 쓰여요. 색마다 뜻을 적으면 지도 왼쪽 아래에 범례로 나와요." action={<Toggle label="보이기" checked={opts.legend} onChange={legend => setOptions({ legend })} />}>
          {usedColors.length === 0 ? <p className="break-keep text-xs leading-5 text-ink-4">나라를 색칠하거나 영역·선을 그리면 여기에서 색의 뜻을 적을 수 있어요.</p>
            : <div className="space-y-1.5">
              {usedColors.map(index => <label key={index} className="flex items-center gap-2">
                <span className="h-5 w-8 shrink-0 rounded border-2" style={{ background: palette[index].fill, borderColor: palette[index].ink }} aria-hidden="true" />
                <input value={doc.legend[index] ?? ""} maxLength={40} onFocus={beginEdit} onBlur={endEdit} onChange={event => update({ ...docRef.current, legend: { ...docRef.current.legend, [index]: event.target.value } }, false)} placeholder={`${palette[index].name} (예: 연합국)`} aria-label={`${palette[index].name} 범례`} className={cn(inputClass, "min-h-9")} />
              </label>)}
            </div>}
          {filledCount > 0 && <button type="button" onClick={() => update({ ...docRef.current, countries: Object.fromEntries(Object.entries(docRef.current.countries).map(([name, style]) => [name, { ...style, fill: undefined }])) })} className="mt-2 text-xs font-bold text-ink-4 underline-offset-2 hover:text-danger hover:underline">나라 색칠 모두 지우기 ({filledCount}개)</button>}
        </Card>

        <Card title="수업 활동: 이름 맞히기" help="나라 이름과 지점 이름을 가려요. 학생이 답하면 나라나 ‘?’ 표시를 눌러 하나씩 열어 보여 주세요.">
          <Toggle label="이름 가리기" checked={quiz} onChange={value => { setQuiz(value); setRevealed(new Set()); setSelection(null); setTool("move"); }} />
          {quiz && <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-brand-page px-3 py-2 text-xs font-semibold text-brand-dark">
            <span>{revealed.size}개 열었어요</span>
            <button type="button" onClick={() => setRevealed(new Set())} className="font-bold underline-offset-2 hover:underline">모두 다시 가리기</button>
          </div>}
        </Card>

        <section className="rounded-[18px] border border-dashed border-line px-4 py-3 text-xs leading-5 text-ink-4">
          <p className="mb-1 flex items-center gap-1.5 font-bold text-ink-3"><Hand size={13} /> 조작 방법</p>
          <p className="break-keep">마우스 휠·두 손가락으로 확대, 끌어서 이동해요. 단축키: {tools.map(item => `${item.key} ${item.label}`).join(" · ")} · Ctrl+Z 되돌리기 · Delete 지우기 · +/− 확대·축소</p>
        </section>
      </div>

      <div ref={stageRef} className={cn("flex min-w-0 flex-col gap-2", fullscreen ? "h-screen bg-[#1f2230] p-3" : "xl:sticky xl:top-24 xl:h-[calc(100dvh-7rem)]")}>
        <div className="rounded-[18px] border border-line bg-surface p-2 shadow-[var(--lift-1)] print:hidden">
          <div className="flex flex-wrap items-center gap-1">
            <div role="toolbar" aria-label="지도 도구" className="flex flex-wrap gap-0.5">
              {tools.map(item => <button key={item.id} type="button" aria-pressed={tool === item.id} title={`${item.label} (${item.key}) — ${item.help}`} onClick={() => setTool(item.id)}
                className={cn("flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-colors", tool === item.id ? "bg-brand text-white shadow-[0_6px_14px_rgba(86,58,194,.25)]" : "text-ink-3 hover:bg-brand-page hover:text-brand-dark")}>
                <item.icon size={15} /> <span className="hidden 2xl:inline">{item.label}</span><span className="2xl:hidden">{item.label.replace("·이동", "")}</span>
              </button>)}
            </div>
            <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
            <Button variant="ghost" size="sm" className="px-2" onClick={undo} disabled={!past.length} title="되돌리기 (Ctrl+Z)" aria-label="되돌리기"><Undo2 size={15} /></Button>
            <Button variant="ghost" size="sm" className="px-2" onClick={redo} disabled={!future.length} title="다시 하기 (Ctrl+Y)" aria-label="다시 하기"><Redo2 size={15} /></Button>
            <div className="ml-auto flex items-center gap-1">
              <span className="mr-1 hidden text-[.72rem] font-semibold text-ink-4 2xl:inline">{summary}</span>
              <MapButton label="축소 (−)" onClick={() => zoomBy(1 / 1.5)}><ZoomOut size={17} /></MapButton>
              <MapButton label="확대 (+)" onClick={() => zoomBy(1.5)}><ZoomIn size={17} /></MapButton>
              <MapButton label="처음 보기로" onClick={goHome}><LocateFixed size={17} /></MapButton>
              <MapButton label={fullscreen ? "전체 화면 끝내기" : "전체 화면 (수업용)"} onClick={toggleFullscreen}>{fullscreen ? <Minimize2 size={17} /> : <Maximize size={17} />}</MapButton>
              <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
              <Button variant="secondary" size="sm" onClick={copyPng} disabled={busy !== ""} title="지도 그림을 복사해 한글·PPT에 바로 붙여 넣어요">{busy === "copy" ? <LoaderCircle size={14} className="animate-spin" /> : <ClipboardCopy size={14} />} 그림 복사</Button>
              <Button variant="secondary" size="sm" onClick={savePng} disabled={busy !== ""} title="지도를 PNG 그림 파일로 저장해요">{busy === "png" ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} PNG 저장</Button>
              <Button variant="secondary" size="sm" onClick={() => window.print()} title="A4 가로로 인쇄해요"><Printer size={14} /> 인쇄</Button>
            </div>
          </div>
          {tool !== "move" && <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-1 pt-2">
            <Swatches value={toolStyle.color} onChange={color => setToolStyle(style => ({ ...style, color }))} />
            {tool === "marker" && <div className="w-64"><Segmented label="지점 모양" value={toolStyle.symbol} onChange={symbol => setToolStyle(style => ({ ...style, symbol }))} options={symbols.map(item => ({ value: item.id, label: item.label }))} /></div>}
            {(tool === "arrow" || tool === "line") && <>
              <div className="w-36"><Segmented label="선 모양" value={toolStyle.curved ? "curve" : "straight"} onChange={value => setToolStyle(style => ({ ...style, curved: value === "curve" }))} options={[{ value: "curve", label: "곡선" }, { value: "straight", label: "직선" }]} /></div>
              <div className="w-36"><Segmented label="선 종류" value={toolStyle.dashed ? "dash" : "solid"} onChange={value => setToolStyle(style => ({ ...style, dashed: value === "dash" }))} options={[{ value: "solid", label: "실선" }, { value: "dash", label: "점선" }]} /></div>
              <div className="w-40"><Segmented label="굵기" value={toolStyle.width} onChange={width => setToolStyle(style => ({ ...style, width }))} options={[2, 4, 7].map(value => ({ value, label: value === 2 ? "가늘게" : value === 4 ? "보통" : "굵게" }))} /></div>
            </>}
            <p className="min-w-0 flex-1 break-keep text-[.72rem] font-medium text-ink-4">{activeTool.help}</p>
          </div>}
        </div>

        <div id="social-map-print" className={cn("relative min-h-0 overflow-hidden rounded-[18px] border border-line bg-white shadow-[var(--lift-2)]", fullscreen ? "flex-1" : "aspect-[16/10] xl:aspect-auto xl:flex-1")}>
          <SocialMapCanvas doc={doc} update={update} record={record} tool={tool} toolStyle={toolStyle} selection={selection} onSelect={onSelect} quiz={quiz} revealed={revealed} onReveal={onReveal} svgRef={svgRef} />

          {(selectedNote || selectedCountry) && <div className="absolute right-3 top-3 w-[min(300px,calc(100%-24px))] rounded-2xl border border-line bg-white/97 p-3 shadow-[0_14px_40px_rgba(30,26,60,.18)] backdrop-blur print:hidden">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-extrabold text-ink">{selectedNote ? { text: "글자", marker: "지점", arrow: "화살표", line: "선", area: "영역", measure: "거리" }[selectedNote.kind] : selectedLabel}</p>
              <button type="button" aria-label="닫기" onClick={() => setSelection(null)} className="grid size-7 place-items-center rounded-lg text-ink-4 hover:bg-surface-2 hover:text-ink"><X size={15} /></button>
            </div>
            {selectedNote && <NoteEditor key={selectedNote.id} note={selectedNote} autoFocus={focusId === selectedNote.id} patch={(patch, rec) => patchNote(selectedNote.id, patch, rec)} beginEdit={beginEdit} endEdit={endEdit} onDelete={() => deleteNote(selectedNote.id)} />}
            {selectedCountry && <div className="space-y-3">
              <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">지도에 쓸 이름 (비우면 기본 이름)</span>
                <input value={doc.countries[selectedCountry]?.name ?? ""} maxLength={60} placeholder={eraCountry ? selectedLabel : countryKoreanName(selectedCountry)} onFocus={beginEdit} onBlur={endEdit} onChange={event => patchCountry(selectedCountry, { name: event.target.value || undefined }, false)} className={cn(inputClass, "min-h-9")} />
              </label>
              <div>
                <p className="mb-1 text-xs font-semibold text-ink-4">색칠</p>
                <Swatches value={doc.countries[selectedCountry]?.fill} onChange={fill => patchCountry(selectedCountry, { fill: doc.countries[selectedCountry]?.fill === fill ? undefined : fill })} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => patchCountry(selectedCountry, { hideName: !doc.countries[selectedCountry]?.hideName })}>{doc.countries[selectedCountry]?.hideName ? <><Eye size={14} /> 이름 보이기</> : <><EyeOff size={14} /> 이름 숨기기</>}</Button>
                {eraCountry && <Button variant="secondary" size="sm" onClick={() => { patchCountry(selectedCountry, { hideShape: !doc.countries[selectedCountry]?.hideShape }); setSelection(null); }}><EyeOff size={14} /> 영역 숨기기</Button>}
                {doc.countries[selectedCountry]?.at && <Button variant="ghost" size="sm" onClick={() => patchCountry(selectedCountry, { at: undefined })}>이름 자리 되돌리기</Button>}
              </div>
              <p className="break-keep text-[.7rem] leading-4 text-ink-4">나라 이름 글자를 끌면 자리를 옮길 수 있어요.{eraCountry && " 숨긴 영역은 ‘숨긴 영역 되살리기’로 다시 보여요."}</p>
            </div>}
          </div>}
          {message && <p role="status" className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-[#2b2740] px-4 py-2 text-xs font-semibold text-white shadow-lg print:hidden">{message}</p>}
        </div>
      </div>
    </section>
  </div>;
}

function NoteEditor({ note, autoFocus, patch, beginEdit, endEdit, onDelete }: { note: Annotation; autoFocus: boolean; patch: (patch: Partial<Annotation>, record?: boolean) => void; beginEdit: () => void; endEdit: () => void; onDelete: () => void }) {
  const focusRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => { if (autoFocus) { focusRef.current?.focus(); focusRef.current?.select(); } }, [autoFocus]);
  const textProps = { ref: focusRef, onFocus: beginEdit, onBlur: endEdit, className: cn(inputClass, "min-h-9") };
  return <div className="space-y-3">
    {note.kind === "text" && <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">내용 (Enter로 줄 바꿈)</span>
      <textarea {...textProps} rows={2} maxLength={200} value={note.text} onChange={event => patch({ text: event.target.value }, false)} className={cn(inputClass, "py-2")} />
    </label>}
    {note.kind !== "text" && note.kind !== "measure" && <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">{note.kind === "marker" ? "지점 이름" : note.kind === "area" ? "영역 이름 (예: 고구려)" : "설명 (예: 몽골의 침입)"}</span>
      <input {...textProps} maxLength={80} value={note.label} placeholder={note.kind === "marker" ? "예: 한성, 살수" : "비워 두면 이름 없이 그려요"} onChange={event => patch({ label: event.target.value }, false)} />
    </label>}
    {note.kind === "measure" && <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm font-bold text-ink-2">{formatDistance(distanceKm(note.points[0], note.points[1]))} <span className="text-xs font-medium text-ink-4">(대권 거리)</span></p>}
    <div><p className="mb-1 text-xs font-semibold text-ink-4">색</p><Swatches value={note.color} onChange={color => patch({ color })} /></div>
    {note.kind === "marker" && <Segmented label="지점 모양" value={note.symbol} onChange={symbol => patch({ symbol })} options={symbols.map(item => ({ value: item.id, label: item.label }))} />}
    {note.kind === "text" && <Toggle label="굵게" checked={note.bold} onChange={bold => patch({ bold })} />}
    {(note.kind === "arrow" || note.kind === "line") && <div className="grid grid-cols-2 gap-1.5">
      <Segmented label="종류" value={note.kind} onChange={kind => patch({ kind })} options={[{ value: "arrow", label: "화살표" }, { value: "line", label: "선" }]} />
      <Segmented label="선 모양" value={note.curved ? "curve" : "straight"} onChange={value => patch({ curved: value === "curve" })} options={[{ value: "curve", label: "곡선" }, { value: "straight", label: "직선" }]} />
      <Segmented label="선 종류" value={note.dashed ? "dash" : "solid"} onChange={value => patch({ dashed: value === "dash" })} options={[{ value: "solid", label: "실선" }, { value: "dash", label: "점선" }]} />
      <Segmented label="굵기" value={note.width} onChange={width => patch({ width })} options={[2, 4, 7].map(value => ({ value, label: value === 2 ? "얇게" : value === 4 ? "보통" : "굵게" }))} />
    </div>}
    <Range label="글자 크기" value={note.size} min={10} max={note.kind === "text" ? 80 : 40} suffix="px" onChange={size => patch({ size }, false)} onStart={beginEdit} onCommit={endEdit} />
    <Button variant="danger" size="sm" className="w-full" onClick={onDelete}><Trash2 size={14} /> 지우기 (Delete)</Button>
  </div>;
}
