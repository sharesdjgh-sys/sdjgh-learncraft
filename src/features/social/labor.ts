/* 법과 사회·통합사회: 근로기준법의 주휴 수당·가산 수당, 최저 임금, 청소년 근로 기준과 문제입니다. */
import { escapeHtml, grouped, plainText, seededRandom, shuffled, type SheetProblem, type SheetSection } from "./sheet";

/** 고용노동부 고시 시간당 최저 임금(원)입니다. */
export const MINIMUM_WAGE: Record<number, number> = { 2025: 10_030, 2026: 10_320 };
export const wageYears = Object.keys(MINIMUM_WAGE).map(Number);
/** 주 40시간 일하면 주휴 8시간을 더해 한 달 209시간으로 환산합니다((40 + 8) × 365 ÷ 12 ÷ 7). */
export const MONTH_WEEKS = 365 / 12 / 7;
export const monthHours = (weeklyPaidHours: number) => Math.round(weeklyPaidHours * MONTH_WEEKS);

export type Work = {
  year: number; wage: number; days: number; hoursPerDay: number;
  /** 소정 근로 밖에 더 일한 연장 시간(1주) */
  overtime: number;
  /** 일한 시간 가운데 밤 10시~오전 6시 사이 시간(1주) */
  night: number;
  /** 휴일 근로 시간(1주): 8시간 이내와 8시간 넘는 부분 */
  holiday: number; holidayOver: number;
  perfect: boolean; fivePlus: boolean; age: number;
};
export const DEFAULT_WORK: Work = { year: 2026, wage: 10_320, days: 5, hoursPerDay: 4, overtime: 0, night: 0, holiday: 0, holidayOver: 0, perfect: true, fivePlus: true, age: 17 };

/** 1주 임금을 계산합니다. 하루 8시간·1주 40시간을 넘는 계약 시간은 연장 근로로 봅니다. */
export function weekPay(work: Work) {
  const scheduled = work.days * work.hoursPerDay;
  const dailyOver = Math.max(0, work.hoursPerDay - 8) * work.days;
  const weeklyOver = Math.max(0, scheduled - dailyOver - 40);
  const contract = scheduled - dailyOver - weeklyOver;
  const overtime = dailyOver + weeklyOver + work.overtime;
  const holidayHours = work.holiday + work.holidayOver;
  const worked = scheduled + work.overtime + holidayHours;
  const base = worked * work.wage;
  // 주휴 수당: 1주 소정 근로 15시간 이상이고 개근하면 (소정 ÷ 40) × 8시간분, 최대 8시간
  const weeklyRestHours = contract >= 15 && work.perfect ? Math.min(8, (contract / 40) * 8) : 0;
  const weeklyRest = weeklyRestHours * work.wage;
  // 가산 수당(상시 5명 이상): 연장·야간·휴일(8시간 이내) 50%, 휴일 8시간 초과 100%
  const premiums = work.fivePlus ? { overtime: overtime * work.wage * 0.5, night: work.night * work.wage * 0.5, holiday: work.holiday * work.wage * 0.5, holidayOver: work.holidayOver * work.wage * 1 } : { overtime: 0, night: 0, holiday: 0, holidayOver: 0 };
  const premium = premiums.overtime + premiums.night + premiums.holiday + premiums.holidayOver;
  const total = base + weeklyRest + premium;
  return { scheduled, contract, overtime, worked, base, weeklyRestHours, weeklyRest, premiums, premium, total, month: total * MONTH_WEEKS, monthHours: monthHours(contract + weeklyRestHours) };
}

