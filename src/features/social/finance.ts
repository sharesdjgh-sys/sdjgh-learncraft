/* 경제: 금융 생활. 단리·복리, 72의 법칙, 정기 예금·적금 만기액, 대출 상환 방식, 이자 소득세, 실질 이자율, 금융 상품의 특징과 문제입니다. */
import { escapeHtml, grouped, num, plotSvg, problem, seededRandom, sheetTable, won, type SheetProblem, type SheetSection } from "./sheet";

/** 이자 소득세 15.4% = 소득세 14% + 지방 소득세 1.4% */
export const INTEREST_TAX = 0.154;
/** 예금자 보호 한도: 2025년 9월 1일부터 금융 회사별 1인당 원금과 이자를 합해 1억 원(이전 5천만 원) */
export const DEPOSIT_PROTECTION = { limit: 100_000_000, since: "2025년 9월 1일", before: 50_000_000 };

export const simpleTotal = (principal: number, rate: number, years: number) => principal * (1 + rate * years);
export const compoundTotal = (principal: number, rate: number, years: number) => principal * (1 + rate) ** years;
/** 72의 법칙: 원금이 두 배가 되는 데 걸리는 햇수 ≈ 72 ÷ 연 이자율(%) */
export const rule72 = (ratePercent: number) => 72 / ratePercent;
/** 실제로 두 배가 되는 햇수(연 복리) */
export const doublingYears = (rate: number) => Math.log(2) / Math.log(1 + rate);
/** 세후 이자 */
export const afterTax = (interest: number) => interest * (1 - INTEREST_TAX);
/** 실질 이자율 ≈ 명목 이자율 − 물가 상승률(피셔 근사), exact는 (1 + i)/(1 + π) − 1 */
export const realRate = (nominal: number, inflation: number) => ({ approx: nominal - inflation, exact: (1 + nominal) / (1 + inflation) - 1 });

/** 매달 같은 돈을 넣는 정기 적금(연 이자율 rate, months개월). 단리는 달마다 넣은 돈이 남은 기간만큼 이자를 받습니다. */
export function savingsTotal(monthly: number, rate: number, months: number, kind: "simple" | "compound") {
  const principal = monthly * months;
  const interest = kind === "simple"
    ? monthly * (rate / 12) * ((months * (months + 1)) / 2)
    : Array.from({ length: months }, (_, index) => monthly * ((1 + rate / 12) ** (months - index) - 1)).reduce((sum, value) => sum + value, 0);
  return { principal, interest, afterTax: principal + afterTax(interest) };
}

export type Repayment = "annuity" | "principal" | "bullet";
export const repaymentNames: Record<Repayment, string> = { annuity: "원리금 균등 상환", principal: "원금 균등 상환", bullet: "만기 일시 상환" };
export const repaymentNotes: Record<Repayment, string> = {
  annuity: "매달 갚는 돈(원금+이자)이 같아요. 처음엔 이자 비중이 크고 갈수록 원금 비중이 커져요.",
  principal: "매달 같은 원금을 갚아 남은 원금과 이자가 줄어요. 처음 부담이 가장 크고 총이자는 가장 적어요.",
  bullet: "매달 이자만 내다가 마지막 달에 원금을 한꺼번에 갚아요. 총이자가 가장 많아요.",
};
/** 대출 상환표(월 단위). rate는 연 이자율, 달 이자율은 rate/12입니다. */
export function loanSchedule(amount: number, rate: number, months: number, kind: Repayment) {
  const monthly = rate / 12;
  const rows: { month: number; principal: number; interest: number; payment: number; balance: number }[] = [];
  let balance = amount;
  const annuity = monthly === 0 ? amount / months : (amount * monthly) / (1 - (1 + monthly) ** -months);
  for (let month = 1; month <= months; month += 1) {
    const interest = balance * monthly;
    const principal = kind === "annuity" ? annuity - interest : kind === "principal" ? amount / months : month === months ? amount : 0;
    balance = Math.max(0, balance - principal);
    rows.push({ month, principal, interest, payment: principal + interest, balance });
  }
  return { rows, totalInterest: rows.reduce((sum, row) => sum + row.interest, 0), first: rows[0]?.payment ?? 0 };
}

