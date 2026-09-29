"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  ArrowRight, ChevronDown, ChevronLeft, ChevronRight, CircleDot, ClipboardCopy, Cone, Download, FileCode2, FileDown, FilePlus2, Footprints, LayoutGrid, LoaderCircle,
  MousePointer2, Pause, Play, Plus, Printer, Redo2, Send, Spline, Trash2, Type, Undo2, Upload, Users, Waves, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { tacticsExamples } from "@/lib/pe-tactics/examples";
import {
  addFrame, applyFormation, arrowInfo, blankTactics, courtInfo, courtKinds, formationsFor, hitRadius, interpolate, MAX_FRAMES, MAX_ITEMS, parseTacticsDoc, removeFrame,
  removeItem, teamColors, type CourtKind, type TacticsDoc, type Team,
} from "@/lib/pe-tactics/model";
import { cn } from "@/lib/utils";
import { TacticsCanvas, type Selection, type TacticsTool } from "./pe-tactics-canvas";
import { SportGuidePanel } from "./pe-tactics-guide";
import { frameGeometry, TacticsFrameSvg, TacticsSheetSvg } from "./pe-tactics-render";
import { Card, Range, Segmented, Toggle } from "./tool-panel";

const draftKey = "learncraft_pe_tactics_draft";
const inputClass = "min-h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/10";
const speeds = { slow: { name: "느리게", move: 1800 }, normal: { name: "보통", move: 1150 }, fast: { name: "빠르게", move: 700 } } as const;
type Speed = keyof typeof speeds;
const HOLD = 450;

const tools: { id: TacticsTool; label: string; key: string; icon: typeof Users; help: string; group: "edit" | "arrow" }[] = [
  { id: "select", label: "선택", key: "V", icon: MousePointer2, group: "edit", help: "선수·공을 끌어 옮기고, 화살표를 누르면 끝점과 가운데 점을 끌어 고칠 수 있어요." },
  { id: "playerA", label: "우리 팀", key: "1", icon: Users, group: "edit", help: "누르는 자리에 우리 팀 선수를 놓아요. 번호는 차례로 붙어요." },
  { id: "playerB", label: "상대 팀", key: "2", icon: Users, group: "edit", help: "누르는 자리에 상대 팀 선수를 놓아요." },
  { id: "ball", label: "공", key: "B", icon: CircleDot, group: "edit", help: "공을 놓아요. 공은 하나라서, 다시 누르면 그 자리로 옮겨요." },
  { id: "cone", label: "콘", key: "C", icon: Cone, group: "edit", help: "연습용 콘(표지)을 놓아요." },
  { id: "text", label: "글자", key: "T", icon: Type, group: "edit", help: "누른 자리에 글자를 놓고 왼쪽에서 내용을 바꿔요." },
  { id: "run", label: "이동", key: "R", icon: Footprints, group: "arrow", help: "선수에서 시작해 달려갈 곳까지 끌어요 (실선)." },
  { id: "pass", label: "패스", key: "P", icon: Send, group: "arrow", help: "공(또는 공을 가진 선수)에서 받을 곳까지 끌어요 (점선). 선수 위에서 놓으면 그 선수에게 붙어요." },
  { id: "dribble", label: "드리블", key: "D", icon: Waves, group: "arrow", help: "공을 가진 선수에서 몰고 갈 곳까지 끌어요 (물결). 다음 단계에서 공도 함께 가요." },
  { id: "shot", label: "슛", key: "S", icon: Zap, group: "arrow", help: "공에서 골대·목표까지 끌어요 (굵은 화살표)." },
  { id: "screen", label: "스크린", key: "X", icon: ArrowRight, group: "arrow", help: "선수가 가서 막아 설 자리까지 끌어요 (끝이 T자)." },
];

