/* 지구과학: 지질 시대표(국제층서위원회 ICS 연대표 2023 기준)와 '지구의 역사를 1년으로' 달력, 빈칸 학습지입니다. */
import { particle } from "@/features/language-sheet";
import { escapeHtml, grouped, num, seededRandom, sheetTable, type SheetProblem, type SheetSection } from "./sheet";

export type Period = { name: string; start: number; end: number; life: string; events: string; color: string };
export type Era = { name: string; start: number; end: number; color: string; periods: Period[] };

/** 시작·끝은 백만 년 전(Ma)입니다. 교과서는 억 년 단위로 어림해 적으므로 조금씩 다를 수 있습니다. */
export const ERAS: Era[] = [
  {
    name: "선캄브리아 시대", start: 4600, end: 538.8, color: "#f4c7d4", periods: [
      { name: "명왕누대", start: 4600, end: 4000, life: "생명체 흔적 없음", events: "지구 탄생, 원시 바다 형성", color: "#e9b4c6" },
      { name: "시생누대", start: 4000, end: 2500, life: "원핵생물, 남세균(사이아노박테리아)", events: "스트로마톨라이트 형성, 광합성 시작", color: "#f1bfd0" },
      { name: "원생누대", start: 2500, end: 538.8, life: "진핵생물, 다세포 생물, 에디아카라 동물군", events: "대기 중 산소 증가, 여러 차례 빙하기", color: "#f7d3df" },
    ],
  },
  {
    name: "고생대", start: 538.8, end: 251.9, color: "#b9d9a8", periods: [
      { name: "캄브리아기", start: 538.8, end: 485.4, life: "삼엽충, 완족류", events: "생물의 폭발적 증가(캄브리아기 대폭발)", color: "#9fc98c" },
      { name: "오르도비스기", start: 485.4, end: 443.8, life: "필석, 삼엽충, 앵무조개", events: "말기 대멸종(제1차)", color: "#a9d096" },
      { name: "실루리아기", start: 443.8, end: 419.2, life: "산호, 갑주어, 최초의 육상 식물", events: "식물의 육상 진출", color: "#b3d6a1" },
      { name: "데본기", start: 419.2, end: 358.9, life: "어류 번성(어류의 시대), 최초의 양서류", events: "후기 대멸종(제2차)", color: "#bddcab" },
      { name: "석탄기", start: 358.9, end: 298.9, life: "양치식물(거대한 숲), 양서류, 방추충", events: "석탄층 형성, 최초의 파충류", color: "#c7e2b6" },
      { name: "페름기", start: 298.9, end: 251.9, life: "파충류, 겉씨식물, 방추충", events: "판게아 형성, 말기 최대 대멸종(제3차)", color: "#d1e8c1" },
    ],
  },
  {
    name: "중생대", start: 251.9, end: 66, color: "#a8d3e6", periods: [
      { name: "트라이아스기", start: 251.9, end: 201.4, life: "공룡·포유류 출현, 암모나이트", events: "판게아 분리 시작, 말기 대멸종(제4차)", color: "#94c6dd" },
      { name: "쥐라기", start: 201.4, end: 143.1, life: "공룡 번성, 시조새, 겉씨식물 번성", events: "대서양 형성 시작", color: "#a6d0e3" },
      { name: "백악기", start: 143.1, end: 66, life: "속씨식물 출현, 공룡, 암모나이트", events: "말기 대멸종(제5차, 공룡 멸종)", color: "#b8dae9" },
    ],
  },
  {
    name: "신생대", start: 66, end: 0, color: "#f6e3a3", periods: [
      { name: "팔레오기", start: 66, end: 23.03, life: "포유류 번성, 화폐석", events: "히말라야산맥 형성 시작", color: "#f3d98a" },
      { name: "네오기", start: 23.03, end: 2.58, life: "포유류, 인류의 조상(오스트랄로피테쿠스)", events: "속씨식물 번성, 초원 확대", color: "#f6e19e" },
      { name: "제4기", start: 2.58, end: 0, life: "매머드, 인류(호모 사피엔스)", events: "빙하기와 간빙기 반복", color: "#f9e9b3" },
    ],
  },
];
export const PERIODS = ERAS.flatMap(era => era.periods.map(period => ({ ...period, era: era.name })));