/** 단리·복리 원리금 비교 그래프 */
export function interestSvg(principal: number, rate: number, years: number, options: { width?: number; height?: number } = {}) {
  const points = (kind: "simple" | "compound") => Array.from({ length: years * 4 + 1 }, (_, step) => { const t = step / 4; return [t, (kind === "simple" ? simpleTotal(principal, rate, t) : compoundTotal(principal, rate, t)) / 10000] as [number, number]; });
  const top = compoundTotal(principal, rate, years) / 10000;
  return plotSvg({
    xLabel: "기간(년)", yLabel: "원리금(만 원)", xMax: years, yMin: 0, yMax: top * 1.1,
    series: [{ points: points("simple"), color: "#2563eb", label: "단리" }, { points: points("compound"), color: "#dc2626", label: "복리" }],
    dots: [{ at: [0, principal / 10000], label: "원금", color: "#111" }], width: options.width ?? 420, height: options.height ?? 270,
  });
}

/* ───── 금융 상품 ───── */
export type Product = { name: string; kind: string; safety: string; return: string; liquidity: string; protected: string; note: string };
/** 교과서에서 비교하는 금융 상품의 일반적 특징입니다(상품마다 다를 수 있어요). */
export const PRODUCTS: Product[] = [
  { name: "예금(요구불)", kind: "저축", safety: "높음", return: "낮음", liquidity: "높음", protected: "보호", note: "언제든 넣고 뺄 수 있는 보통 예금 등. 이자가 거의 없어요." },
  { name: "정기 예금", kind: "저축", safety: "높음", return: "낮음", liquidity: "낮음", protected: "보호", note: "목돈을 정한 기간 맡겨요. 중도 해지하면 약정 이자보다 적게 받아요." },
  { name: "정기 적금", kind: "저축", safety: "높음", return: "낮음", liquidity: "낮음", protected: "보호", note: "매달 일정 금액을 넣어 목돈을 만들어요." },
  { name: "주식", kind: "투자", safety: "낮음", return: "높음", liquidity: "높음", protected: "보호 안 됨", note: "회사의 소유권 일부. 배당금과 시세 차익을 기대하지만 원금 손실 위험이 커요." },
  { name: "채권", kind: "투자", safety: "중간", return: "중간", liquidity: "중간", protected: "보호 안 됨", note: "정부·회사가 돈을 빌리며 발행하는 증서. 약속한 이자와 시세 차익을 얻어요. 발행 기관이 갚지 못할 위험이 있어요." },
  { name: "펀드", kind: "간접 투자", safety: "상품에 따라 다름", return: "상품에 따라 다름", liquidity: "중간", protected: "보호 안 됨", note: "여러 사람의 돈을 모아 전문가가 대신 투자해요. 운용 성과에 따라 수익이 달라지고 수수료가 있어요." },
];
export function productTableHtml(products = PRODUCTS, blank = false) {
  const cell = (value: string) => blank ? "" : escapeHtml(value);
  return sheetTable(["상품", "안전성", "수익성", "유동성", "예금자 보호", "특징"], products.map(item => [escapeHtml(item.name), cell(item.safety), cell(item.return), cell(item.liquidity), cell(item.protected), escapeHtml(item.note)]), { font: "9pt", widths: ["16%", "10%", "10%", "10%", "11%"] });
}

/* ───── 문제 ───── */
export type FinanceAsk = "interest" | "rule72" | "savings" | "loan" | "tax" | "real" | "product";
export const financeAsks: Record<FinanceAsk, string> = { interest: "단리·복리", rule72: "72의 법칙", savings: "정기 적금", loan: "대출 상환 방식", tax: "세후 이자", real: "실질 이자율", product: "금융 상품 특징" };

