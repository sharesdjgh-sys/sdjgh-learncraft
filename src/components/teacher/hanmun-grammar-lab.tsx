"use client";

import { useState } from "react";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { grammarFormKeys, grammarForms, grammarItems, grammarSheetHtml, grammarSheetTypeKeys, grammarSheetTypes, markedText, type GrammarForm, type GrammarItem, type GrammarSheetType } from "@/features/teacher-activities/hanmun-grammar";
import { ActivityInput, ActivityLayout, ActivityReady, ActivitySheet, useActivityDraft } from "./activity-shared";
import { Card, Toggle } from "./tool-panel";

const schema = z.object({
  title: z.string().max(100), selected: z.array(z.string().max(10)).max(60),
  types: z.array(z.enum(grammarSheetTypeKeys as [GrammarSheetType, ...GrammarSheetType[]])).max(4),
  table: z.boolean(), answers: z.boolean(), seed: z.number().int().min(0).max(1000000),
});
const initial: z.infer<typeof schema> = { title: "한문 문장 형식 익히기", selected: ["n1", "p1", "q3", "c1", "s1", "m1"], types: ["translate", "usage"], table: true, answers: true, seed: 1 };
const chipClass = (active: boolean) => cn("min-h-9 rounded-lg border px-2.5 py-1.5 text-[.82rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand",
  active ? "border-brand/40 bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2 hover:border-brand/30 hover:bg-brand-page hover:text-brand-dark");

export function HanmunGrammarLab({ tabs }: { tabs: React.ReactNode }) { return <ActivityReady><Editor tabs={tabs} /></ActivityReady>; }
function Editor({ tabs }: { tabs: React.ReactNode }) {
  const [draft, setDraft, error] = useActivityDraft("learncraft_hanmun_grammar_v1", schema, initial);
  const [filter, setFilter] = useState<GrammarForm | "all">("all");
  // 활동지 문항은 형식 순서대로 놓아 같은 형식끼리 비교하기 쉽게 합니다.
  const chosen = grammarItems.filter(item => draft.selected.includes(item.id));
  const shown = filter === "all" ? grammarItems : grammarItems.filter(item => item.form === filter);
  const toggle = (id: string) => setDraft({ ...draft, selected: draft.selected.includes(id) ? draft.selected.filter(i => i !== id) : [...draft.selected, id] });
  const shownIds = shown.map(item => item.id);
  const allShown = shownIds.every(id => draft.selected.includes(id));
  const html = grammarSheetHtml(chosen, { ...draft, types: grammarSheetTypeKeys.filter(type => draft.types.includes(type)) });
  return <ActivityLayout subject="한문" title="허사·문장 형식" description="부정·의문·반어·사동·피동·비교 같은 문장 형식을 교과서에 자주 나오는 명문장으로 익히세요. 화면에서 함께 풀어 보고, 고른 문장으로 독음·풀이·빈칸 활동지를 만들 수 있습니다." tabs={tabs} error={error}>
    <div className="grid items-start gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card title="문장 고르기" help="형식을 눌러 모아 보고, 문장을 눌러 활동지에 넣거나 뺍니다.">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")} className={chipClass(filter === "all")}>전체</button>
            {grammarFormKeys.map(form => <button key={form} type="button" aria-pressed={filter === form} onClick={() => setFilter(form)} className={chipClass(filter === form)}>{grammarForms[form].name}</button>)}
          </div>
          {filter !== "all" && <p className="mb-3 rounded-xl bg-surface-2 p-3 text-[.8rem] leading-5 text-ink-3"><b lang="zh-Hant" className="text-ink" style={{ fontFamily: "'Noto Serif KR', 'Batang', serif" }}>{grammarForms[filter].markers}</b><br />{grammarForms[filter].tip}</p>}
          <div className="mb-2 flex items-center justify-between text-xs text-ink-4"><span>{chosen.length}문장 선택</span>
            <button type="button" className="font-bold text-brand-dark hover:underline" onClick={() => setDraft({ ...draft, selected: allShown ? draft.selected.filter(id => !shownIds.includes(id)) : [...new Set([...draft.selected, ...shownIds])] })}>{allShown ? "보이는 문장 모두 빼기" : "보이는 문장 모두 넣기"}</button></div>
          <ul className="scrollbar-subtle max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
            {shown.map(item => <li key={item.id}><label className={cn("flex cursor-pointer gap-2 rounded-xl border p-2.5", draft.selected.includes(item.id) ? "border-brand/40 bg-brand-page" : "border-line bg-surface")}>
              <input type="checkbox" className="mt-1" checked={draft.selected.includes(item.id)} onChange={() => toggle(item.id)} />
              <span className="min-w-0"><span lang="zh-Hant" className="block text-[1.05rem] font-bold text-ink" style={{ fontFamily: "'Noto Serif KR', 'Batang', serif" }}>{item.text}</span>
                <span className="block text-[.74rem] text-ink-4">{grammarForms[item.form].name} · {item.source}</span></span>
            </label></li>)}
          </ul>
        </Card>
        <Card title="활동지 구성">
          <div className="space-y-3">
            <ActivityInput label="활동지 제목" value={draft.title} maxLength={100} onChange={title => setDraft({ ...draft, title })} />
            <div className="flex flex-wrap gap-1.5">{grammarSheetTypeKeys.map(type => <button key={type} type="button" aria-pressed={draft.types.includes(type)} className={chipClass(draft.types.includes(type))}
              onClick={() => setDraft({ ...draft, types: draft.types.includes(type) ? draft.types.filter(t => t !== type) : [...draft.types, type] })}>{grammarSheetTypes[type]}</button>)}</div>
            <Toggle label="형식별 허사 정리표" checked={draft.table} onChange={table => setDraft({ ...draft, table })} />
            <Toggle label="교사용 참고 답안 포함" checked={draft.answers} onChange={answers => setDraft({ ...draft, answers })} />
            {draft.types.includes("blank") && <Button variant="secondary" size="sm" onClick={() => setDraft({ ...draft, seed: (draft.seed + 1) % 1000001 })}><Shuffle size={14} /> 빈칸 보기 순서 섞기</Button>}
          </div>
        </Card>
      </div>
      <div className="min-w-0 space-y-4">
        {chosen.length > 0 && <ClassView key={chosen.map(item => item.id).join()} items={chosen} />}
        <ActivitySheet id="hanmun-grammar-print" html={html} disabled={!chosen.length || !draft.types.length} />
      </div>
    </div>
  </ActivityLayout>;
}

