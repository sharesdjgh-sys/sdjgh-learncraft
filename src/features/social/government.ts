/* 정치: 대통령제·의원 내각제 비교, 우리나라 정부 형태, 권력 분립 관계도와 문제입니다. */
import { arrowSvg, escapeHtml, jamo, plainText, seededRandom, sheetTable, shuffled, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

type Form = "pres" | "parl";
export const formNames: Record<Form, string> = { pres: "대통령제", parl: "의원 내각제" };

/** 교과서의 전형적인 비교입니다(대통령제는 미국, 의원 내각제는 영국을 본보기로 삼습니다). */
export const COMPARE_ROWS: [string, string, string][] = [
  ["권력 구조", "입법부와 행정부의 엄격한 분립", "입법부와 행정부의 융합(협력)"],
  ["행정부 구성", "국민이 뽑은 대통령이 구성", "의회 다수당(연립)이 내각 구성"],
  ["국가 원수·행정부 수반", "대통령이 모두 맡음", "나뉨(국왕·대통령이 원수, 총리가 수반)"],
  ["임기", "대통령 임기 보장", "의회의 신임이 있는 동안 존속"],
  ["의회의 불신임권", "없음", "있음(내각 불신임)"],
  ["내각의 의회 해산권", "없음", "있음"],
  ["법률안 거부권", "대통령에게 있음", "없음"],
  ["정부의 법률안 제출권", "없음(미국)", "있음"],
  ["의원의 각료 겸직", "불가(미국)", "가능"],
  ["장점", "임기 동안 정국 안정, 정책의 계속성, 다수당의 횡포 견제", "책임 정치, 입법부·행정부 협력으로 신속한 정책 집행"],
  ["단점", "독재 가능성, 입법부·행정부가 대립하면 해결이 어려움", "다수당의 횡포 가능성, 군소 정당이 난립하면 정국 불안정"],
  ["대표 국가", "미국, 브라질, 멕시코", "영국, 일본, 독일"],
];

/** 우리나라 헌법의 정부 형태: 대통령제를 바탕으로 의원 내각제 요소를 더했습니다. */
export const KOREA_ELEMENTS: { text: string; form: Form }[] = [
  { text: "대통령을 국민이 직접 선거로 뽑는다(임기 5년 단임).", form: "pres" },
  { text: "대통령은 국회가 의결한 법률안에 거부권을 행사할 수 있다.", form: "pres" },
  { text: "국회는 정부를 불신임할 수 없고, 대통령은 국회를 해산할 수 없다.", form: "pres" },
  { text: "대통령이 국가 원수이자 행정부 수반이다.", form: "pres" },
  { text: "정부도 법률안을 제출할 수 있다.", form: "parl" },
  { text: "국무총리를 두며, 대통령이 국회의 동의를 얻어 임명한다.", form: "parl" },
  { text: "국회는 국무총리·국무위원의 해임을 대통령에게 건의할 수 있다.", form: "parl" },
  { text: "국회의원이 국무총리·국무위원을 겸직할 수 있다.", form: "parl" },
  { text: "국회는 국무총리·국무위원을 출석시켜 질문할 수 있다.", form: "parl" },
  { text: "대통령의 국법상 행위에는 국무총리와 관계 국무위원이 부서한다.", form: "parl" },
];

/** 제시문에 쓰는 특징입니다. */
const FEATURES: { text: string; form: Form }[] = [
  { text: "행정부 수반을 국민이 선거로 뽑는다.", form: "pres" },
  { text: "행정부 수반의 임기가 보장된다.", form: "pres" },
  { text: "행정부 수반이 의회가 의결한 법률안을 거부할 수 있다.", form: "pres" },
  { text: "입법부와 행정부가 엄격하게 분리되어 있다.", form: "pres" },
  { text: "의회는 행정부를 불신임할 수 없다.", form: "pres" },
  { text: "행정부는 의회를 해산할 수 없다.", form: "pres" },
  { text: "국가 원수가 행정부 수반을 겸한다.", form: "pres" },
  { text: "의회의 다수당이 내각을 구성한다.", form: "parl" },
  { text: "의회는 내각을 불신임할 수 있다.", form: "parl" },
  { text: "내각은 의회를 해산할 수 있다.", form: "parl" },
  { text: "의원이 각료를 겸직하는 경우가 많다.", form: "parl" },
  { text: "입법부와 행정부가 긴밀하게 협력한다.", form: "parl" },
  { text: "국가 원수와 행정부 수반이 서로 다른 사람이다.", form: "parl" },
  { text: "내각은 의회에 대해 연대 책임을 진다.", form: "parl" },
];

export function compareTableHtml() {
  return sheetTable(["구분", "대통령제", "의원 내각제"], COMPARE_ROWS.map(row => row.map(cell => escapeHtml(cell))), { widths: ["22%", "39%", "39%"], center: false, font: "9.5pt" });
}

/** 권력 분립 관계도: 국회·정부·법원과 헌법 재판소 사이의 견제입니다. */
export function checksSvg(width = 640) {
  const height = 430;
  const box = (x: number, y: number, w: number, label: string, sub: string, color: string) => `<rect x="${x - w / 2}" y="${y - 26}" width="${w}" height="52" rx="12" fill="${color}" stroke="#333" stroke-width="1.2"/>` + svgText(x, y - 3, label, { anchor: "middle", size: 15, weight: 800 }) + svgText(x, y + 15, sub, { anchor: "middle", size: 10.5, color: "#444" });
  const assembly = { x: width / 2, y: 44 };
  const government = { x: width - 110, y: 300 };
  const court = { x: 110, y: 300 };
  const constitutional = { x: width / 2, y: 392 };
  // 두 기관 사이에 방향이 다른 두 화살표를 나란히 긋고 이름표를 붙입니다.
  const pair = (a: { x: number; y: number }, b: { x: number; y: number }, ab: string, ba: string, shrinkA = 34, shrinkB = 34) => {
    const dx = b.x - a.x; const dy = b.y - a.y; const length = Math.hypot(dx, dy); const ux = dx / length; const uy = dy / length; const nx = -uy * 9; const ny = ux * 9;
    const start = (offset: number) => ({ x: a.x + ux * shrinkA + nx * offset, y: a.y + uy * shrinkA + ny * offset });
    const end = (offset: number) => ({ x: b.x - ux * shrinkB + nx * offset, y: b.y - uy * shrinkB + ny * offset });
    const s1 = start(1); const e1 = end(1); const s2 = end(-1); const e2 = start(-1);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const labelAt = (offset: number) => ({ x: mid.x + nx * offset, y: mid.y + ny * offset });
    const l1 = labelAt(3.4); const l2 = labelAt(-3.4);
    return arrowSvg(s1.x, s1.y, e1.x, e1.y, "#2563eb", 1.8) + arrowSvg(s2.x, s2.y, e2.x, e2.y, "#dc2626", 1.8)
      + ab.split("\n").map((line, index) => svgText(l1.x, l1.y + index * 13, line, { anchor: "middle", size: 10.5, color: "#1d4ed8", weight: 600 })).join("")
      + ba.split("\n").map((line, index) => svgText(l2.x, l2.y + index * 13, line, { anchor: "middle", size: 10.5, color: "#b91c1c", weight: 600 })).join("");
  };
  const body = pair(assembly, government, "국정 감사·조사\n탄핵 소추, 해임 건의", "법률안 거부권\n법률안 제출", 30, 50)
    + pair(government, court, "대법원장·대법관 임명", "명령·규칙·처분 심사", 70, 70)
    + pair(court, assembly, "위헌 법률 심판 제청", "대법원장·대법관\n임명 동의", 50, 30)
    + arrowSvg(constitutional.x - 60, constitutional.y - 24, court.x + 70, court.y + 18, "#7c3aed", 1.6, true)
    + arrowSvg(constitutional.x + 60, constitutional.y - 24, government.x - 70, government.y + 18, "#7c3aed", 1.6, true)
    + svgText(constitutional.x, constitutional.y - 40, "위헌 법률·탄핵·권한 쟁의 심판 → 국회·정부", { anchor: "middle", size: 10.5, color: "#6d28d9", weight: 600 })
    + box(assembly.x, assembly.y, 150, "국회", "입법권", "#dbeafe")
    + box(government.x, government.y, 170, "대통령(정부)", "행정권", "#fee2e2")
    + box(court.x, court.y, 150, "법원", "사법권", "#dcfce7")
    + box(constitutional.x, constitutional.y, 170, "헌법 재판소", "헌법 재판", "#ede9fe");
  return svgWrap(width, height, body);
}

/* ───── 문제 ───── */
export type GovernmentAsk = "identify" | "statement" | "korea";
export const governmentAsks: Record<GovernmentAsk, string> = { identify: "제시문으로 정부 형태 판별", statement: "옳은 설명 고르기", korea: "우리나라의 의원 내각제 요소" };

export function governmentProblems(asks: GovernmentAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 37 + 11);
  const next = () => Math.floor(random() * 1e6);
  const problems: SheetProblem[] = [];
  const add = (html: string, answerHtml: string, space = 8) => problems.push({ html, text: plainText(html), answerHtml, answerText: plainText(answerHtml), space });
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "identify") {
      const first: Form = random() < 0.5 ? "pres" : "parl";
      const second: Form = first === "pres" ? "parl" : "pres";
      const lines = (form: Form) => shuffled(FEATURES.filter(feature => feature.form === form), next()).slice(0, 2).map(feature => escapeHtml(feature.text)).join(" ");
      add(`다음은 갑국과 을국의 정부 형태에 대한 설명이다. 갑국과 을국의 정부 형태를 각각 쓰시오.<br>· 갑국: ${lines(first)}<br>· 을국: ${lines(second)}`, `갑국 ${formNames[first]}, 을국 ${formNames[second]}`);
    } else if (ask === "statement") {
      const form: Form = random() < 0.5 ? "pres" : "parl";
      const right = shuffled(FEATURES.filter(feature => feature.form === form), next()).slice(0, 2);
      const wrong = shuffled(FEATURES.filter(feature => feature.form !== form), next()).slice(0, 2);
      const items = shuffled([...right, ...wrong], next());
      add(`전형적인 ${formNames[form]}에 대한 설명으로 옳은 것만을 &lt;보기&gt;에서 있는 대로 고르시오.<br>${items.map((item, at) => `${jamo(at)}. ${escapeHtml(item.text)}`).join("<br>")}`,
        `${items.map((item, at) => item.form === form ? jamo(at) : "").filter(Boolean).join(", ")} (나머지는 ${formNames[form === "pres" ? "parl" : "pres"]}의 특징)`);
    } else {
      const items = shuffled([...shuffled(KOREA_ELEMENTS.filter(item => item.form === "parl"), next()).slice(0, 2 + Math.floor(random() * 2)), ...shuffled(KOREA_ELEMENTS.filter(item => item.form === "pres"), next()).slice(0, 2)], next());
      add(`우리나라 정부 형태에서 의원 내각제적 요소에 해당하는 것만을 &lt;보기&gt;에서 있는 대로 고르시오.<br>${items.map((item, at) => `${jamo(at)}. ${escapeHtml(item.text)}`).join("<br>")}`,
        `${items.map((item, at) => item.form === "parl" ? jamo(at) : "").filter(Boolean).join(", ")} (나머지는 대통령제 요소)`);
    }
  }
  return [{ heading: "민주 정치와 정부 형태", problems }];
}
