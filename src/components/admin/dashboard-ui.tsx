import type { ReactNode } from "react";
import { flagLabels, levelLabels, type ActivityLevel, type UserFlag } from "@/features/usage/school-insights";
import { formatNumber } from "@/lib/utils";
import styles from "./accounts.module.css";
import d from "./dashboard.module.css";

export const roleColors = { STUDENT: "#245ac1", TEACHER: "#087573" } as const;
export const levelColors: Record<ActivityLevel, string> = { HIGH: "#3f9a71", NORMAL: "#5b82d6", LOW: "#d69a3c", NONE: "#d5d8e0" };
export const roleName = (role: string) => role === "STUDENT" ? "학생" : "교사";
export const percent = (value: number | null) => value === null ? "—" : `${value.toFixed(1)}%`;
export const seconds = (ms: number | null) => ms === null ? "—" : `${(ms / 1000).toFixed(1)}초`;
/** `YYYY-MM-DD HH:MM` → `9/27 14:05` */
export const shortTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const [date, time] = value.split(" ");
  const [, month, day] = date.split("-").map(Number);
  return `${month}/${day}${time ? ` ${time}` : ""}`;
};
export const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");

export function Card({ title, note, action, children, label }: { title: ReactNode; note?: ReactNode; action?: ReactNode; children?: ReactNode; label?: string }) {
  return <section className={styles.card} aria-label={label}>
    <header className={d.cardHead}><div className="min-w-0"><h2>{title}</h2>{note && <p>{note}</p>}</div>{action}</header>
    {children}
  </section>;
}

export function Stat({ label, value, unit, note, tone, pressed, onClick }: { label: ReactNode; value: ReactNode; unit?: string; note?: ReactNode; tone?: string; pressed?: boolean; onClick?: () => void }) {
  const body = <><span>{label}</span><strong>{value}{unit && <small>{unit}</small>}</strong>{note && <small>{note}</small>}</>;
  return onClick
    ? <button type="button" className={cx(d.stat, tone)} aria-pressed={pressed} onClick={onClick}>{body}</button>
    : <div className={cx(d.stat, tone)}>{body}</div>;
}

/** 직전 동일 길이 기간 대비 증감 */
export function Change({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <span className={d.muted}>{current ? "신규" : "—"}</span>;
  const rate = (current - previous) / previous * 100;
  if (Math.abs(rate) < 0.05) return <span className={d.muted}>변동 없음</span>;
  return <span className={rate > 0 ? d.up : d.down}>{rate > 0 ? "▲" : "▼"} {Math.abs(rate).toFixed(Math.abs(rate) >= 100 ? 0 : 1)}%</span>;
}

export function LevelBadge({ level }: { level: ActivityLevel }) {
  return <span className={cx(d.level, d[level])}>{levelLabels[level]}</span>;
}

export function FlagBadge({ flag }: { flag: UserFlag }) {
  return <span className={cx(d.flag, d[flag])}>{flagLabels[flag]}</span>;
}

export function Avatar({ name, role }: { name: string; role: string }) {
  return <span className={cx(styles.avatar, role === "TEACHER" ? d.avatarTeacher : d.avatarStudent)} aria-hidden="true">{name.slice(0, 1)}</span>;
}

/** 항목별 비중 가로 막대 */
export function ShareBars({ items, empty = "기록이 없습니다." }: { items: { key: string; label: ReactNode; value: number; color?: string; note?: ReactNode }[]; empty?: string }) {
  if (!items.length) return <p className={d.empty}>{empty}</p>;
  const max = Math.max(1, ...items.map((item) => item.value));
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return <ul className={d.bars}>{items.map((item) => <li key={item.key}>
    <div className={d.barLabel}><span>{item.label}{item.note && <small>{item.note}</small>}</span><span className={d.num}><b>{formatNumber(item.value)}</b>건 <small>{total ? `${Math.round(item.value / total * 100)}%` : ""}</small></span></div>
    <div className={d.track}><span style={{ width: `${item.value / max * 100}%`, background: item.color ?? "#6a8fd8" }} /></div>
  </li>)}</ul>;
}

/** 일별 요청을 작은 막대로 보여 주는 표 안 추이 */
export function Spark({ values, color, label }: { values: number[]; color: string; label: string }) {
  const width = 96, height = 24;
  const max = Math.max(1, ...values);
  const step = width / Math.max(1, values.length);
  return <svg className={d.spark} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
    <line x1="0" x2={width} y1={height - 0.5} y2={height - 0.5} stroke="#e6e8ee" />
    {values.map((value, index) => value > 0 && <rect key={index} x={index * step + step * 0.15} width={Math.max(1, step * 0.7)} y={height - 1 - value / max * (height - 3)} height={value / max * (height - 3)} rx={0.5} fill={color} />)}
  </svg>;
}