export type Check = { ok: boolean; text: string };
/** 최저 임금과 근로 시간 기준을 점검합니다. */
export function workChecks(work: Work): Check[] {
  const pay = weekPay(work);
  const minimum = MINIMUM_WAGE[work.year] ?? MINIMUM_WAGE[2026];
  const checks: Check[] = [{ ok: work.wage >= minimum, text: `${work.year}년 최저 임금 시간당 ${grouped(minimum, 0)}원 ${work.wage >= minimum ? "이상이에요" : `보다 ${grouped(minimum - work.wage, 0)}원 적어요(최저 임금법 위반)`}` }];
  const extra = pay.overtime;
  if (work.age < 15) checks.push({ ok: false, text: "15세 미만(중학생 포함)은 고용노동부 장관이 발급한 취직 인허증이 있어야 일할 수 있어요." });
  if (work.age < 18) {
    checks.push({ ok: work.hoursPerDay <= 7 && pay.scheduled + work.overtime <= 35, text: `청소년(15세 이상 18세 미만)은 1일 7시간·1주 35시간이 기준이고, 합의하면 1일 1시간·1주 5시간까지 늘릴 수 있어요 (지금 하루 ${grouped(work.hoursPerDay, 1)}시간·1주 ${grouped(pay.scheduled + work.overtime, 1)}시간).` });
    if (work.hoursPerDay > 7 || pay.scheduled + work.overtime > 35) checks.push({ ok: work.hoursPerDay <= 8 && pay.scheduled + work.overtime <= 40, text: "기준 시간을 넘으면 당사자 합의가 필요하고, 1일 8시간·1주 40시간을 넘을 수 없어요." });
    if (work.night > 0 || work.holiday + work.holidayOver > 0) checks.push({ ok: false, text: "청소년의 야간(밤 10시~오전 6시)·휴일 근로는 본인의 동의와 고용노동부 장관의 인가가 있어야 해요." });
    checks.push({ ok: true, text: "사업장에 친권자(후견인) 동의서와 가족 관계 증명서를 갖춰 두어야 해요." });
  } else {
    checks.push({ ok: extra <= 12, text: `연장 근로는 당사자가 합의해도 1주 12시간까지예요 (지금 ${grouped(extra, 1)}시간).` });
  }
  if (!work.fivePlus) checks.push({ ok: true, text: "상시 4명 이하 사업장에는 연장·야간·휴일 가산 수당 규정이 적용되지 않아요(주휴 수당은 적용)." });
  return checks;
}

/** 근로 계약서에 적어야 할 사항(근로기준법 제17조)입니다. 임금·소정 근로 시간·휴일·연차 유급 휴가는 서면으로 주어야 해요. */
export const CONTRACT_ITEMS = ["근로 계약 기간", "근무 장소", "업무 내용", "소정 근로 시간", "휴일(주휴일)", "임금(구성 항목·계산 방법·지급 방법)", "연차 유급 휴가"];

/** 청소년 근로 OX 문장입니다. */
const YOUTH_STATEMENTS: { text: string; ok: boolean; why: string }[] = [
  { text: "만 15세 이상 18세 미만 청소년의 근로 시간은 1일 7시간, 1주 35시간을 넘지 못한다(합의에 따른 연장 제외).", ok: true, why: "근로기준법 제69조" },
  { text: "청소년도 당사자 사이에 합의하면 1일 1시간, 1주 5시간 한도로 연장 근로를 할 수 있다.", ok: true, why: "근로기준법 제69조 단서" },
  { text: "청소년의 야간 근로는 사업주가 원하면 언제든 시킬 수 있다.", ok: false, why: "본인 동의와 고용노동부 장관 인가가 필요" },
  { text: "미성년자도 임금을 독자적으로 청구할 수 있다.", ok: true, why: "근로기준법 제68조" },
  { text: "친권자는 미성년자를 대리하여 근로 계약을 맺을 수 있다.", ok: false, why: "친권자·후견인은 근로 계약을 대리할 수 없음(근로기준법 제67조)" },
  { text: "청소년에게도 최저 임금이 똑같이 적용된다.", ok: true, why: "최저 임금은 나이와 관계없이 적용" },
  { text: "근로 계약서는 말로만 해도 되고 서면으로 줄 필요는 없다.", ok: false, why: "임금·근로 시간·휴일 등은 서면으로 명시·교부해야 함" },
  { text: "1주 소정 근로 시간이 15시간 이상이고 개근하면 주휴 수당을 받을 수 있다.", ok: true, why: "근로기준법 제55조" },
  { text: "사용자는 청소년을 고용할 때 친권자(후견인) 동의서와 가족 관계 증명서를 사업장에 갖춰 두어야 한다.", ok: true, why: "근로기준법 제66조" },
  { text: "15세 미만인 사람은 어떤 경우에도 일할 수 없다.", ok: false, why: "고용노동부 장관이 발급한 취직 인허증이 있으면 가능" },
];