/** 백만 년 → 억 년 또는 만 년으로 알기 쉽게 적습니다. */
export function agoText(ma: number) {
  if (ma === 0) return "현재";
  if (ma >= 100) return `약 ${num(ma / 100, 2)}억 년 전`;
  if (ma >= 1) return `약 ${grouped(ma * 100, 0)}만 년 전`;
  return `약 ${grouped(ma * 100, 1)}만 년 전`;
}

/* ───── 지구 달력 ───── */
export type CalendarEvent = { name: string; ma: number };
export const CALENDAR_EVENTS: CalendarEvent[] = [
  { name: "지구 탄생", ma: 4600 },
  { name: "가장 오래된 암석", ma: 4000 },
  { name: "최초의 생명체(원핵생물)", ma: 3800 },
  { name: "스트로마톨라이트(남세균)", ma: 3500 },
  { name: "최초의 진핵생물", ma: 2100 },
  { name: "에디아카라 동물군", ma: 600 },
  { name: "캄브리아기 대폭발", ma: 538.8 },
  { name: "식물의 육상 진출", ma: 470 },
  { name: "어류 번성", ma: 400 },
  { name: "최초의 양서류", ma: 370 },
  { name: "페름기 말 대멸종", ma: 251.9 },
  { name: "최초의 공룡", ma: 230 },
  { name: "시조새", ma: 150 },
  { name: "공룡 멸종", ma: 66 },
  { name: "인류의 조상(오스트랄로피테쿠스)", ma: 4 },
  { name: "현생 인류(호모 사피엔스)", ma: 0.3 },
  { name: "농경 시작", ma: 0.01 },
];
const DAYS = 365;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** 46억 년을 1년(365일)으로 줄였을 때의 날짜와 시각입니다. 1월 1일 0시가 지구 탄생, 12월 31일 자정이 현재입니다. */
export function calendarDate(ma: number, total = 4600) {
  const elapsed = ((total - ma) / total) * DAYS; // 1월 1일 0시부터 지난 날 수
  const day = Math.min(Math.floor(elapsed), DAYS - 1);
  let month = 0;
  let rest = day;
  while (rest >= MONTH_DAYS[month]) { rest -= MONTH_DAYS[month]; month += 1; }
  const minutes = Math.round((elapsed - day) * 24 * 60);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const seconds = Math.round((elapsed - day) * 86400) % 60;
  const lastDay = day === DAYS - 1;
  return { month: month + 1, day: rest + 1, hour, minute, seconds, text: `${month + 1}월 ${rest + 1}일${lastDay ? ` ${hour}시 ${minute}분${ma < 0.1 ? ` ${seconds}초` : ""}` : ""}` };
}

/* ───── 지질 시대표 HTML ───── */
export type GeologicBlank = "none" | "names" | "ages" | "life" | "some";
export const geologicBlanks: Record<GeologicBlank, string> = { none: "빈칸 없음", names: "시대 이름", ages: "시작 연대", life: "생물·사건", some: "골고루 비우기" };

