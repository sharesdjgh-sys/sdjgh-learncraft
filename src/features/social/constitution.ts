/* 역사(한국사 2 · 개헌으로 보는 대한민국의 역사): 대한민국 헌법의 제정(1948)과 9차례 개정을 표·흐름도·문제로 만듭니다. */
import { tableText } from "./timeline";
import { arrowSvg, circled, escapeHtml, jamo, objectParticle, problem, seededRandom, sheetTable, shuffled, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export type Election = "direct" | "assembly" | "cabinet" | "indirect";
export const electionNames: Record<Election, string> = { direct: "국민 직선", assembly: "국회 간선", cabinet: "국회 간선(의원 내각제)", indirect: "간선(선거 기구)" };
const electionColor: Record<Election, string> = { direct: "#2563eb", assembly: "#6b7280", cabinet: "#059669", indirect: "#ea580c" };

export type Amendment = {
  order: number; // 0 = 제정
  name: string; date: string; year: number; government: string;
  election: Election; electionText: string; term: string;
  point: string; background: string;
};

export const AMENDMENTS: Amendment[] = [
  { order: 0, name: "제헌 헌법", date: "1948. 7.", year: 1948, government: "제헌 국회", election: "assembly", electionText: "국회에서 선출", term: "4년, 한 차례 중임", point: "대통령 중심제, 단원제 국회", background: "5·10 총선거로 뽑힌 제헌 국회가 만들고 7월 17일 공포" },
  { order: 1, name: "발췌 개헌", date: "1952. 7.", year: 1952, government: "이승만 정부", election: "direct", electionText: "국민 직선", term: "4년, 한 차례 중임", point: "대통령 직선제, 양원제 국회(실시되지 않음)", background: "6·25 전쟁 중 부산 정치 파동 속에 정부안과 국회안을 발췌해 통과" },
  { order: 2, name: "사사오입 개헌", date: "1954. 11.", year: 1954, government: "이승만 정부", election: "direct", electionText: "국민 직선", term: "4년(초대 대통령은 중임 제한 없음)", point: "초대 대통령의 중임 제한 철폐", background: "의결 정족수에 한 표 모자라 부결된 것을 사사오입 논리로 뒤집어 통과" },
  { order: 3, name: "3차 개헌", date: "1960. 6.", year: 1960, government: "허정 과도 정부", election: "cabinet", electionText: "국회(양원 합동 회의)에서 선출, 실권은 국무총리", term: "5년(대통령)", point: "의원 내각제, 양원제(민의원·참의원)", background: "4·19 혁명으로 이승만 정부가 무너진 뒤 개정" },
  { order: 4, name: "4차 개헌", date: "1960. 11.", year: 1960, government: "장면 내각", election: "cabinet", electionText: "국회(양원 합동 회의)에서 선출, 실권은 국무총리", term: "5년(대통령)", point: "3·15 부정 선거 관련자를 처벌하는 소급 입법의 근거 마련", background: "부정 선거 관련자에 대한 처벌 요구가 커지자 개정" },
  { order: 5, name: "5차 개헌", date: "1962. 12.", year: 1962, government: "국가 재건 최고 회의", election: "direct", electionText: "국민 직선", term: "4년, 한 차례 중임", point: "대통령 중심제·단원제로 복귀, 첫 국민 투표 개헌", background: "5·16 군사 정변 뒤 군정 아래에서 국민 투표로 확정" },
  { order: 6, name: "3선 개헌", date: "1969. 10.", year: 1969, government: "박정희 정부", election: "direct", electionText: "국민 직선", term: "4년, 세 차례까지 연임", point: "대통령의 3회 연임 허용", background: "박정희 대통령의 장기 집권을 위해 개정" },
  { order: 7, name: "유신 헌법", date: "1972. 12.", year: 1972, government: "박정희 정부", election: "indirect", electionText: "통일 주체 국민 회의에서 선출", term: "6년, 중임 제한 없음", point: "긴급 조치권·국회 해산권, 국회의원 3분의 1 추천권", background: "10월 유신(비상계엄·국회 해산) 뒤 국민 투표로 확정" },
  { order: 8, name: "8차 개헌", date: "1980. 10.", year: 1980, government: "전두환 정부", election: "indirect", electionText: "대통령 선거인단에서 선출", term: "7년 단임", point: "대통령 7년 단임제, 선거인단 간선", background: "12·12 사태와 5·18 민주화 운동 진압 뒤 신군부가 주도" },
  { order: 9, name: "9차 개헌(현행 헌법)", date: "1987. 10.", year: 1987, government: "전두환 정부", election: "direct", electionText: "국민 직선", term: "5년 단임", point: "대통령 직선제, 헌법 재판소 설치", background: "6월 민주 항쟁의 결과 여야 합의로 개정" },
];
export const amendmentLabel = (item: Amendment) => item.order === 0 || item.name.startsWith(`${item.order}차`) ? item.name : `${item.order}차 ${item.name}`;

/** 개헌 흐름도: 다섯 개씩 두 줄, 대통령 선출 방법을 색으로 나눕니다. */
export function constitutionSvg(options: { hide?: "election" | "term" | null } = {}) {
  const width = 860;
  const boxW = 150;
  const boxH = 92;
  const gapX = (width - 20 - boxW * 5) / 4;
  const parts: string[] = [];
  AMENDMENTS.forEach((item, index) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    const x = 10 + col * (boxW + gapX);
    const y = 16 + row * (boxH + 40);
    const color = electionColor[item.election];
    parts.push(`<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="10" fill="${color}" fill-opacity=".08" stroke="${color}" stroke-width="1.6"/>`);
    parts.push(svgText(x + 8, y + 17, `${item.date} · ${item.order === 0 ? "제정" : `${item.order}차`}`, { size: 10.5, color: "#444" }));
    parts.push(svgText(x + 8, y + 36, item.order === 0 ? "제헌 헌법" : item.name.replace(/\(.*\)/, ""), { size: 13, weight: 800 }));
    parts.push(svgText(x + 8, y + 56, options.hide === "election" ? "선출: (          )" : electionNames[item.election], { size: 11, color }));
    parts.push(svgText(x + 8, y + 74, options.hide === "term" ? "임기: (          )" : item.term.replace(/\(.*\)/, "").replace(", 한 차례 중임", " 중임 1회"), { size: 10.5, color: "#333" }));
    if (col < 4 && index < AMENDMENTS.length - 1) parts.push(arrowSvg(x + boxW + 2, y + boxH / 2, x + boxW + gapX - 2, y + boxH / 2, "#9ca3af", 1.6));
  });
  // 첫 줄 끝에서 둘째 줄 처음으로 꺾어 잇습니다.
  const endX = 10 + 4 * (boxW + gapX) + boxW / 2;
  parts.push(`<path d="M${endX} ${16 + boxH + 2} V${16 + boxH + 20} H${10 + boxW / 2} V${16 + boxH + 36}" fill="none" stroke="#9ca3af" stroke-width="1.6"/>`);
  parts.push(`<path d="M${10 + boxW / 2} ${16 + boxH + 40} l-4 -7 h8 z" fill="#9ca3af"/>`);
  const legendY = 16 + 2 * boxH + 40 + 24;
  (Object.keys(electionNames) as Election[]).forEach((key, index) => {
    const x = 10 + index * 200;
    parts.push(`<rect x="${x}" y="${legendY - 10}" width="14" height="12" rx="3" fill="${electionColor[key]}" fill-opacity=".2" stroke="${electionColor[key]}"/>`);
    parts.push(svgText(x + 20, legendY, `대통령 ${electionNames[key]}`, { size: 11 }));
  });
  return svgWrap(width, legendY + 12, parts.join(""));
}

