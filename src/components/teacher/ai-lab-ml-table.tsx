"use client";

import { useEffect, useRef, type ClipboardEvent, type FocusEvent, type KeyboardEvent } from "react";
import { ClipboardCopy, FileDown, Hash, Plus, Table2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { classColors, clusterColors, type DataPoint, type Line } from "@/lib/ai-lab/ml";
import { round } from "@/lib/ai-lab/random";
import { applyPastedRows, inRange, parseNumber, parsePastedTable, toCsv, toTsv, VALUE_LIMIT } from "@/lib/ai-lab/table";
import { cn } from "@/lib/utils";

type Column = "x" | "y";
const LIMIT = 150;
const cellClass = "h-8 w-28 min-w-[4.5rem] rounded-md border border-transparent bg-transparent px-2 text-right font-mono text-[.84rem] tabular-nums text-ink outline-none transition-colors hover:border-line focus:border-brand/50 focus:bg-white";

/**
 * 지도·비지도학습 체험의 데이터 표. 그래프의 점과 같은 자료를 숫자로 보고 고칩니다.
 * 엑셀에서 복사한 여러 줄을 칸에 붙여 넣으면 그 줄부터 채우고, 모자라면 새 줄을 더합니다.
 */
export function MlDataTable({ points, onChange, mode, labels, xLabel, yLabel, line, assignment, hover, onHover, showNumbers, onShowNumbers, onMessage, fill = false }: {
  points: DataPoint[];
  onChange: (points: DataPoint[]) => void;
  mode: "regression" | "classification" | "clustering";
  labels: readonly string[];
  xLabel: string;
  yLabel: string;
  line: Line | null;
  assignment: number[] | null;
  hover: number | null;
  onHover: (index: number | null) => void;
  showNumbers: boolean;
  onShowNumbers: (value: boolean) => void;
  onMessage: (text: string) => void;
  /** 팝업처럼 높이가 정해진 곳에서는 남은 높이를 모두 채우고 그 안에서 스크롤합니다. */
  fill?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverFromTable = useRef(false);
  const withLabel = mode === "classification";

  // 그래프에서 점을 가리키면 표 안에서만 그 줄이 보이게 스크롤합니다(페이지는 움직이지 않음).
  useEffect(() => {
    if (hover === null || hoverFromTable.current) return;
    const container = containerRef.current;
    const row = container?.querySelector<HTMLTableRowElement>(`[data-row="${hover}"]`);
    if (!container || !row) return;
    const top = row.offsetTop - 34;
    if (top < container.scrollTop) container.scrollTop = top;
    else if (row.offsetTop + row.offsetHeight > container.scrollTop + container.clientHeight) container.scrollTop = row.offsetTop + row.offsetHeight - container.clientHeight;
  }, [hover]);

  function focusCell(row: number, column: Column) {
    requestAnimationFrame(() => containerRef.current?.querySelector<HTMLInputElement>(`[data-cell="${row}-${column}"]`)?.focus());
  }

  function commit(index: number, column: Column, input: HTMLInputElement) {
    const current = points[index];
    if (!current) return;
    const value = parseNumber(input.value);
    if (value === null || !inRange(value)) {
      input.value = String(current[column]);
      if (value !== current[column]) onMessage(value === null ? "숫자만 넣을 수 있어요." : `값은 ±${VALUE_LIMIT.toLocaleString("ko-KR")} 안에서 넣어 주세요.`);
      return;
    }
    const rounded = round(value, 4);
    if (rounded === current[column]) { input.value = String(rounded); return; }
    onChange(points.map((point, i) => i === index ? { ...point, [column]: rounded } : point));
  }

  function commitNewRow() {
    const container = containerRef.current;
    const xInput = container?.querySelector<HTMLInputElement>("[data-new='x']");
    const yInput = container?.querySelector<HTMLInputElement>("[data-new='y']");
    const labelInput = container?.querySelector<HTMLSelectElement>("[data-new='label']");
    if (!xInput || !yInput) return;
    const x = parseNumber(xInput.value);
    const y = parseNumber(yInput.value);
    if (x === null || y === null) return;
    if (!inRange(x) || !inRange(y)) { onMessage(`값은 ±${VALUE_LIMIT.toLocaleString("ko-KR")} 안에서 넣어 주세요.`); return; }
    if (points.length >= LIMIT) { onMessage(`자료는 ${LIMIT}줄까지 넣을 수 있어요.`); return; }
    onChange([...points, { x: round(x, 4), y: round(y, 4), label: withLabel ? Number(labelInput?.value ?? 0) : 0 }]);
    xInput.value = "";
    yInput.value = "";
    requestAnimationFrame(() => xInput.focus());
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number, column: Column) {
    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      commit(index, column, event.currentTarget);
      if (index + 1 < points.length) focusCell(index + 1, column);
      else containerRef.current?.querySelector<HTMLInputElement>(`[data-new='${column}']`)?.focus();
    } else if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      commit(index, column, event.currentTarget);
      focusCell(index - 1, column);
    } else if (event.key === "Escape") {
      event.currentTarget.value = String(points[index][column]);
      event.currentTarget.blur();
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>, start: number, column: Column) {
    const text = event.clipboardData.getData("text");
    if (!/[\t\n,]/.test(text.trim())) return;
    event.preventDefault();
    const parsed = parsePastedTable(text, labels, withLabel);
    const singleColumn = parsed.columns <= 1 ? column : null;
    const result = applyPastedRows(points, parsed.rows, start, singleColumn, LIMIT);
    if (!result.added && !result.changed) { onMessage("붙여 넣은 내용에서 숫자 자료를 찾지 못했어요. x, y 순서의 두 열을 복사해 주세요."); return; }
    onChange(result.points);
    const notes = [
      result.added ? `새 줄 ${result.added}개` : "", result.changed ? `고친 줄 ${result.changed}개` : "",
      parsed.skippedHeader ? "첫 줄은 제목으로 보고 건너뜀" : "",
      parsed.outOfRange ? `너무 큰 값 ${parsed.outOfRange}개 건너뜀` : "",
      parsed.invalid ? `읽지 못한 칸 ${parsed.invalid}개` : "",
    ].filter(Boolean);
    onMessage(`붙여 넣었어요: ${notes.join(", ")}.`);
  }

  async function copyTable() {
    const headers = [xLabel, yLabel, ...(withLabel ? ["무리"] : [])];
    try {
      await navigator.clipboard.writeText(toTsv(points, headers, withLabel ? labels : null));
      onMessage("표를 복사했어요. 엑셀이나 구글 시트에 붙여 넣으세요.");
    } catch { onMessage("이 브라우저에서는 복사를 쓸 수 없어요. CSV 저장을 이용해 주세요."); }
  }
  function saveCsv() {
    const headers = [xLabel, yLabel, ...(withLabel ? ["무리"] : [])];
    const url = URL.createObjectURL(new Blob([toCsv(points, headers, withLabel ? labels : null)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "기계학습 자료.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const leaveRow = (event: FocusEvent<HTMLInputElement>, index: number, column: Column) => commit(index, column, event.currentTarget);

  return <section className={cn("rounded-[18px] border border-line bg-surface shadow-[var(--lift-1)]", fill && "flex min-h-0 flex-col")}>
    <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
      <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-ink"><Table2 size={16} className="text-brand" /> 데이터 표 <span className="font-semibold text-ink-4">{points.length}줄</span></h2>
      <div className="ml-auto flex flex-wrap gap-1.5">
        <Button variant={showNumbers ? "primary" : "ghost"} size="sm" onClick={() => onShowNumbers(!showNumbers)} aria-pressed={showNumbers} title="그래프의 점 옆에 표의 줄 번호를 보여 줘요"><Hash size={14} /> 점 번호</Button>
        <Button variant="secondary" size="sm" onClick={() => void copyTable()} disabled={!points.length} title="엑셀·구글 시트에 붙여 넣을 수 있게 복사해요"><ClipboardCopy size={14} /> 표 복사</Button>
        <Button variant="secondary" size="sm" onClick={saveCsv} disabled={!points.length}><FileDown size={14} /> CSV</Button>
      </div>
    </div>
    <p className="break-keep px-4 pt-2 text-[.74rem] leading-5 text-ink-4">엑셀처럼 칸을 눌러 숫자를 바로 쓰고 고쳐요. 맨 아래 빈 줄에 x·y를 쓰고 Enter를 누르면 새 줄이 생기고, 그래프에도 바로 점이 찍혀요. 키 170, 점수 85처럼 실제 값을 그대로 넣으면 축이 값에 맞춰 늘어나요(엑셀에서 복사한 표를 칸에 붙여 넣어도 돼요).</p>
    <div ref={containerRef} className={cn("scrollbar-subtle relative mt-2 overflow-auto px-2 pb-2", fill ? "min-h-0 flex-1" : "max-h-[420px]")} onMouseLeave={() => { hoverFromTable.current = false; onHover(null); }}>
      <table className="w-auto min-w-[min(100%,34rem)] border-separate border-spacing-0 text-[.8rem]">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="text-left text-[.72rem] text-ink-4">
            <th className="w-10 border-b border-line px-2 py-2 font-bold">번호</th>
            <th className="border-b border-line px-2 py-2 text-right font-bold">x · {xLabel}</th>
            <th className="border-b border-line px-2 py-2 text-right font-bold">y · {yLabel}</th>
            {withLabel && <th className="border-b border-line px-2 py-2 font-bold">무리</th>}
            {mode === "regression" && <><th className="border-b border-line px-2 py-2 text-right font-bold" title="지금 직선이 예측한 값">예측값 ŷ</th><th className="border-b border-line px-2 py-2 text-right font-bold" title="실제값 − 예측값">잔차 y − ŷ</th></>}
            {mode === "clustering" && <th className="border-b border-line px-2 py-2 font-bold">배정된 무리</th>}
            <th className="w-9 border-b border-line" aria-label="지우기" />
          </tr>
        </thead>
        <tbody>
          {points.map((point, index) => {
            const predicted = line ? line.slope * point.x + line.intercept : null;
            const residual = predicted === null ? null : point.y - predicted;
            const cluster = assignment?.[index] ?? -1;
            return <tr key={index} data-row={index} onMouseEnter={() => { hoverFromTable.current = true; onHover(index); }}
              className={cn("transition-colors", hover === index ? "bg-brand-soft" : index % 2 ? "bg-surface-2/60" : "")}>
              <td className="px-2 py-0.5 font-mono text-[.74rem] text-ink-4">{index + 1}</td>
              {(["x", "y"] as const).map((column) => <td key={column} className="px-1 py-0.5">
                <input key={`${index}-${column}-${point[column]}`} data-cell={`${index}-${column}`} defaultValue={point[column]} inputMode="decimal" aria-label={`${index + 1}번 ${column}`}
                  onFocus={(event) => event.currentTarget.select()}
                  onBlur={(event) => leaveRow(event, index, column)} onKeyDown={(event) => onKeyDown(event, index, column)} onPaste={(event) => onPaste(event, index, column)} className={cellClass} />
              </td>)}
              {withLabel && <td className="px-1 py-0.5">
                <select value={point.label} aria-label={`${index + 1}번 무리`} onChange={(event) => onChange(points.map((item, i) => i === index ? { ...item, label: Number(event.target.value) } : item))}
                  className="h-8 w-full min-w-[6.5rem] rounded-md border border-transparent bg-transparent px-1.5 text-[.8rem] font-semibold outline-none hover:border-line focus:border-brand/50" style={{ color: classColors[point.label] }}>
                  {labels.map((name, value) => <option key={name} value={value}>{name}</option>)}
                </select>
              </td>}
              {mode === "regression" && <>
                <td className="px-2 py-0.5 text-right font-mono tabular-nums text-brand-dark">{predicted === null ? "-" : round(predicted)}</td>
                <td className={cn("px-2 py-0.5 text-right font-mono tabular-nums", residual === null ? "text-ink-4" : residual >= 0 ? "text-[#c92a2a]" : "text-[#1864ab]")}>{residual === null ? "-" : `${residual >= 0 ? "+" : ""}${round(residual)}`}</td>
              </>}
              {mode === "clustering" && <td className="px-2 py-0.5">{cluster >= 0 ? <span className="flex items-center gap-1.5 font-semibold text-ink-2"><span className="size-2.5 rounded-full" style={{ background: clusterColors[cluster % clusterColors.length] }} />무리 {cluster + 1}</span> : <span className="text-ink-5">-</span>}</td>}
              <td className="px-1 py-0.5 text-right">
                <button type="button" aria-label={`${index + 1}번 줄 지우기`} onClick={() => onChange(points.filter((_, i) => i !== index))} className="grid size-7 place-items-center rounded-md text-ink-4 hover:bg-[var(--danger-page)] hover:text-danger"><Trash2 size={13} /></button>
              </td>
            </tr>;
          })}
          {points.length < LIMIT && <tr className="bg-brand-page/50">
            <td className="px-2 py-1 text-brand"><Plus size={13} aria-label="새 줄" /></td>
            {(["x", "y"] as const).map((column) => <td key={column} className="px-1 py-1">
              <input data-new={column} inputMode="decimal" placeholder={column === "x" ? "새 x" : "새 y"} aria-label={`새 줄 ${column}`}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (column === "x") containerRef.current?.querySelector<HTMLInputElement>("[data-new='y']")?.focus(); else commitNewRow(); } }}
                onBlur={() => requestAnimationFrame(() => { if (!containerRef.current?.contains(document.activeElement) || !document.activeElement?.hasAttribute("data-new")) commitNewRow(); })}
                onPaste={(event) => onPaste(event, points.length, column)}
                className={cn(cellClass, "border-dashed border-brand/25 bg-white/70 placeholder:text-ink-5")} />
            </td>)}
            {withLabel && <td className="px-1 py-1">
              <select data-new="label" defaultValue={0} aria-label="새 줄 무리" className="h-8 w-full min-w-[6.5rem] rounded-md border border-dashed border-brand/25 bg-white/70 px-1.5 text-[.8rem] font-semibold outline-none">
                {labels.map((name, value) => <option key={name} value={value}>{name}</option>)}
              </select>
            </td>}
            {mode === "regression" && <td colSpan={2} className="px-2 text-[.72rem] text-ink-4">x와 y를 넣고 Enter</td>}
            {mode === "clustering" && <td className="px-2 text-[.72rem] text-ink-4">x와 y를 넣고 Enter</td>}
            <td />
          </tr>}
        </tbody>
      </table>
      {!points.length && <p className="px-2 py-3 text-center text-[.78rem] text-ink-4">자료가 없어요. 위 칸에 숫자를 넣거나 엑셀 표를 붙여 넣으세요.</p>}
    </div>
  </section>;
}
