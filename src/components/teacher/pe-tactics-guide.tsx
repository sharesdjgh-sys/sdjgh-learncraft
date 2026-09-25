"use client";

import { useState } from "react";
import { BookOpenCheck, CircleAlert, Lightbulb, Play, Printer, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sportGuides } from "@/lib/pe-tactics/guides";
import { courtInfo, type CourtKind } from "@/lib/pe-tactics/model";
import { cn } from "@/lib/utils";

/* 전술 보드 아래 ‘종목 알아보기’ 타일: 경기장을 바꾸면 그 종목의 규칙·지도 포인트·안전·용어로 바뀝니다. */

const tabs = [
  { key: "rules", label: "경기 규칙", icon: BookOpenCheck },
  { key: "tips", label: "학생 지도 포인트", icon: Lightbulb },
  { key: "class", label: "안전·수업 활용", icon: ShieldCheck },
  { key: "terms", label: "용어", icon: Users },
] as const;
type Tab = (typeof tabs)[number]["key"];

const escape = (text: string) => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[char]!);

/** 학생에게 나눠 줄 한 장짜리 안내문(규칙·지도 포인트·헷갈리는 점·안전·용어). */
function printHandout(court: CourtKind) {
  const guide = sportGuides[court];
  const name = courtInfo[court].name.replace(" (표현 활동)", " 표현 활동");
  const list = (items: string[]) => `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  const html = `<style>
    @page{margin:14mm} body{font-family:Pretendard,'Malgun Gothic',sans-serif;color:#212529;font-size:12.5px;line-height:1.6;margin:0}
    h1{font-size:21px;margin:0 0 4px} h2{font-size:14px;margin:16px 0 6px;padding-bottom:3px;border-bottom:2px solid #7048e8;color:#3b2a8f}
    .lead{color:#495057;margin:0 0 10px} table{border-collapse:collapse;width:100%} td{border:1px solid #dee2e6;padding:4px 8px;vertical-align:top} td:first-child{width:22%;background:#f8f9fa;font-weight:700}
    ol,ul{margin:0;padding-left:20px} li{margin:2px 0} b{color:#212529} .x{color:#c92a2a} .o{color:#2b8a3e} .note{margin-top:12px;color:#868e96;font-size:11px}
    .cols{columns:2;column-gap:24px}
  </style>
  <h1>${escape(name)} 알아보기</h1><p class="lead">${escape(guide.summary)}</p>
  <table>${guide.basics.map((item) => `<tr><td>${escape(item.label)}</td><td>${escape(item.value)}</td></tr>`).join("")}</table>
  <h2>${court === "floor" ? "구성 원리" : "경기 규칙"}</h2><ol>${guide.rules.map((rule) => `<li><b>${escape(rule.title)}</b> — ${escape(rule.text)}</li>`).join("")}</ol>
  <h2>이렇게 하면 잘할 수 있어요</h2>${list(guide.tips.map((tip) => `<b>${escape(tip.title)}</b> — ${escape(tip.text)}`))}
  <h2>헷갈리기 쉬운 점</h2>${list(guide.confusions.map((item) => `<span class="x">✗ ${escape(item.wrong)}</span><br><span class="o">✓ ${escape(item.right)}</span>`))}
  <h2>안전 수칙</h2>${list(guide.safety.map(escape))}
  <h2>용어</h2><div class="cols">${list(guide.terms.map((term) => `<b>${escape(term.term)}</b>: ${escape(term.meaning)}`))}</div>
  ${guide.note ? `<p class="note">※ ${escape(guide.note)}</p>` : ""}`;
  const popup = window.open("", "_blank", "width=820,height=900");
  if (!popup) return false;
  popup.document.title = `${name} 알아보기`;
  popup.document.body.innerHTML = html;
  popup.focus();
  popup.print();
  return true;
}

export function SportGuidePanel({ court, examples, onLoadExample, onMessage }: {
  court: CourtKind;
  examples: { name: string; index: number }[];
  onLoadExample: (index: number) => void;
  onMessage: (message: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("rules");
  const guide = sportGuides[court];
  const name = courtInfo[court].name.replace(" (표현 활동)", "");
  const rulesLabel = court === "floor" ? "구성 원리" : "경기 규칙";

  return <section aria-label={`${name} 알아보기`} className="rounded-[18px] border border-line bg-surface shadow-[var(--lift-1)]">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 pb-3 pt-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[1rem] font-extrabold text-ink"><BookOpenCheck size={18} className="text-brand" /> {name} 알아보기</h2>
        <p className="mt-1 break-keep text-[.82rem] leading-6 text-ink-3">{guide.summary}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={() => { if (!printHandout(court)) onMessage("팝업이 막혀 인쇄 창을 열지 못했어요."); }} title="규칙·지도 포인트·안전·용어를 한 장짜리 학생 안내문으로 인쇄해요"><Printer size={14} /> 학생 안내문 인쇄</Button>
    </div>
    <div className="grid gap-2 px-4 pt-3 sm:grid-cols-2 2xl:grid-cols-4">
      {guide.basics.map((item) => <div key={item.label} className="rounded-xl bg-surface-2 px-3 py-2">
        <p className="text-[.68rem] font-bold text-ink-4">{item.label}</p>
        <p className="mt-0.5 break-keep text-[.8rem] font-semibold leading-5 text-ink-2">{item.value}</p>
      </div>)}
    </div>
    <div role="tablist" aria-label={`${name} 안내`} className="mx-4 mt-3 flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-1">
      {tabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
        className={cn("flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[.8rem] font-bold transition-colors", tab === key ? "bg-surface text-brand-dark shadow-[var(--lift-1)]" : "text-ink-3 hover:text-brand-dark")}>
        <Icon size={15} aria-hidden="true" /> {key === "rules" ? rulesLabel : label}
      </button>)}
    </div>

    <div className="px-4 pb-4 pt-3">
      {tab === "rules" && <ol className="grid gap-2 lg:grid-cols-2">
        {guide.rules.map((rule, index) => <li key={rule.title} className="flex gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[.72rem] font-extrabold text-brand-dark">{index + 1}</span>
          <span className="min-w-0"><b className="block text-[.84rem] text-ink">{rule.title}</b><span className="mt-0.5 block break-keep text-[.8rem] leading-6 text-ink-3">{rule.text}</span></span>
        </li>)}
      </ol>}

      {tab === "tips" && <div className="space-y-4">
        <div className="grid gap-2 lg:grid-cols-2">
          {guide.tips.map((tip) => <div key={tip.title} className="rounded-xl border border-line bg-white px-3 py-2.5">
            <b className="flex items-center gap-1.5 text-[.84rem] text-ink"><Lightbulb size={14} className="text-[#f59f00]" /> {tip.title}</b>
            <p className="mt-0.5 break-keep text-[.8rem] leading-6 text-ink-3">{tip.text}</p>
          </div>)}
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[.8rem] font-extrabold text-ink-2"><CircleAlert size={15} className="text-[#e8590c]" /> 학생들이 자주 헷갈리는 점</p>
          <div className="grid gap-2 lg:grid-cols-2">
            {guide.confusions.map((item) => <div key={item.wrong} className="rounded-xl border border-line bg-white px-3 py-2.5 text-[.8rem] leading-6">
              <p className="break-keep text-[#c92a2a]"><span className="font-extrabold">✗</span> {item.wrong}</p>
              <p className="break-keep text-[#2b8a3e]"><span className="font-extrabold">✓</span> {item.right}</p>
            </div>)}
          </div>
        </div>
      </div>}

      {tab === "class" && <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[.8rem] font-extrabold text-ink-2"><ShieldCheck size={15} className="text-ok" /> 안전 수칙</p>
          <ul className="space-y-1.5">{guide.safety.map((item) => <li key={item} className="flex gap-2 break-keep rounded-lg bg-surface-2 px-3 py-2 text-[.8rem] leading-5 text-ink-2"><span className="text-ok">●</span>{item}</li>)}</ul>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[.8rem] font-extrabold text-ink-2"><Users size={15} className="text-brand" /> 수업 활동 아이디어</p>
          <ul className="space-y-1.5">{guide.activities.map((item) => <li key={item} className="flex gap-2 break-keep rounded-lg bg-surface-2 px-3 py-2 text-[.8rem] leading-5 text-ink-2"><span className="text-brand">●</span>{item}</li>)}</ul>
          {examples.length > 0 && <div className="mt-3">
            <p className="mb-1.5 text-[.74rem] font-bold text-ink-4">이 종목 수업 예시 바로 열기</p>
            <div className="flex flex-wrap gap-1.5">
              {examples.map((example) => <Button key={example.index} variant="secondary" size="sm" onClick={() => onLoadExample(example.index)}><Play size={13} /> {example.name}</Button>)}
            </div>
          </div>}
        </div>
      </div>}

      {tab === "terms" && <dl className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {guide.terms.map((term) => <div key={term.term} className="rounded-xl border border-line bg-white px-3 py-2.5">
          <dt className="text-[.84rem] font-extrabold text-brand-dark">{term.term}</dt>
          <dd className="mt-0.5 break-keep text-[.8rem] leading-5 text-ink-3">{term.meaning}</dd>
        </div>)}
      </dl>}

      <p className="mt-3 break-keep text-[.7rem] leading-5 text-ink-5">
        {guide.note ?? "공식 규칙의 핵심을 줄여 적었어요. 대회는 해당 협회 규정을 따르고, 수업에서는 인원·시간·규칙을 반 상황에 맞게 바꿔 운영해도 좋아요."}
      </p>
    </div>
  </section>;
}
