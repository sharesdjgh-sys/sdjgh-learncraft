"use client";

import { useState } from "react";
import { AlertTriangle, ClipboardCheck, Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildWorksheet, plainText, sheetTypeKeys, sheetTypes, worksheetHtml, worksheetText, type SheetType } from "@/features/hanmun/content";
import { Card, Toggle } from "./tool-panel";
import type { EditableSentence } from "./hanmun-sentence";

export type SheetSettings = { types: SheetType[]; withHyeonto: boolean; answers: boolean };

export async function copyToClipboard({ text, html }: { text: string; html: string }) {
  // HTML로 복사하면 한글·워드에 붙여 넣을 때 표와 보기 상자가 유지됩니다.
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" }) })]);
      return;
    } catch { /* 일반 텍스트 복사로 넘어갑니다. */ }
  }
  await navigator.clipboard.writeText(text);
}

const printStyle = (id: string) => `@media print{body *:not(:has(#${id})):not(#${id}):not(#${id} *){display:none!important}body *:has(#${id}),#${id}{display:block!important;position:static!important;height:auto!important;max-height:none!important;overflow:visible!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;max-width:none!important;background:#fff!important}@page{size:A4;margin:15mm}}`;

/** A4 모양으로 미리 보여 주고, 인쇄하면 이 부분만 나오게 합니다. html은 만드는 쪽에서 모든 글을 이스케이프합니다. */
export function PrintablePage({ id, html }: { id: string; html: string }) {
  return (
    <div className="overflow-x-auto rounded-[18px] border border-line bg-surface-2 p-3 sm:p-5">
      <style>{printStyle(id)}</style>
      <div id={id} className="font-learning mx-auto max-w-[210mm] bg-white px-[12mm] py-[12mm] text-[11pt] leading-[1.6] text-black shadow-[var(--lift-1)]" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/** 검토한 풀이로 학습지를 만듭니다. 학습지는 AI를 다시 부르지 않고 저장된 풀이로만 만듭니다. */
export function HanmunSheet({ title, sentences, skip, settings, onSkip, onSettings }: {
  title: string; sentences: EditableSentence[]; skip: string[]; settings: SheetSettings;
  onSkip: (skip: string[]) => void; onSettings: (settings: SheetSettings) => void;
}) {
  const [copied, setCopied] = useState(false);
  const chosen = sentences.filter(sentence => !skip.includes(sentence.id));
  const sections = buildWorksheet(chosen, settings);
  const options = { title, answers: settings.answers };
  const unchecked = chosen.filter(sentence => !sentence.checked).length;
  const toggleType = (type: SheetType) => onSettings({ ...settings, types: settings.types.includes(type) ? settings.types.filter(item => item !== type) : [...settings.types, type] });
  const missing = settings.types.filter(type => !sections.some(section => section.type === type));

  async function copy() {
    await copyToClipboard({ text: worksheetText(sections, options), html: worksheetHtml(sections, options, "clipboard") });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const chipClass = (active: boolean) => cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-[.82rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand",
    active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark");

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
      <div className="space-y-4">
        <Card title="문항 유형" help="고른 유형마다 문항 묶음이 하나씩 생깁니다. 풀이 순서는 순서를 적은 짧은 문장만, 허사 빈칸은 허사로 표시한 어휘가 있는 문장만 들어갑니다.">
          <div className="flex flex-wrap gap-1.5">
            {sheetTypeKeys.map(type => <button key={type} type="button" aria-pressed={settings.types.includes(type)} onClick={() => toggleType(type)} className={chipClass(settings.types.includes(type))}>{sheetTypes[type].label}</button>)}
          </div>
          <div className="mt-3 border-t border-line pt-2">
            <Toggle label="문제에 토 달기" checked={settings.withHyeonto} onChange={withHyeonto => onSettings({ ...settings, withHyeonto })} help="끄면 토 없는 백문으로 냅니다. 끊어 읽기 문항은 늘 백문입니다." />
            <Toggle label="정답지 붙이기" checked={settings.answers} onChange={answers => onSettings({ ...settings, answers })} help="인쇄하면 정답은 새 쪽에서 시작합니다." />
          </div>
        </Card>
        <Card title="넣을 문장" action={
          <div className="flex gap-1">
            <button type="button" onClick={() => onSkip([])} className="rounded-lg px-2 py-1 text-xs font-bold text-ink-3 hover:bg-brand-page hover:text-brand-dark">모두</button>
            <button type="button" onClick={() => onSkip(sentences.filter(sentence => !sentence.checked).map(sentence => sentence.id))} className="rounded-lg px-2 py-1 text-xs font-bold text-ink-3 hover:bg-brand-page hover:text-brand-dark">검토 완료만</button>
          </div>
        }>
          <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {sentences.map((sentence, index) => (
              <li key={sentence.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-surface-2">
                  <input type="checkbox" className="mt-1.5 accent-[var(--brand)]" checked={!skip.includes(sentence.id)}
                    onChange={event => onSkip(event.target.checked ? skip.filter(id => id !== sentence.id) : [...skip, sentence.id])} />
                  <span className="min-w-0">
                    <span className="font-learning block truncate text-[.95rem] text-ink">{index + 1}. {plainText(sentence.hyeonto)}</span>
                    {!sentence.checked && <span className="text-[.7rem] font-bold text-warn">검토 전</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[.8rem] font-semibold text-ink-4">문장 {chosen.length}개 · 문항 {sections.reduce((sum, section) => sum + section.items.length, 0)}개</p>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="secondary" size="sm" disabled={!sections.length} onClick={() => void copy()} title="한글·워드에 붙여 넣을 수 있게 복사해요">{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "한글에 붙여 넣기용 복사"}</Button>
            <Button variant="secondary" size="sm" disabled={!sections.length} onClick={() => window.print()} title="A4 세로로 인쇄해요"><Printer size={15} /> 인쇄</Button>
          </div>
        </div>
        {unchecked > 0 && sections.length > 0 && <p className="flex items-center gap-2 rounded-xl border border-warn/25 bg-[var(--warn-page)] px-3.5 py-2.5 text-[.82rem] font-semibold text-warn"><AlertTriangle size={15} /> 검토하지 않은 문장 {unchecked}개가 들어 있어요. AI 풀이는 틀릴 수 있으니 확인한 뒤 나눠 주세요.</p>}
        {missing.length > 0 && chosen.length > 0 && <p className="text-[.8rem] font-semibold text-ink-4">{missing.map(type => sheetTypes[type].label).join(", ")}: 고른 문장으로 만들 문항이 없어요.</p>}
        {sections.length ? (
          <PrintablePage id="hanmun-sheet-print" html={worksheetHtml(sections, options, "screen")} />
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface-2 px-6 text-center text-[.9rem] text-ink-3">
            <p className="font-bold text-ink-2">문항 유형과 문장을 골라 주세요.</p>
            <p>풀이에 독음·직역·풀이 순서·허사가 있어야 해당 문항이 만들어져요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