function readDraft(): TacticsDoc {
  try {
    const doc = parseTacticsDoc(JSON.parse(window.localStorage.getItem(draftKey) ?? "null"));
    if (doc) return doc;
  } catch { /* 저장된 보드를 읽지 못하면 첫 예시로 시작합니다. */ }
  return tacticsExamples[0].build();
}
const fileName = (doc: TacticsDoc, extension: string, suffix = "") => `${(doc.title.trim() || `${courtInfo[doc.court].name} 전술`).replace(/[\\/:*?"<>|]+/g, " ").slice(0, 60)}${suffix ? ` (${suffix})` : ""}.${extension}`;
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function svgMarkup(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll("[data-export='skip']").forEach((node) => node.remove());
  clone.querySelectorAll("[data-item-id], [data-arrow-id]").forEach((node) => { node.removeAttribute("data-item-id"); node.removeAttribute("data-arrow-id"); node.removeAttribute("style"); });
  return new XMLSerializer().serializeToString(clone);
}
async function toPng(svg: SVGSVGElement) {
  const width = Number(svg.getAttribute("width"));
  const height = Number(svg.getAttribute("height"));
  const scale = Math.min(2, 3200 / Math.max(width, height));
  const url = URL.createObjectURL(new Blob([svgMarkup(svg)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("그림을 만들지 못했어요.")); image.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("그림을 만들지 못했어요.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("그림을 만들지 못했어요.");
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

export function PeTacticsLab() {
  const [doc, setDoc] = useState(readDraft);
  const [past, setPast] = useState<TacticsDoc[]>([]);
  const [future, setFuture] = useState<TacticsDoc[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [tool, setTool] = useState<TacticsTool>("select");
  const [selection, setSelection] = useState<Selection>(null);
  const [playing, setPlaying] = useState<{ index: number; t: number } | null>(null);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [exportView, setExportView] = useState<"frame" | "sheet" | null>(null);
  const docRef = useRef(doc);
  const editBefore = useRef<TacticsDoc | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const exportRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const current = Math.min(frameIndex, doc.frames.length - 1);
  const frame = doc.frames[current];

  const record = useCallback((before: TacticsDoc) => { setPast((list) => [...list.slice(-80), before]); setFuture([]); }, []);
  const update = useCallback((next: TacticsDoc, rec = true) => {
    if (rec && next !== docRef.current) record(docRef.current);
    docRef.current = next;
    setDoc(next);
  }, [record]);
  const beginEdit = useCallback(() => { editBefore.current ??= docRef.current; }, []);
  const endEdit = useCallback(() => { if (editBefore.current && editBefore.current !== docRef.current) record(editBefore.current); editBefore.current = null; }, [record]);
  const undo = () => { const previous = past.at(-1); if (!previous) return; setPast(past.slice(0, -1)); setFuture([docRef.current, ...future]); docRef.current = previous; setDoc(previous); setSelection(null); };
  const redo = () => { const next = future[0]; if (!next) return; setFuture(future.slice(1)); setPast([...past, docRef.current]); docRef.current = next; setDoc(next); setSelection(null); };

  useEffect(() => {
    const timer = window.setTimeout(() => { try { window.localStorage.setItem(draftKey, JSON.stringify(doc)); } catch { /* 저장 공간이 없으면 이번 화면에서만 유지합니다. */ } }, 400);
    return () => window.clearTimeout(timer);
  }, [doc]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2800);
    return () => window.clearTimeout(timer);
  }, [message]);

  /* ───── 재생 ───── */
  useEffect(() => {
    if (!playing) return;
    const move = speeds[speed].move;
    let start = performance.now() - playing.t * (move + HOLD);
    let index = playing.index;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed >= move + HOLD) {
        index += 1;
        if (index >= docRef.current.frames.length - 1) { setPlaying(null); setFrameIndex(docRef.current.frames.length - 1); return; }
        start = now;
        setFrameIndex(index);
        setPlaying({ index, t: 0 });
      } else setPlaying({ index, t: Math.min(1, elapsed / move) });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // 재생 중 t 변화로 다시 시작하지 않도록 시작·속도만 봅니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing !== null, speed]);
  const play = () => {
    if (doc.frames.length < 2) { setMessage("단계가 두 개 이상이어야 재생할 수 있어요. ‘화살표대로 다음 단계’를 눌러 보세요."); return; }
    setSelection(null);
    const from = current >= doc.frames.length - 1 ? 0 : current;
    setFrameIndex(from);
    setPlaying({ index: from, t: 0 });
  };
  const stop = () => setPlaying(null);

  const shown = playing && doc.frames[playing.index + 1]
    ? { positions: interpolate(doc.frames[playing.index].pos, doc.frames[playing.index + 1].pos, playing.t), arrows: doc.frames[playing.index].arrows, opacity: Math.max(0, 1 - playing.t * 1.4) }
    : { positions: frame.pos, arrows: frame.arrows, opacity: 1 };

  /* ───── 편집 ───── */
  const selectedItem = selection?.kind === "item" ? doc.items.find((item) => item.id === selection.id) : undefined;
  const selectedArrow = selection?.kind === "arrow" ? frame.arrows.find((item) => item.id === selection.id) : undefined;
  const patchItem = (id: string, patch: Partial<TacticsDoc["items"][number]>, rec = true) => update({ ...docRef.current, items: docRef.current.items.map((item) => item.id === id ? { ...item, ...patch } : item) }, rec);
  const patchArrow = (id: string, patch: Partial<TacticsDoc["frames"][number]["arrows"][number]>) => update({ ...docRef.current, frames: docRef.current.frames.map((item, index) => index === current ? { ...item, arrows: item.arrows.map((arrow) => arrow.id === id ? { ...arrow, ...patch } : arrow) } : item) });
  const deleteSelected = () => {
    if (selectedItem) update(removeItem(docRef.current, selectedItem.id));
    else if (selectedArrow) update({ ...docRef.current, frames: docRef.current.frames.map((item, index) => index === current ? { ...item, arrows: item.arrows.filter((arrow) => arrow.id !== selectedArrow.id) } : item) });
    setSelection(null);
  };
  const setCourt = (court: CourtKind) => {
    if (court === doc.court) return;
    update({ ...blankTactics(court), teams: doc.teams, playerSize: doc.playerSize, print: doc.print, half: courtInfo[court].halfable && doc.half });
    setFrameIndex(0); setSelection(null);
    setMessage(`${courtInfo[court].name} 경기장으로 바꿨어요. 왼쪽 ‘대형 불러오기’로 선수를 한 번에 놓을 수 있어요.`);
  };
  const loadDoc = (next: TacticsDoc, note: string) => { update(next); setFrameIndex(0); setSelection(null); setTool("select"); setPlaying(null); setMessage(note); };
  const clearBoard = () => {
    if (!confirmClear) { setConfirmClear(true); window.setTimeout(() => setConfirmClear(false), 3000); return; }
    setConfirmClear(false);
    loadDoc({ ...blankTactics(doc.court), teams: doc.teams, half: doc.half, print: doc.print, playerSize: doc.playerSize }, "새 보드를 열었어요.");
  };
  const newStep = (fromArrows: boolean) => {
    if (doc.frames.length >= MAX_FRAMES) { setMessage(`단계는 ${MAX_FRAMES}개까지 만들 수 있어요.`); return; }
    if (fromArrows && !frame.arrows.length) { setMessage("이 단계에 화살표가 없어요. 이동·패스 화살표를 먼저 그려 주세요."); return; }
    update(addFrame(docRef.current, current, fromArrows, hitRadius(doc)));
    setFrameIndex(current + 1); setSelection(null);
    setMessage(fromArrows ? "화살표대로 선수와 공을 옮긴 다음 단계를 만들었어요." : "지금 자리를 그대로 이어 받은 단계를 더했어요.");
  };
  const deleteStep = () => { if (doc.frames.length <= 1) return; update(removeFrame(docRef.current, current)); setFrameIndex(Math.max(0, current - 1)); setSelection(null); };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if ((event.ctrlKey || event.metaKey) && key === "y") { event.preventDefault(); redo(); return; }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selection) { event.preventDefault(); deleteSelected(); return; }
      if (event.key === "Escape") { if (selection) setSelection(null); else setTool("select"); return; }
      if (event.key === " ") { event.preventDefault(); if (playing) stop(); else play(); return; }
      if (event.key === "ArrowLeft" && !selection) { setFrameIndex(Math.max(0, current - 1)); return; }
      if (event.key === "ArrowRight" && !selection) { setFrameIndex(Math.min(doc.frames.length - 1, current + 1)); return; }
      const next = tools.find((item) => item.key.toLowerCase() === key);
      if (next) { setTool(next.id); if (next.id !== "select") setSelection(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ───── 내보내기 ───── */
  async function withExport<T>(view: "frame" | "sheet", run: (svg: SVGSVGElement) => Promise<T> | T) {
    flushSync(() => setExportView(view));
    try { return await run(exportRef.current!); } finally { setExportView(null); }
  }
  async function savePng(view: "frame" | "sheet") {
    setBusy(`png-${view}`);
    try { const blob = await withExport(view, toPng); download(blob, fileName(doc, "png", view === "sheet" ? "모든 단계" : doc.frames.length > 1 ? `${current + 1}단계` : "")); setMessage("PNG 그림으로 저장했어요."); }
    catch { setMessage("그림을 만들지 못했어요. 다시 시도해 주세요."); }
    finally { setBusy(""); }
  }
  async function saveSvg() {
    const markup = await withExport("frame", svgMarkup);
    download(new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${markup}`], { type: "image/svg+xml;charset=utf-8" }), fileName(doc, "svg"));
    setMessage("SVG로 저장했어요.");
  }
  async function copyPng() {
    setBusy("copy");
    try {
      if (!navigator.clipboard || typeof ClipboardItem === "undefined") throw new Error("unsupported");
      const blob = await withExport("frame", toPng);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setMessage("그림을 복사했어요. 한글·PPT·학습지에 붙여 넣으세요.");
    } catch { setMessage("이 브라우저에서는 그림 복사를 쓸 수 없어요. PNG 저장을 이용해 주세요."); }
    finally { setBusy(""); }
  }
  async function printView(view: "frame" | "sheet") {
    const markup = await withExport(view, svgMarkup);
    const popup = window.open("", "_blank", "width=900,height=800");
    if (!popup) { setMessage("팝업이 막혀 인쇄 창을 열지 못했어요."); return; }
    popup.document.title = doc.title || "전술 보드";
    popup.document.body.innerHTML = `<style>@page{margin:10mm}body{margin:0;display:flex;justify-content:center}svg{max-width:100%;height:auto}</style>${markup}`;
    popup.focus();
    popup.print();
  }
  const saveFile = () => download(new Blob([JSON.stringify(doc, null, 1)], { type: "application/json" }), fileName(doc, "tactics.json"));
  const openFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseTacticsDoc(JSON.parse(await file.text()));
      if (!parsed) throw new Error("invalid");
      loadDoc(parsed, "전술 보드 파일을 불러왔어요.");
    } catch { setMessage("전술 보드 파일(.tactics.json)이 아니거나 내용이 손상되었어요."); }
  };

  const activeTool = tools.find((item) => item.id === tool)!;
  const geometry = frameGeometry(doc);
  const info = courtInfo[doc.court];
  const count = (team: Team) => doc.items.filter((item) => item.kind === "player" && item.team === team).length;
  const courtExamples = tacticsExamples.map((example, index) => ({ ...example, index }));

  return <section className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)] xl:items-start">
    <div className="scrollbar-subtle order-2 space-y-4 xl:order-1 xl:sticky xl:top-24 xl:-m-1 xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto xl:p-1">
      {(selectedItem || selectedArrow) && <Card title={selectedArrow ? "선택한 화살표" : selectedItem!.kind === "player" ? "선택한 선수" : selectedItem!.kind === "ball" ? "선택한 공" : selectedItem!.kind === "cone" ? "선택한 콘" : "선택한 글자"}
        action={<Button variant="ghost" size="sm" onClick={deleteSelected}><Trash2 size={13} /> 지우기</Button>}>
        {selectedItem?.kind === "player" && <div className="space-y-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">번호·이름 (3글자까지는 원 안에)</span>
            <input autoFocus={focusId === selectedItem.id} value={selectedItem.label} maxLength={24} onFocus={(event) => { event.currentTarget.select(); beginEdit(); setFocusId(null); }} onBlur={endEdit} onChange={(event) => patchItem(selectedItem.id, { label: event.target.value }, false)} className={inputClass} />
          </label>
          <Segmented label="팀" value={selectedItem.team ?? "A"} onChange={(team) => patchItem(selectedItem.id, { team })} options={[{ value: "A", label: doc.teams.A.name || "우리 팀" }, { value: "B", label: doc.teams.B.name || "상대 팀" }]} />
        </div>}
        {selectedItem?.kind === "text" && <label className="block"><span className="mb-1 block text-xs font-semibold text-ink-4">글자</span>
          <input autoFocus={focusId === selectedItem.id} value={selectedItem.label} maxLength={24} onFocus={(event) => { event.currentTarget.select(); beginEdit(); setFocusId(null); }} onBlur={endEdit} onChange={(event) => patchItem(selectedItem.id, { label: event.target.value }, false)} className={inputClass} />
        </label>}
        {(selectedItem?.kind === "ball" || selectedItem?.kind === "cone") && <p className="text-[.78rem] text-ink-4">끌어서 옮기거나 Delete로 지워요.</p>}
        {selectedArrow && <div className="space-y-3">
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(arrowInfo) as (keyof typeof arrowInfo)[]).map((style) => <button key={style} type="button" aria-pressed={selectedArrow.style === style} onClick={() => patchArrow(selectedArrow.id, { style })}
              className={cn("min-h-9 rounded-lg border text-[.72rem] font-bold", selectedArrow.style === style ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface-2 text-ink-3")}>{arrowInfo[style].name}</button>)}
          </div>
          <Button variant="secondary" size="sm" className="w-full" disabled={selectedArrow.bend === 0} onClick={() => patchArrow(selectedArrow.id, { bend: 0 })}><Spline size={13} /> 곧게 펴기</Button>
          <p className="break-keep text-[.72rem] leading-5 text-ink-4">보라 점을 끌면 끝을, 흰 점을 끌면 휘어짐을 바꿔요.</p>
        </div>}
      </Card>}

      <Card title="경기장">
        <div className="grid grid-cols-3 gap-1.5">
          {courtKinds.map((court) => <button key={court} type="button" aria-pressed={doc.court === court} onClick={() => setCourt(court)}
            className={cn("min-h-10 rounded-xl border px-1 text-[.76rem] font-bold leading-tight", doc.court === court ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface-2 text-ink-3 hover:border-brand/25")}>{courtInfo[court].name.replace(" (표현 활동)", "")}</button>)}
        </div>
        <p className="mt-2 text-[.72rem] text-ink-4">{info.name} · {info.size}</p>
        <div className="mt-3 space-y-2">
          {info.halfable && <Segmented label="보기" value={doc.half ? "half" : "full"} onChange={(value) => update({ ...doc, half: value === "half" })} options={[{ value: "full", label: "전체 경기장" }, { value: "half", label: "반쪽 (왼쪽 골대)" }]} />}
          <Toggle label="인쇄용 (흰 바탕·흑백)" checked={doc.print} onChange={(print) => update({ ...doc, print })} help="잔디·코트 색을 빼고 검정 선으로 그려요. 우리 팀은 검은 원, 상대 팀은 흰 원이에요." />
          <Range label="선수 크기" value={doc.playerSize} min={10} max={30} suffix="px" onChange={(playerSize) => update({ ...docRef.current, playerSize }, false)} onStart={beginEdit} onCommit={endEdit} />
        </div>
      </Card>

      <Card title="팀">
        {(["A", "B"] as const).map((team) => <div key={team} className="mb-3 last:mb-0">
          <div className="flex items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-white text-[.7rem] font-extrabold shadow" style={{ background: doc.teams[team].color, color: teamColors.find((item) => item.value === doc.teams[team].color)?.text }}>{team === "A" ? "우" : "상"}</span>
            <input aria-label={`${team === "A" ? "우리" : "상대"} 팀 이름`} value={doc.teams[team].name} maxLength={12} onChange={(event) => update({ ...docRef.current, teams: { ...docRef.current.teams, [team]: { ...docRef.current.teams[team], name: event.target.value } } }, false)} className={cn(inputClass, "min-h-9")} />
            <span className="shrink-0 text-[.72rem] font-bold text-ink-4">{count(team)}명</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1 pl-9">
            {teamColors.map((color) => <button key={color.value} type="button" title={color.name} aria-label={`${color.name}으로`} aria-pressed={doc.teams[team].color === color.value}
              onClick={() => update({ ...doc, teams: { ...doc.teams, [team]: { ...doc.teams[team], color: color.value } } })}
              className={cn("size-6 rounded-full border", doc.teams[team].color === color.value ? "ring-2 ring-brand ring-offset-1" : "border-line")} style={{ background: color.value }} />)}
          </div>
        </div>)}
      </Card>

      <Card title="대형 불러오기" help="선수 수를 대형에 맞추고 지금 단계부터 자리를 바꿔요. 상대 팀은 전체 보기에서 반대편에 놓여요.">
        {formationsFor(doc.court).length ? <div className="space-y-1.5">
          {formationsFor(doc.court).map((formation) => <div key={formation.id} className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 py-1 pl-3 pr-1">
            <span className="min-w-0 flex-1 truncate text-[.78rem] font-bold text-ink-2">{formation.name} <span className="font-semibold text-ink-4">· {formation.points.length}명</span></span>
            <Button variant="ghost" size="sm" className="px-2 text-[.72rem]" onClick={() => { update(applyFormation(docRef.current, current, "A", formation)); setMessage(`우리 팀을 ${formation.name}(으)로 놓았어요.`); }}>우리</Button>
            <Button variant="ghost" size="sm" className="px-2 text-[.72rem]" onClick={() => { update(applyFormation(docRef.current, current, "B", formation)); setMessage(`상대 팀을 ${formation.name}(으)로 놓았어요.`); }}>상대</Button>
          </div>)}
        </div> : <p className="text-[.78rem] text-ink-4">이 경기장에는 준비된 대형이 없어요.</p>}
      </Card>

      <Card title="보드 정보" action={<Button variant={confirmClear ? "danger" : "ghost"} size="sm" className="whitespace-nowrap" onClick={clearBoard}><FilePlus2 size={14} /> {confirmClear ? "한 번 더 누르면 지워요" : "새 보드"}</Button>}>
        <label className="relative mb-3 block">
          <select aria-label="수업 예시 불러오기" value="" onChange={(event) => { const example = tacticsExamples[Number(event.target.value)]; if (example) loadDoc(example.build(), `‘${example.name}’ 예시를 불러왔어요. ▶ 재생을 눌러 보세요.`); }}
            className="min-h-10 w-full appearance-none truncate rounded-xl border border-line bg-surface py-2 pl-3 pr-8 text-[.82rem] font-semibold text-ink-3 hover:border-brand/30">
            <option value="" disabled>수업 예시 불러오기 ({tacticsExamples.length}개)</option>
            {courtKinds.filter((court) => courtExamples.some((example) => example.court === court)).map((court) => <optgroup key={court} label={courtInfo[court].name}>
              {courtExamples.filter((example) => example.court === court).map((example) => <option key={example.index} value={example.index}>{example.name}</option>)}
            </optgroup>)}
          </select>
          <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-4" />
        </label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-ink-4">제목 (그림 위에 쓰이고 파일 이름이 돼요)</span>
          <input value={doc.title} maxLength={80} onFocus={beginEdit} onBlur={endEdit} onChange={(event) => update({ ...docRef.current, title: event.target.value }, false)} placeholder="예: 농구 · 픽 앤 롤" className={inputClass} />
        </label>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={saveFile} title="다시 고칠 수 있는 보드 파일로 저장해요."><FileDown size={14} /> 보드 파일 저장</Button>
          <Button variant="secondary" size="sm" className="flex-1" onClick={() => fileRef.current?.click()}><Upload size={14} /> 불러오기</Button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => { void openFile(event.target.files?.[0]); event.target.value = ""; }} />
        </div>
      </Card>
    </div>

    <div className="order-1 min-w-0 space-y-3 xl:order-2">
      <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-line bg-surface p-2 shadow-[var(--lift-1)]">
        <div role="toolbar" aria-label="보드 도구" className="flex flex-wrap items-center gap-1">
          {tools.map((item, index) => <span key={item.id} className="contents">
            {index > 0 && tools[index - 1].group !== item.group && <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />}
            <button type="button" aria-pressed={tool === item.id} title={`${item.label} (${item.key})`} disabled={Boolean(playing)} onClick={() => { setTool(item.id); if (item.id !== "select") setSelection(null); }}
              className={cn("flex min-h-10 items-center gap-1.5 rounded-xl px-2.5 text-[.8rem] font-bold transition-colors disabled:opacity-50", tool === item.id ? "bg-brand-soft text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:bg-surface-2 hover:text-brand-dark")}>
              {item.id === "playerA" || item.id === "playerB"
                ? <span className="size-3.5 rounded-full border border-white shadow" style={{ background: doc.teams[item.id === "playerA" ? "A" : "B"].color }} />
                : <item.icon size={16} aria-hidden="true" />}
              {item.label}<kbd className="hidden rounded bg-surface-2 px-1 text-[.62rem] font-semibold text-ink-4 2xl:inline">{item.key}</kbd>
            </button>
          </span>)}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" className="px-2" onClick={undo} disabled={!past.length} title="되돌리기 (Ctrl+Z)" aria-label="되돌리기"><Undo2 size={15} /></Button>
          <Button variant="ghost" size="sm" className="px-2" onClick={redo} disabled={!future.length} title="다시 하기 (Ctrl+Y)" aria-label="다시 하기"><Redo2 size={15} /></Button>
          <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
          <Button variant="secondary" size="sm" onClick={() => void savePng("frame")} disabled={busy !== ""}>{busy === "png-frame" ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} PNG</Button>
          <Button variant="secondary" size="sm" onClick={() => void saveSvg()}><FileCode2 size={14} /> SVG</Button>
          <Button variant="secondary" size="sm" onClick={() => void copyPng()} disabled={busy !== ""} title="지금 단계 그림을 복사해 한글·PPT에 붙여 넣어요">{busy === "copy" ? <LoaderCircle size={14} className="animate-spin" /> : <ClipboardCopy size={14} />} 복사</Button>
          <Button variant="ghost" size="sm" className="px-2" onClick={() => void printView("frame")} title="지금 단계 인쇄" aria-label="지금 단계 인쇄"><Printer size={15} /></Button>
        </div>
      </div>
      <p className="min-h-6 break-keep px-1 text-[.78rem] leading-6 text-ink-4"><b className="text-ink-2">{activeTool.label}</b> · {activeTool.help}</p>

      {/* 반쪽 경기장처럼 세로로 긴 보드도 한 화면에 들어오게 화면 높이에 맞춰 너비를 줄입니다. */}
      <div className="mx-auto overflow-hidden rounded-[18px] border border-line bg-white shadow-[var(--lift-1)]" style={{ maxWidth: `min(100%, calc((100dvh - 15rem) * ${(geometry.width / geometry.height).toFixed(3)}))` }}>
        <TacticsCanvas doc={doc} frameIndex={current} positions={shown.positions} arrows={shown.arrows} arrowOpacity={shown.opacity} tool={tool} selection={selection} playing={Boolean(playing)} svgRef={svgRef}
          onSelect={setSelection} onChange={update} beginEdit={beginEdit} endEdit={endEdit}
          onAdded={(item) => { if (item.kind === "text") setFocusId(item.id); }} />
      </div>

      <div className="rounded-[18px] border border-line bg-surface p-3 shadow-[var(--lift-1)]">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={playing ? "secondary" : "primary"} size="sm" onClick={playing ? stop : play} title="처음부터(또는 지금 단계부터) 차례로 움직여요 (Space)">{playing ? <><Pause size={14} /> 멈춤</> : <><Play size={14} /> 재생</>}</Button>
          <select aria-label="재생 빠르기" value={speed} onChange={(event) => setSpeed(event.target.value as Speed)} className="min-h-9 rounded-lg border border-line bg-surface px-2 text-xs font-semibold text-ink-3">
            {(Object.keys(speeds) as Speed[]).map((key) => <option key={key} value={key}>{speeds[key].name}</option>)}
          </select>
          <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
          <Button variant="ghost" size="sm" className="px-2" disabled={current === 0 || Boolean(playing)} onClick={() => { setFrameIndex(current - 1); setSelection(null); }} aria-label="앞 단계"><ChevronLeft size={16} /></Button>
          <div role="tablist" aria-label="단계" className="flex flex-wrap gap-1">
            {doc.frames.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={index === current} disabled={Boolean(playing)} onClick={() => { setFrameIndex(index); setSelection(null); }}
              className={cn("min-h-9 min-w-9 rounded-lg border px-2.5 text-[.8rem] font-extrabold", index === current ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface-2 text-ink-3 hover:border-brand/25")}>{index + 1}<span className="ml-0.5 text-[.66rem] font-bold">단계</span></button>)}
          </div>
          <Button variant="ghost" size="sm" className="px-2" disabled={current >= doc.frames.length - 1 || Boolean(playing)} onClick={() => { setFrameIndex(current + 1); setSelection(null); }} aria-label="다음 단계"><ChevronRight size={16} /></Button>
          <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />
          <Button variant="secondary" size="sm" disabled={Boolean(playing) || doc.frames.length >= MAX_FRAMES} onClick={() => newStep(true)} title="지금 단계의 화살표대로 선수·공을 옮긴 다음 단계를 만들어요"><ArrowRight size={14} /> 화살표대로 다음 단계</Button>
          <Button variant="ghost" size="sm" disabled={Boolean(playing) || doc.frames.length >= MAX_FRAMES} onClick={() => newStep(false)} title="자리를 그대로 이어 받은 단계를 뒤에 더해요"><Plus size={14} /> 빈 단계</Button>
          <Button variant="ghost" size="sm" className="px-2" disabled={Boolean(playing) || doc.frames.length <= 1} onClick={deleteStep} title="지금 단계 지우기" aria-label="지금 단계 지우기"><Trash2 size={14} /></Button>
        </div>
        <label className="mt-3 flex items-center gap-2">
          <span className="shrink-0 text-xs font-bold text-ink-3">{current + 1}단계 설명</span>
          <input value={frame.note} maxLength={200} disabled={Boolean(playing)} onFocus={beginEdit} onBlur={endEdit}
            onChange={(event) => update({ ...docRef.current, frames: docRef.current.frames.map((item, index) => index === current ? { ...item, note: event.target.value } : item) }, false)}
            placeholder="예: 10번이 9번에게 패스하고 수비 뒤로 뛰어 들어가요." className={cn(inputClass, "min-h-9")} />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-xs font-bold text-ink-3"><LayoutGrid size={13} className="mr-1 inline" />모든 단계 한 장으로 (학습지)</span>
          <Button variant="secondary" size="sm" onClick={() => void savePng("sheet")} disabled={busy !== ""}>{busy === "png-sheet" ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />} PNG</Button>
          <Button variant="ghost" size="sm" onClick={() => void printView("sheet")}><Printer size={14} /> 인쇄</Button>
          <span className="ml-auto text-[.72rem] text-ink-5">선수 {doc.items.filter((item) => item.kind === "player").length}명 · 항목 {doc.items.length}/{MAX_ITEMS} · 단계 {doc.frames.length}/{MAX_FRAMES}</span>
        </div>
      </div>
      <p role="status" className="min-h-5 px-1 text-[.8rem] font-semibold text-brand-dark">{message}</p>
      <SportGuidePanel court={doc.court} examples={courtExamples.filter((example) => example.court === doc.court)} onMessage={setMessage}
        onLoadExample={(index) => { const example = tacticsExamples[index]; loadDoc(example.build(), `‘${example.name}’ 예시를 불러왔어요. ▶ 재생을 눌러 보세요.`); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      <p className="px-1 text-[.72rem] leading-5 text-ink-5">단축키: 재생 Space · 단계 이동 ←→ · 되돌리기 Ctrl+Z · 지우기 Delete · 도구 V 1 2 B C T / R P D S X</p>
    </div>

    {exportView && <div aria-hidden="true" className="pointer-events-none fixed -left-[99999px] top-0">
      {exportView === "sheet" ? <TacticsSheetSvg doc={doc} svgRef={exportRef} /> : <TacticsFrameSvg doc={doc} frameIndex={current} svgRef={exportRef} />}
    </div>}
  </section>;
}