export function financeProblems(asks: FinanceAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 191 + 31);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "interest") {
      const principal = pick([100, 200, 500, 1000]) * 10000;
      const rate = pick([0.05, 0.1]);
      const years = pick([2, 3]);
      problems.push(problem(`${won(principal)}을 연 이자율 ${num(rate * 100)}%로 ${years}년 동안 예금할 때, 단리와 연 복리로 받는 원리금을 각각 구하시오.`,
        `단리 ${won(simpleTotal(principal, rate, years))} (원금 × (1 + ${num(rate)} × ${years})), 복리 ${won(compoundTotal(principal, rate, years))} (원금 × ${num(1 + rate)}<sup>${years}</sup>)`, { space: 14 }));
    } else if (ask === "rule72") {
      const rate = pick([2, 3, 4, 6, 8, 9, 12]);
      problems.push(problem(`연 복리 ${rate}%로 저축하면 원금이 약 두 배가 되는 데 몇 년이 걸리는지 72의 법칙으로 구하시오.`, `약 ${num(rule72(rate), 1)}년 (72 ÷ ${rate}) · 실제 계산 ${num(doublingYears(rate / 100), 1)}년`, { space: 8 }));
    } else if (ask === "savings") {
      const monthly = pick([10, 20, 30]) * 10000;
      const rate = pick([0.024, 0.036, 0.048]);
      const result = savingsTotal(monthly, rate, 12, "simple");
      problems.push(problem(`매달 초 ${won(monthly)}씩 12개월 동안 넣는 연 이자율 ${num(rate * 100, 1)}%(단리) 정기 적금의 세전 이자와 세후 만기 수령액을 구하시오. (이자 소득세 15.4%)`,
        `원금 ${won(result.principal)}, 세전 이자 ${won(result.interest)} (${won(monthly)} × ${num(rate * 100, 1)}%/12 × (12 + 11 + … + 1) = 78개월분), 세후 수령액 ${won(Math.round(result.afterTax))}`, { space: 16 }));
    } else if (ask === "loan") {
      const amount = pick([1200, 2400, 3600]) * 10000;
      const months = 12;
      const rate = 0.12;
      const flat = loanSchedule(amount, rate, months, "principal");
      const bullet = loanSchedule(amount, rate, months, "bullet");
      const annuity = loanSchedule(amount, rate, months, "annuity");
      problems.push(problem(`${won(amount)}을 연 12%(월 1%)로 12개월 빌렸다. 원금 균등 상환과 만기 일시 상환일 때 첫 달 상환액과 총이자를 각각 구하고, 총이자가 적은 순서로 세 방식(원리금 균등 포함)을 쓰시오.`,
        `원금 균등: 첫 달 ${won(flat.first)}, 총이자 ${won(flat.totalInterest)} / 만기 일시: 첫 달 ${won(bullet.first)}(이자만), 총이자 ${won(bullet.totalInterest)} / 원리금 균등은 매달 약 ${won(Math.round(annuity.first))}, 총이자 약 ${won(Math.round(annuity.totalInterest))} → 원금 균등 &lt; 원리금 균등 &lt; 만기 일시`, { space: 18 }));
    } else if (ask === "tax") {
      const principal = pick([500, 1000, 2000]) * 10000;
      const rate = pick([0.02, 0.03, 0.04, 0.05]);
      const interest = principal * rate;
      problems.push(problem(`${won(principal)}을 연 ${num(rate * 100)}% 정기 예금(1년, 단리)에 넣었다. 이자 소득세 15.4%를 뺀 세후 이자를 구하시오.`, `세전 이자 ${won(interest)} × (1 − 0.154) = ${won(afterTax(interest))}`, { space: 10 }));
    } else if (ask === "real") {
      const nominal = pick([3, 4, 5, 6]);
      const inflation = pick([1, 2, 4, 5, 7]);
      const real = nominal - inflation;
      problems.push(problem(`명목 이자율이 연 ${nominal}%이고 물가 상승률이 연 ${inflation}%일 때 실질 이자율(근삿값)을 구하고, 예금의 실질 가치가 어떻게 되는지 쓰시오.`,
        `실질 이자율 ≈ ${nominal} − ${inflation} = ${num(real)}% → ${real > 0 ? "예금의 실질 가치가 늘어나요" : real < 0 ? "이자를 받아도 예금의 실질 가치(구매력)는 줄어요" : "실질 가치가 그대로예요"}`, { space: 10 }));
    } else {
      const item = pick(PRODUCTS.filter(product => ["주식", "채권", "정기 예금", "펀드"].includes(product.name)));
      problems.push(problem(`다음 설명에 해당하는 금융 상품을 쓰고, 안전성·수익성을 정기 예금과 비교하시오.<br>“${escapeHtml(item.note)}”`,
        `${escapeHtml(item.name)} — 안전성: ${escapeHtml(item.safety)}, 수익성: ${escapeHtml(item.return)}, 예금자 보호: ${escapeHtml(item.protected)} (정기 예금은 안전성 높음·수익성 낮음)`, { space: 10 }));
    }
  }
  return [{ heading: "금융 생활과 자산 관리", problems }];
}

/** 상환표 HTML(첫 몇 달과 마지막 달) */
export function scheduleTableHtml(schedule: ReturnType<typeof loanSchedule>, show = 6) {
  const rows = schedule.rows.length > show + 1 ? [...schedule.rows.slice(0, show), null, schedule.rows[schedule.rows.length - 1]] : schedule.rows;
  return sheetTable(["회차", "원금", "이자", "상환액", "남은 원금"], rows.map(row => row ? [`${row.month}달`, grouped(row.principal, 0), grouped(row.interest, 0), grouped(row.payment, 0), grouped(row.balance, 0)] : ["⋮", "⋮", "⋮", "⋮", "⋮"]), { font: "9pt" });
}
