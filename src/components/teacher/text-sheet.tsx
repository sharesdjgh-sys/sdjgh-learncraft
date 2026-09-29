"use client";

import { useState } from "react";
import { AlertTriangle, ClipboardCheck, Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { objectParticle } from "@/features/language-sheet";
import { buildWorksheet, plainOf, sheetType, sheetTypeKeys, worksheetHtml, worksheetText, type SheetType, type TextProfile } from "@/features/study-text/core";
import { Card, Toggle } from "./tool-panel";
import { copyToClipboard, PrintablePage } from "./hanmun-sheet";
import type { EditableSentence } from "./text-sentence";

export type SheetSettings = { types: SheetType[]; ruby: boolean; spaced: boolean; answers: boolean };

/** 검토한 풀이로 학습지를 만듭니다. 학습지는 AI를 다시 부르지 않고 저장된 풀이로만 만듭니다. */
export function StudyTextSheet({ profile, title, sentences, skip, settings, onSkip, onSettings }: {
  profile: TextProfile; title: string; sentences: EditableSentence[]; skip: string[]; settings: SheetSettings;
  onSkip: (skip: string[]) => void; onSettings: (settings: SheetSettings) => void;
}) {
  const [copied, setCopied] = useState(false);
  const chosen = sentences.filter(sentence => !skip.includes(sentence.id));
  const sections = buildWorksheet(profile, chosen, settings);
  const options = { title, answers: settings.answers };
  const unchecked = chosen.filter(sentence => !sentence.checked).length;
  const toggleType = (type: SheetType) => onSettings({ ...settings, types: settings.types.includes(type) ? settings.types.filter(item => item !== type) : [...settings.types, type] });
  const missing = settings.types.filter(type => !sections.some(section => section.type === type));

  async function copy() {
    await copyToClipboard({ text: worksheetText(profile, sections, options), html: worksheetHtml(profile, sections, options, "clipboard") });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const chipClass = (active: boolean) => cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-[.82rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand",
    active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark");

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
      <div className="space-y-4">
        <Card title="문항 유형" help="고른 유형마다 문항 묶음이 하나씩 생깁니다. 문법 빈칸은 문법의 ‘쓰인 글자’가 문장에 있을 때만 만들어집니다.">
          <div className="flex flex-wrap gap-1.5">
            {sheetTypeKeys.map(type => <button key={type} type="button" aria-pressed={settings.types.includes(type)} onClick={() => toggleType(type)} className={chipClass(settings.types.includes(type))}>{sheetType(profile, type).label}</button>)}
          </div>
          <div className="mt-3 border-t border-line pt-2">
            <Toggle label={`문제에 ${profile.rubyName} 달기`} checked={settings.ruby} onChange={ruby => onSettings({ ...settings, ruby })} help={`해석 쓰기 문항에 ${objectParticle(profile.rubyName)} 답니다. ${profile.readingSheet.label} 문항은 늘 ${profile.rubyName} 없이 냅니다.`} />
            <Toggle label="끊어 읽는 곳 띄우기" checked={settings.spaced} onChange={spaced => onSettings({ ...settings, spaced })} help="끊어 읽는 곳마다 한 칸씩 띄워 처음 배우는 학생도 읽기 쉽게 합니다." />
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
                    <span lang={profile.speech} className={cn(profile.fontClass, "block truncate text-[.95rem] text-ink")}>{index + 1}. {plainOf(sentence.ruby)}</span>
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
        {missing.length > 0 && chosen.length > 0 && <p className="text-[.8rem] font-semibold text-ink-4">{missing.map(type => sheetType(profile, type).label).join(", ")}: 고른 문장으로 만들 문항이 없어요.</p>}
        {sections.length ? (
          <PrintablePage id="study-text-sheet-print" html={worksheetHtml(profile, sections, options, "screen")} />
        ) : (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface-2 px-6 text-center text-[.9rem] text-ink-3">
            <p className="font-bold text-ink-2">문항 유형과 문장을 골라 주세요.</p>
            <p>풀이에 {profile.rubyName}·해석·문법·낱말이 있어야 해당 문항이 만들어져요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
