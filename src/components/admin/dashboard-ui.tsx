import type { ReactNode } from "react";
import { flagLabels, levelLabels, type ActivityLevel, type UserFlag } from "@/features/usage/school-insights";
import { cn, formatNumber } from "@/lib/utils";

export const control = "min-h-10 rounded-lg border border-line bg-surface px-3 text-sm";
export const chip = "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm transition hover:border-brand hover:text-brand-dark aria-pressed:border-brand aria-pressed:bg-brand-soft aria-pressed:font-bold aria-pressed:text-brand-dark";
export const roleColors = { STUDENT: "#245ac1", TEACHER: "#087573" } as const;
export const roleName = (role: string) => role === "STUDENT" ? "학생" : "교사";
export const percent = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}%`;
/** `YYYY-MM-DD HH:MM` → `9/27 14:05` */
export const shortTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const [date, time] = value.split(" ");
  const [, month, day] = date.split("-").map(Number);
  return `${month}/${day}${time ? ` ${time}` : ""}`;
};

export const levelTone: Record<ActivityLevel, string> = {
  HIGH: "bg-[var(--ok-page)] text-ok",
  NORMAL: "bg-brand-page text-brand-dark",
  LOW: "bg-[var(--warn-page)] text-warn",
  NONE: "bg-surface-3 text-ink-4",
};
export const levelColor: Record<ActivityLevel, string> = { HIGH: "var(--ok)", NORMAL: "var(--brand)", LOW: "var(--warn)", NONE: "var(--ink-5)" };
const flagTone: Record<UserFlag, string> = {
  DROPPED: "border-[color-mix(in_srgb,var(--danger)_30%,white)] text-danger",
  FAILURES: "border-[color-mix(in_srgb,var(--danger)_30%,white)] text-danger",
  SURGE: "border-[color-mix(in_srgb,var(--brand)_30%,white)] text-brand-dark",
  NEVER_LOGGED_IN: "border-[color-mix(in_srgb,var(--warn)_30%,white)] text-warn",
  INACTIVE_ACCOUNT: "border-line text-ink-4",
};

export function Panel({ title, note, action, children, className }: { title: string; note?: string; action?: ReactNode; children?: ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-2xl border border-line bg-surface p-5 sm:p-6", className)}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-extrabold">{title}</h2>{note && <p className="mt-1.5 text-xs leading-6 text-ink-4">{note}</p>}</div>{action}</div>
    {children}
  </section>;
}

export function Metric({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: "danger" | "warn" | "ok" }) {
  return <div className={cn("min-w-0 rounded-xl border border-line bg-surface p-4", tone === "danger" && "border-[color-mix(in_srgb,var(--danger)_35%,white)] bg-[var(--danger-page)]", tone === "warn" && "bg-[var(--warn-page)]")}>
    <p className="text-xs font-semibold text-ink-4">{label}</p>
    <p className={cn("figure mt-2.5 text-2xl font-bold tracking-tight", tone === "danger" && "text-danger", tone === "warn" && "text-warn")}>{value}</p>
    {note && <p className="mt-1.5 text-xs leading-5 text-ink-4">{note}</p>}
  </div>;
}

/** 직전 동일 길이 기간 대비 증감 */
export function Change({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <span className="text-ink-4">{current ? "신규" : "—"}</span>;
  const rate = (current - previous) / previous * 100;
  if (Math.abs(rate) < 0.05) return <span className="text-ink-4">변동 없음</span>;
  return <span className={rate > 0 ? "text-ok" : "text-danger"}>{rate > 0 ? "▲" : "▼"} {Math.abs(rate).toFixed(rate >= 100 || rate <= -100 ? 0 : 1)}%</span>;
}

export function LevelBadge({ level }: { level: ActivityLevel }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-bold", levelTone[level])}>{levelLabels[level]}</span>;
}

export function FlagBadge({ flag }: { flag: UserFlag }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-full border bg-surface px-2 py-0.5 text-[11px] font-semibold", flagTone[flag])}>{flagLabels[flag]}</span>;
}

/** 항목별 비중 가로 막대 */
export function ShareBars({ items, empty = "기록이 없습니다.", unit = "건" }: { items: { key: string; label: ReactNode; value: number; color?: string }[]; empty?: string; unit?: string }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!items.length) return <p className="py-4 text-sm text-ink-4">{empty}</p>;
  return <ul className="space-y-2.5">{items.map((item) => <li key={item.key} className="text-sm">
    <div className="flex items-baseline justify-between gap-3"><span className="min-w-0 truncate">{item.label}</span><span className="shrink-0 tabular-nums"><strong>{formatNumber(item.value)}</strong>{unit} <span className="text-xs text-ink-4">{total ? `${(item.value / total * 100).toFixed(0)}%` : ""}</span></span></div>
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${item.value / max * 100}%`, backgroundColor: item.color ?? "var(--brand)" }} /></div>
  </li>)}</ul>;
}

/** 활발·보통·저조·미사용 인원 분포 막대 */
export function LevelBar({ levels }: { levels: Record<ActivityLevel, number> }) {
  const order: ActivityLevel[] = ["HIGH", "NORMAL", "LOW", "NONE"];
  const total = order.reduce((sum, level) => sum + levels[level], 0);
  const label = order.map((level) => `${levelLabels[level]} ${levels[level]}명`).join(", ");
  return <div className="flex h-2.5 min-w-24 overflow-hidden rounded-full bg-surface-3" role="img" aria-label={label} title={label}>
    {total > 0 && order.map((level) => levels[level] > 0 && <span key={level} style={{ width: `${levels[level] / total * 100}%`, backgroundColor: levelColor[level] }} />)}
  </div>;
}