/* ───── 문제 ───── */
export type LaborAsk = "weekly" | "premium" | "minimum" | "youth" | "contract";
export const laborAsks: Record<LaborAsk, string> = { weekly: "주휴 수당", premium: "연장·야간 가산 수당", minimum: "최저 임금 위반 여부", youth: "청소년 근로 OX", contract: "근로 계약서 항목" };

export function laborProblems(asks: LaborAsk[], perAsk: number, seed: number, year = 2026): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 31 + 7);
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const minimum = MINIMUM_WAGE[year] ?? MINIMUM_WAGE[2026];
  const problems: SheetProblem[] = [];
  const add = (html: string, answerHtml: string, space = 12) => problems.push({ html, text: plainText(html), answerHtml, answerText: plainText(answerHtml), space });
  const wageNear = () => minimum + int(0, 12) * 100;
  const youth = shuffled(YOUTH_STATEMENTS, int(0, 1e6));
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "weekly") {
      const wage = wageNear();
      const days = int(3, 5);
      const hours = [3, 4, 5, 6, 8][int(0, 4)];
      const weekly = days * hours;
      const restHours = weekly >= 15 ? Math.min(8, (weekly / 40) * 8) : 0;
      add(`시급 ${grouped(wage, 0)}원으로 1주에 ${days}일, 하루 ${hours}시간씩 일하기로 하고 그 주를 개근하였다. 이 주에 받을 주휴 수당을 구하시오.`,
        weekly < 15 ? `없음 (1주 소정 근로 ${weekly}시간 < 15시간)` : `${grouped(restHours * wage, 0)}원 ((${weekly} ÷ 40) × 8 = ${grouped(restHours, 1)}시간분 × ${grouped(wage, 0)}원)`);
    } else if (ask === "premium") {
      const wage = wageNear();
      const over = int(1, 4);
      const night = int(0, over);
      const pay = over * wage * 1.5 + night * wage * 0.5;
      add(`상시 근로자 5명 이상인 사업장에서 시급 ${grouped(wage, 0)}원을 받는 근로자가 하루 8시간을 일한 뒤 ${over}시간을 더 일하였다. 더 일한 시간 가운데 ${night}시간은 밤 10시 이후였다. 더 일한 ${over}시간에 대해 받을 임금을 구하시오.`,
        `${grouped(pay, 0)}원 (연장 ${over}시간 × ${grouped(wage, 0)} × 1.5${night ? ` + 야간 ${night}시간 × ${grouped(wage, 0)} × 0.5` : ""})`);
    } else if (ask === "minimum") {
      const monthly = (minimum * 209) + int(-8, 8) * 10_000;
      const hourly = monthly / 209;
      add(`${year}년에 주 40시간(주휴 포함 월 209시간)을 일하고 월급 ${grouped(monthly, 0)}원을 받기로 계약하였다. 이 계약이 최저 임금법에 어긋나는지 판단하시오. (${year}년 최저 임금 시간당 ${grouped(minimum, 0)}원)`,
        `${hourly >= minimum ? "어긋나지 않음" : "어긋남(최저 임금 위반)"} (월급 ÷ 209 = 시간당 약 ${grouped(hourly, 0)}원, 최저 임금 월 환산 ${grouped(minimum * 209, 0)}원)`, 10);
    } else if (ask === "youth") {
      const item = youth[index % youth.length];
      add(`다음 설명이 옳으면 ○, 틀리면 ×를 하시오.<br>${escapeHtml(item.text)} (   )`, `${item.ok ? "○" : "×"} (${escapeHtml(item.why)})`, 4);
    } else {
      const blanks = shuffled(CONTRACT_ITEMS.map((_, at) => at), int(0, 1e6)).slice(0, 2).sort((a, b) => a - b);
      add(`근로 계약서에 적어야 할 사항이다. 빈칸에 알맞은 말을 쓰시오.<br>${CONTRACT_ITEMS.map((item, at) => blanks.includes(at) ? `(${"가나"[blanks.indexOf(at)]}) ________` : escapeHtml(item)).join(" · ")}`,
        blanks.map((at, order) => `(${"가나"[order]}) ${escapeHtml(CONTRACT_ITEMS[at])}`).join(", "), 6);
    }
  }
  return [{ heading: "근로자의 권리", problems }];
}