/** 수업 화면: 한 문장씩 크게 띄우고 독음·풀이·지도 포인트를 차례로 엽니다. */
function ClassView({ items }: { items: GrammarItem[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState({ reading: false, translation: false, point: false });
  const item = items[Math.min(index, items.length - 1)];
  const go = (next: number) => { setIndex((next + items.length) % items.length); setOpen({ reading: false, translation: false, point: false }); };
  const reveal = (key: keyof typeof open, label: string) => <Button variant={open[key] ? "primary" : "secondary"} size="sm" aria-pressed={open[key]} onClick={() => setOpen({ ...open, [key]: !open[key] })}>{open[key] ? <EyeOff size={14} /> : <Eye size={14} />} {label}</Button>;
  return <Card title="수업 화면" action={<span className="text-xs font-bold text-ink-4">{index + 1} / {items.length}</span>}>
    <div className="rounded-2xl bg-surface-2 px-4 py-8 text-center">
      <p className="text-xs font-bold text-brand-dark">{grammarForms[item.form].name}</p>
      <p lang="zh-Hant" className="mt-2 break-keep text-[clamp(1.8rem,4vw,3rem)] font-bold leading-tight tracking-[.08em] text-ink" style={{ fontFamily: "'Noto Serif KR', 'Batang', serif" }} dangerouslySetInnerHTML={{ __html: markedText(item.text, item.marks) }} />
      <p className="mt-2 text-xs text-ink-4">{item.source}</p>
      <div className="mt-4 space-y-1.5 text-[.95rem] leading-7">
        {open.reading && <p className="text-lg font-bold text-ink-2">{item.reading}</p>}
        {open.translation && <p className="text-ink">{item.translation}</p>}
        {open.point && <p className="mx-auto max-w-2xl rounded-xl bg-surface p-3 text-left text-sm text-ink-3">{item.point}</p>}
      </div>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">{reveal("reading", "독음")}{reveal("translation", "풀이")}{reveal("point", "지도 포인트")}</div>
      <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => go(index - 1)} aria-label="이전 문장"><ChevronLeft size={16} /></Button><Button variant="secondary" size="sm" onClick={() => go(index + 1)} aria-label="다음 문장"><ChevronRight size={16} /></Button></div>
    </div>
  </Card>;
}