export function geologicTableHtml(options: { blank: GeologicBlank; seed: number; reveal?: boolean }) {
  const random = seededRandom(options.seed * 17 + 3);
  const hide = (kind: "names" | "ages" | "life") => !options.reveal && (options.blank === kind || (options.blank === "some" && random() < 0.4));
  const blank = (content: string, hidden: boolean) => hidden ? "" : content;
  const rows: string[] = [];
  for (const era of ERAS) {
    era.periods.forEach((period, index) => {
      const cells: string[] = [];
      if (index === 0) cells.push(`<td rowspan="${era.periods.length}" style="border:1px solid #444;padding:1.5mm;background:${era.color};text-align:center;font-weight:700;width:18mm">${blank(escapeHtml(era.name), hide("names"))}</td>`);
      cells.push(`<td style="border:1px solid #444;padding:1.3mm 2mm;background:${period.color};text-align:center;white-space:nowrap">${blank(escapeHtml(period.name), hide("names"))}</td>`);
      cells.push(`<td style="border:1px solid #444;padding:1.3mm 2mm;text-align:center;white-space:nowrap">${blank(agoText(period.start).replace("약 ", ""), hide("ages"))}</td>`);
      const lifeHidden = hide("life");
      cells.push(`<td style="border:1px solid #444;padding:1.3mm 2mm">${blank(escapeHtml(period.life), lifeHidden)}</td>`);
      cells.push(`<td style="border:1px solid #444;padding:1.3mm 2mm">${blank(escapeHtml(period.events), lifeHidden)}</td>`);
      rows.push(`<tr style="height:9mm">${cells.join("")}</tr>`);
    });
  }
  const th = (content: string) => `<th style="border:1px solid #444;padding:1.3mm;background:#f1f1f1">${content}</th>`;
  return `<table style="border-collapse:collapse;width:100%;font-size:9.5pt"><thead><tr>${th("대")}${th("누대·기")}${th("시작")}${th("주요 생물")}${th("주요 사건")}</tr></thead><tbody>${rows.join("")}</tbody></table>`
    + `<p style="margin:1.5mm 0 0;font-size:8pt;color:#555">연대는 국제층서위원회(ICS) 2023 기준이며, 교과서마다 어림한 값이 조금 다를 수 있습니다.</p>`;
}

