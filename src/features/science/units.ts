/* 통합·탐구: SI 기본량과 접두어, 단위 환산, 유효숫자, 과학적 표기 문제입니다. */
import { escapeHtml, num, seededRandom, sheetTable, supDigits, type SheetProblem, type SheetSection } from "./sheet";

/** SI 기본량 7개와 2019년 재정의 때 기준으로 삼은 상수입니다. */
export const SI_BASE = [
  { quantity: "길이", unit: "미터", symbol: "m", constant: "진공에서 빛의 속력 c" },
  { quantity: "질량", unit: "킬로그램", symbol: "kg", constant: "플랑크 상수 h" },
  { quantity: "시간", unit: "초", symbol: "s", constant: "세슘-133 원자의 진동수" },
  { quantity: "전류", unit: "암페어", symbol: "A", constant: "기본 전하량 e" },
  { quantity: "온도", unit: "켈빈", symbol: "K", constant: "볼츠만 상수 k" },
  { quantity: "물질량", unit: "몰", symbol: "mol", constant: "아보가드로 수 Nₐ" },
  { quantity: "광도", unit: "칸델라", symbol: "cd", constant: "특정 진동수 빛의 발광 효율" },
];
export const PREFIXES = [
  { name: "테라", symbol: "T", power: 12 }, { name: "기가", symbol: "G", power: 9 }, { name: "메가", symbol: "M", power: 6 }, { name: "킬로", symbol: "k", power: 3 },
  { name: "센티", symbol: "c", power: -2 }, { name: "밀리", symbol: "m", power: -3 }, { name: "마이크로", symbol: "μ", power: -6 }, { name: "나노", symbol: "n", power: -9 }, { name: "피코", symbol: "p", power: -12 },
];
export const DERIVED = [
  { quantity: "속력", unit: "m/s", base: "m·s⁻¹" }, { quantity: "가속도", unit: "m/s²", base: "m·s⁻²" }, { quantity: "힘", unit: "N(뉴턴)", base: "kg·m/s²" },
  { quantity: "에너지·일", unit: "J(줄)", base: "kg·m²/s²" }, { quantity: "일률", unit: "W(와트)", base: "J/s" }, { quantity: "압력", unit: "Pa(파스칼)", base: "N/m²" },
  { quantity: "밀도", unit: "kg/m³", base: "kg·m⁻³" }, { quantity: "전하량", unit: "C(쿨롬)", base: "A·s" }, { quantity: "전압", unit: "V(볼트)", base: "J/C" },
];

/** 10의 거듭제곱 표기: 4.5×10³ */
export function scientific(value: number, digits = 3) {
  if (value === 0) return "0";
  const power = Math.floor(Math.log10(Math.abs(value)) + 1e-12);
  const mantissa = value / 10 ** power;
  return power === 0 ? num(mantissa, digits) : `${num(mantissa, digits)}×10${supDigits(String(power))}`;
}

/** 지수 표기 없이 모든 자리를 적습니다(정수부는 세 자리마다 쉼표). */
export function plainNumber(value: number) {
  const text = Math.abs(value) >= 1 ? value.toFixed(0) : value.toFixed(15).replace(/0+$/, "");
  const [whole, fraction] = text.split(".");
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (fraction ? `.${fraction}` : "");
}

/* ───── 단위 환산 ───── */
type UnitDef = { unit: string; factor: number };
export const CONVERSIONS: Record<string, { name: string; units: UnitDef[] }> = {
  length: { name: "길이", units: [{ unit: "km", factor: 1e3 }, { unit: "m", factor: 1 }, { unit: "cm", factor: 1e-2 }, { unit: "mm", factor: 1e-3 }, { unit: "μm", factor: 1e-6 }, { unit: "nm", factor: 1e-9 }] },
  mass: { name: "질량", units: [{ unit: "t", factor: 1e3 }, { unit: "kg", factor: 1 }, { unit: "g", factor: 1e-3 }, { unit: "mg", factor: 1e-6 }] },
  time: { name: "시간", units: [{ unit: "h", factor: 3600 }, { unit: "min", factor: 60 }, { unit: "s", factor: 1 }, { unit: "ms", factor: 1e-3 }] },
  volume: { name: "부피", units: [{ unit: "m³", factor: 1 }, { unit: "L", factor: 1e-3 }, { unit: "mL", factor: 1e-6 }, { unit: "cm³", factor: 1e-6 }] },
  speed: { name: "속력", units: [{ unit: "km/h", factor: 1 / 3.6 }, { unit: "m/s", factor: 1 }, { unit: "cm/s", factor: 1e-2 }] },
  density: { name: "밀도", units: [{ unit: "g/cm³", factor: 1e3 }, { unit: "kg/m³", factor: 1 }, { unit: "g/L", factor: 1 }] },
  pressure: { name: "압력", units: [{ unit: "kPa", factor: 1e3 }, { unit: "Pa", factor: 1 }, { unit: "hPa", factor: 100 }] },
};
export type ConversionKind = keyof typeof CONVERSIONS;
export function convert(value: number, kind: ConversionKind, from: string, to: string) {
  const units = CONVERSIONS[kind].units;
  const a = units.find(item => item.unit === from)!;
  const b = units.find(item => item.unit === to)!;
  return (value * a.factor) / b.factor;
}
/** 부동소수 오차를 지우고 알기 쉽게 적습니다(아주 크거나 작으면 10의 거듭제곱). */
export function cleanNumber(value: number) {
  const rounded = Number(value.toPrecision(10));
  if (rounded !== 0 && (Math.abs(rounded) >= 1e6 || Math.abs(rounded) < 1e-3)) return scientific(rounded, 4);
  return num(rounded, 6);
}

