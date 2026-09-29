"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { z } from "zod";
import { Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard, PrintablePage } from "./hanmun-sheet";

const subscribe = () => () => {};
export function ActivityReady({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return ready ? children : <p className="p-8 text-ink-3">수업 도구를 준비하는 중…</p>;
}
export function useActivityDraft<T>(key: string, schema: z.ZodType<T>, fallback: T) {
  const [draft, setDraft] = useState<T>(() => {
    try { return schema.parse(JSON.parse(localStorage.getItem(key) ?? "null")); } catch { return fallback; }
  });
  const [error, setError] = useState("");
  useEffect(() => {
    // Storage failures are an external-system result, not derived rendering state.
    let message = "";
    try { localStorage.setItem(key, JSON.stringify(draft)); }
    catch { message = "이 브라우저에 저장하지 못했어요. 필요한 자료를 복사하거나 인쇄해 주세요."; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(message);
  }, [key, draft]);
  return [draft, setDraft, error] as const;
}
export const activityField = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm leading-6 text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";
export function ActivityInput({ label, value, onChange, multiline = false, maxLength = 300 }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; maxLength?: number }) {
  return <label className="block space-y-1 text-xs font-semibold text-ink-3"><span>{label}</span>{multiline
    ? <textarea className={activityField} rows={3} value={value} maxLength={maxLength} onChange={e => onChange(e.target.value)} />
    : <input className={activityField} value={value} maxLength={maxLength} onChange={e => onChange(e.target.value)} />}</label>;
}
export function ActivityLayout({ subject, title, description, tabs, error, children }: { subject: string; title: string; description: string; tabs?: ReactNode; error?: string; children: ReactNode }) {
  return <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <header className="border-b border-line pb-6"><p className="text-xs font-bold text-brand-dark">교사 지원실 · {subject}</p><h1 className="mt-2 text-[1.85rem] font-extrabold tracking-[-0.04em]">{title}</h1><p className="mt-2 text-sm leading-6 text-ink-3">{description}</p></header>
    {tabs}<p role="status" className="text-xs text-ink-4">{error || "작성 내용은 이 브라우저에 자동 저장됩니다."}</p>{children}
  </div>;
}
export function ActivitySheet({ id, html, disabled = false }: { id: string; html: string; disabled?: boolean }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      const doc = new DOMParser().parseFromString(html.replace(/<\/(p|h1|h2|section|tr|div)>/g, "</$1>\n"), "text/html");
      await copyToClipboard({ html, text: doc.body.textContent ?? "" });
      setMessage("복사했어요. 한글·워드에 붙여 넣으세요.");
    } catch { setMessage("복사하지 못했어요. 브라우저의 클립보드 권한을 확인해 주세요."); }
  }
  return <div className="min-w-0 space-y-3"><style>{`#${id}{min-width:180mm;overflow-wrap:anywhere}@media print{#${id}{min-width:0!important}}`}</style><div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" size="sm" onClick={() => void copy()} disabled={disabled}><Copy size={15} /> 활동지 복사</Button><Button variant="secondary" size="sm" onClick={() => window.print()} disabled={disabled}><Printer size={15} /> 인쇄 / PDF</Button></div><p role="status" className="text-xs text-ink-3">{message}</p>{disabled ? <p className="rounded-2xl border border-dashed border-line p-10 text-center text-ink-3">활동에 넣을 내용을 선택하거나 입력해 주세요.</p> : <PrintablePage id={id} html={html} />}</div>;
}