/** 지질 시대의 상대적 길이를 한 줄 막대로 보여 줍니다. 선캄브리아 시대가 전체의 약 88%입니다. */
export function geologicBarSvg(width = 640) {
  const height = 100;
  const total = 4600;
  const x = (ma: number) => ((total - ma) / total) * (width - 20) + 10;
  const parts: string[] = [`<rect width="${width}" height="${height}" fill="#fff"/>`];
  for (const era of ERAS) {
    parts.push(`<rect x="${x(era.start).toFixed(1)}" y="20" width="${(x(era.end) - x(era.start)).toFixed(1)}" height="30" fill="${era.color}" stroke="#333" stroke-width="0.8"/>`);
    const mid = (x(era.start) + x(era.end)) / 2;
    const share = ((era.start - era.end) / total) * 100;
    if (era.name === "선캄브리아 시대") parts.push(`<text x="${mid.toFixed(1)}" y="40" text-anchor="middle" font-size="12" font-weight="700">${escapeHtml(era.name)} (약 ${num(share, 0)}%)</text>`);
    else {
      // 고생대·중생대·신생대는 막대가 좁아 오른쪽 아래에 한 줄씩 이름표를 둡니다.
      const line = ["고생대", "중생대", "신생대"].indexOf(era.name);
      const y = 66 + line * 13;
      parts.push(`<rect x="${width - 118}" y="${y - 9}" width="10" height="10" fill="${era.color}" stroke="#333" stroke-width="0.6"/><text x="${width - 104}" y="${y}" font-size="10.5">${escapeHtml(era.name)} ${num(share, 1)}%</text>`);
    }
  }
  parts.push(`<text x="10" y="13" font-size="10" fill="#444">46억 년 전</text><text x="${width - 10}" y="13" text-anchor="end" font-size="10" fill="#444">현재</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="max-width:100%;height:auto;font-family:'Malgun Gothic',sans-serif">${parts.join("")}</svg>`;
}

export function calendarTableHtml(events: CalendarEvent[], blank: boolean) {
  const sorted = [...events].sort((a, b) => b.ma - a.ma);
  return sheetTable(["사건", "시기", "지구 달력 날짜"], sorted.map(event => [escapeHtml(event.name), agoText(event.ma), blank ? "" : calendarDate(event.ma).text]), { widths: ["42%", "26%"] });
}

/* ───── 학습지 ───── */
export type GeologicSheetSettings = { blank: GeologicBlank; bar: boolean; calendar: boolean; calendarBlank: boolean; fossils: boolean; seed: number; answers: boolean };

const FOSSILS: { fossil: string; age: string }[] = [
  { fossil: "삼엽충", age: "고생대" }, { fossil: "필석", age: "고생대" }, { fossil: "갑주어", age: "고생대" }, { fossil: "방추충", age: "고생대" },
  { fossil: "공룡", age: "중생대" }, { fossil: "암모나이트", age: "중생대" }, { fossil: "시조새", age: "중생대" },
  { fossil: "화폐석", age: "신생대" }, { fossil: "매머드", age: "신생대" },
];

export function geologicSheet(settings: GeologicSheetSettings, events: CalendarEvent[]): SheetSection[] {
  const sections: SheetSection[] = [];
  const blankWord = settings.blank === "some" ? "내용" : geologicBlanks[settings.blank];
  const tableProblem: SheetProblem = {
    html: settings.blank === "none" ? "지질 시대표를 보고 물음에 답하시오." : `지질 시대표의 빈칸에 알맞은 ${blankWord}${particle(blankWord, "을", "를")} 쓰시오.${geologicTableHtml(settings)}`,
    text: `지질 시대표의 빈칸을 채우시오. (표는 인쇄본 참고)`,
    answerHtml: geologicTableHtml({ ...settings, reveal: true }),
    answerText: PERIODS.map(period => `${period.name} ${agoText(period.start)}: ${period.life}`).join(" / "),
  };
  if (settings.blank === "none") {
    sections.push({ heading: "지질 시대", problems: [], intro: { html: geologicTableHtml(settings), text: "(지질 시대표는 인쇄본 참고)" } });
  } else sections.push({ heading: "지질 시대", problems: [tableProblem] });
  if (settings.bar) sections[0].intro = { html: `${sections[0].intro?.html ?? ""}`, text: sections[0].intro?.text ?? "", figure: geologicBarSvg() };
  if (settings.fossils) {
    const list = [...FOSSILS].sort((a, b) => a.fossil.localeCompare(b.fossil));
    sections.push({
      heading: "표준 화석",
      problems: [{
        html: `다음 표준 화석이 발견되는 지질 시대(대)를 쓰시오.${sheetTable(["화석", "지질 시대"], list.map(item => [escapeHtml(item.fossil), ""]), { widths: ["50%"] })}`,
        text: `다음 표준 화석이 발견되는 지질 시대(대)를 쓰시오. ${list.map(item => item.fossil).join(", ")}`,
        answerHtml: sheetTable(["화석", "지질 시대"], list.map(item => [escapeHtml(item.fossil), item.age]), { widths: ["50%"] }),
        answerText: list.map(item => `${item.fossil} ${item.age}`).join(", "),
      }],
    });
  }
  if (settings.calendar) {
    const intro = "지구의 역사 46억 년을 1년으로 줄이면 1일은 약 1,260만 년, 1시간은 약 52만 년, 1분은 약 8,750년에 해당한다.";
    sections.push({
      heading: "지구의 역사를 1년으로",
      problems: [{
        html: `${intro} ${settings.calendarBlank ? "각 사건이 일어난 지구 달력 날짜를 구하시오." : "표를 보고 느낀 점을 쓰시오."}${calendarTableHtml(events, settings.calendarBlank)}`,
        text: `${intro} ${events.map(event => event.name).join(", ")}`,
        answerHtml: calendarTableHtml(events, false),
        answerText: [...events].sort((a, b) => b.ma - a.ma).map(event => `${event.name} ${calendarDate(event.ma).text}`).join(", "),
        space: settings.calendarBlank ? 0 : 20,
      }],
    });
  }
  return sections;
}