export function constitutionTableHtml(blank?: "election" | "term" | "point" | null, marks?: Map<number, string>) {
  return sheetTable(["구분", "시기", "정부", "대통령 선출", "임기", "주요 내용"], AMENDMENTS.map((item, index) => [
    escapeHtml(amendmentLabel(item)), escapeHtml(item.date), escapeHtml(item.government),
    blank === "election" && marks?.has(index) ? marks.get(index)! : escapeHtml(item.electionText),
    blank === "term" && marks?.has(index) ? marks.get(index)! : escapeHtml(item.term),
    blank === "point" && marks?.has(index) ? marks.get(index)! : escapeHtml(item.point),
  ]), { widths: ["14%", "10%", "14%", "20%", "16%", "26%"], font: "9pt" });
}

/* ───── 문제 ───── */
export type ConstitutionAsk = "order" | "match" | "blank";
export const constitutionAsks: Record<ConstitutionAsk, string> = { order: "개헌 순서", match: "내용과 개헌 잇기", blank: "개헌 표 빈칸" };

export function constitutionProblems(asks: ConstitutionAsk[], perAsk: number, seed: number): SheetSection[] {
  const random = seededRandom(seed * 29 + 3);
  const nextSeed = () => Math.floor(random() * 4294967296);
  const sections: SheetSection[] = [];
  const problems: SheetProblem[] = [];
  const seen = new Set<string>();
  const push = (made: SheetProblem) => { if (!seen.has(made.html)) { seen.add(made.html); problems.push(made); return true; } return false; };
  if (asks.includes("order")) for (let index = 0, tries = 0; index < perAsk && tries < 30; tries += 1) if (push(order())) index += 1;
  if (asks.includes("match")) for (let index = 0, tries = 0; index < perAsk && tries < 30; tries += 1) if (push(match())) index += 1;
  if (problems.length) sections.push({ heading: "헌법 개정의 흐름", problems });
  if (asks.includes("blank")) {
    const column = (["election", "term", "point"] as const)[Math.floor(random() * 3)];
    const count = Math.min(AMENDMENTS.length, Math.max(3, perAsk * 2));
    const chosen = shuffled(AMENDMENTS.map((_, index) => index), nextSeed()).slice(0, count).sort((a, b) => a - b);
    const marks = new Map(chosen.map((index, order) => [index, `( ${"㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩"[order]} )`]));
    const what = { election: "대통령 선출 방법", term: "대통령 임기", point: "주요 내용" }[column];
    sections.push({
      heading: "개헌 표 빈칸",
      problems: [{
        ...problem(`표의 빈칸에 들어갈 ${objectParticle(what)} 쓰시오.${constitutionTableHtml(column, marks)}`, chosen.map((index, order) => {
          const item = AMENDMENTS[index];
          return `${"㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩"[order]} ${escapeHtml(column === "election" ? item.electionText : column === "term" ? item.term : item.point)}`;
        }).join("<br>")),
        text: `표의 빈칸에 들어갈 ${objectParticle(what)} 쓰시오.\n${tableText(["구분", "시기", "대통령 선출", "임기", "주요 내용"], AMENDMENTS.map((item, index) => [
          amendmentLabel(item), item.date,
          column === "election" && marks.has(index) ? marks.get(index)! : item.electionText,
          column === "term" && marks.has(index) ? marks.get(index)! : item.term,
          column === "point" && marks.has(index) ? marks.get(index)! : item.point,
        ]))}`,
      }],
    });
  }
  return sections;

  function order() {
    const items = shuffled(AMENDMENTS, nextSeed()).slice(0, 4);
    const right = [...items].sort((a, b) => a.order - b.order);
    return problem(
      `다음 헌법 개정 내용을 시기 순서대로 나열하시오.<br>${items.map((item, i) => `${jamo(i)}. ${escapeHtml(item.point)}`).join("<br>")}`,
      `${right.map(item => jamo(items.indexOf(item))).join(" → ")} (${right.map(item => `${escapeHtml(amendmentLabel(item))} ${escapeHtml(item.date)}`).join(", ")})`,
      { space: 6 },
    );
  }
  function match() {
    const answer = AMENDMENTS[Math.floor(random() * AMENDMENTS.length)];
    const others = shuffled(AMENDMENTS.filter(item => item !== answer), nextSeed()).slice(0, 4);
    const choices = [...[answer, ...others]].sort((a, b) => a.order - b.order);
    const at = choices.indexOf(answer);
    return problem(
      `다음 내용이 담긴 헌법으로 옳은 것은?<br>&lt;대통령 선출: ${escapeHtml(answer.electionText)} / 임기: ${escapeHtml(answer.term)} / ${escapeHtml(answer.point)}&gt;<br>${choices.map((item, i) => `${circled(i)} ${escapeHtml(amendmentLabel(item))}(${escapeHtml(item.date)})`).join("&nbsp;&nbsp; ")}`,
      `${circled(at)} ${escapeHtml(amendmentLabel(answer))} — ${escapeHtml(answer.background)}`,
      { space: 4 },
    );
  }
}