/* ───── 유효숫자 ───── */
/** 적힌 숫자의 유효숫자 개수. 소수점 없는 정수 끝의 0은 애매하므로 세지 않습니다(문제에서는 피합니다). */
export function sigFigs(text: string) {
  const clean = text.replace(/^[+-]/, "").split(/[eE×]/)[0];
  const digits = clean.replace(".", "");
  const trimmedLeft = digits.replace(/^0+/, "");
  if (!trimmedLeft) return 1;
  if (clean.includes(".")) return trimmedLeft.length;
  return trimmedLeft.replace(/0+$/, "").length;
}
export function roundSig(value: number, figures: number) {
  if (value === 0) return "0";
  const power = Math.floor(Math.log10(Math.abs(value)));
  const decimals = figures - 1 - power;
  if (decimals >= 0) return value.toFixed(decimals);
  const factor = 10 ** -decimals;
  return scientific(Math.round(value / factor) * factor, figures - 1);
}
const decimalsOf = (text: string) => text.includes(".") ? text.split(".")[1].length : 0;

export type UnitAsk = "convert" | "sigCount" | "sigCalc" | "scientific";
export const unitAsks: Record<UnitAsk, string> = { convert: "단위 환산", sigCount: "유효숫자 세기", sigCalc: "유효숫자 계산", scientific: "과학적 표기" };

export function unitProblems(asks: UnitAsk[], perAsk: number, seed: number, kinds: ConversionKind[]): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 43 + 1);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    for (let index = 0; index < perAsk; index += 1) {
      if (ask === "convert") {
        const kind = pick(kinds.length ? kinds : ["length" as ConversionKind]);
        const units = CONVERSIONS[kind].units;
        const from = pick(units);
        const to = pick(units.filter(item => item.unit !== from.unit && !(item.factor === from.factor)));
        if (!to) continue;
        const value = pick([2.5, 36, 0.8, 120, 4.2, 72, 15, 0.05, 3]);
        const answer = cleanNumber(convert(value, kind, from.unit, to.unit));
        problems.push({ html: `${num(value, 4)} ${escapeHtml(from.unit)} = ( &nbsp; &nbsp; &nbsp; ) ${escapeHtml(to.unit)}`, text: `${num(value, 4)} ${from.unit} = (   ) ${to.unit}`, answerHtml: `${answer} ${escapeHtml(to.unit)}`, answerText: `${answer} ${to.unit}` });
      } else if (ask === "sigCount") {
        const text = pick(["0.00340", "12.050", "4.00", "1002", "0.0708", "6.020", "350.0", "0.5", "2.30×10⁴", "101.30"]);
        problems.push({ html: `다음 측정값의 유효숫자는 몇 개인가? ${text}`, text: `다음 측정값의 유효숫자는 몇 개인가? ${text}`, answerHtml: `${sigFigs(text)}개`, answerText: `${sigFigs(text)}개` });
      } else if (ask === "sigCalc") {
        if (random() < 0.5) {
          const a = pick(["12.5", "3.40", "0.250", "8.1", "25.00"]);
          const b = pick(["2.1", "4.000", "1.25", "0.30", "6.0"]);
          const figures = Math.min(sigFigs(a), sigFigs(b));
          problems.push({ html: `다음을 유효숫자에 맞게 계산하시오. ${a} × ${b}`, text: `다음을 유효숫자에 맞게 계산하시오. ${a} × ${b}`, answerHtml: `${roundSig(Number(a) * Number(b), figures)} (곱셈은 유효숫자가 가장 적은 ${figures}개에 맞춤)`, answerText: `${roundSig(Number(a) * Number(b), figures)}` });
        } else {
          const a = pick(["12.52", "3.4", "105.1", "8.125", "20.0"]);
          const b = pick(["2.1", "4.003", "0.25", "10.33", "6"]);
          const places = Math.min(decimalsOf(a), decimalsOf(b));
          problems.push({ html: `다음을 유효숫자에 맞게 계산하시오. ${a} + ${b}`, text: `다음을 유효숫자에 맞게 계산하시오. ${a} + ${b}`, answerHtml: `${(Number(a) + Number(b)).toFixed(places)} (덧셈은 소수점 아래 자리가 가장 적은 ${places}자리에 맞춤)`, answerText: (Number(a) + Number(b)).toFixed(places) });
        }
      } else {
        const value = pick([299792458, 0.000000602, 6371000, 0.00015, 1496000000000, 0.0000000016]);
        problems.push({ html: `다음 수를 과학적 표기(□×10ⁿ)로 나타내시오. ${plainNumber(value)}`, text: `다음 수를 과학적 표기로 나타내시오. ${plainNumber(value)}`, answerHtml: scientific(value, 4), answerText: scientific(value, 4) });
      }
    }
    sections.push({ heading: unitAsks[ask], problems });
  }
  return sections;
}

export const siTableHtml = () => sheetTable(["기본량", "단위", "기호", "정의의 기준"], SI_BASE.map(item => [item.quantity, item.unit, item.symbol, escapeHtml(item.constant)]))
  + sheetTable(["접두어", "기호", "크기"], PREFIXES.map(item => [item.name, item.symbol, `10${supDigits(String(item.power))}`]));
