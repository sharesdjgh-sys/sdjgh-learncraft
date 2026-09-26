/* 화학: 주기율표(빈칸 학습지 포함)와 전자 배치 학습지 HTML입니다. */
import { answerSection, clipboardWrap, sheetHead } from "@/features/language-sheet";
import { bohrSvg, categoryInfo, configHtml, configText, ELEMENTS, massText, metalColors, position, shells, SHELL_NAMES, valenceElectrons, type ChemElement } from "./elements";
import { escapeHtml, seededRandom, sheetTable, type SheetMode, type SheetProblem, type SheetSection } from "./sheet";

export const tableRanges = { 20: "1~20번", 36: "1~36번(4주기)", 54: "1~54번(5주기)", 118: "전체 118개" } as const;
export type TableRange = keyof typeof tableRanges;
export const tableBlanks = { none: "빈칸 없음", symbol: "원소 기호 쓰기", name: "원소 이름 쓰기", some: "일부 칸 비우기", all: "번호만 두기" } as const;
export type TableBlank = keyof typeof tableBlanks;
export type TableColor = "category" | "metal" | "none";
export type TableSettings = { range: TableRange; blank: TableBlank; color: TableColor; mass: boolean; seed: number; answers: boolean };

const cellColor = (element: ChemElement, color: TableColor) => color === "none" ? "#fff" : color === "metal" ? metalColors[categoryInfo[element.category].metal] : categoryInfo[element.category].color;

/** 비울 칸을 고릅니다. 같은 seed면 같은 칸입니다. */
function hiddenSet(settings: TableSettings) {
  const hidden = new Map<number, "symbol" | "name" | "both">();
  const random = seededRandom(settings.seed * 7919 + settings.range);
  for (const element of ELEMENTS.slice(0, settings.range)) {
    if (settings.blank === "symbol") hidden.set(element.z, "symbol");
    else if (settings.blank === "name") hidden.set(element.z, "name");
    else if (settings.blank === "all") hidden.set(element.z, "both");
    else if (settings.blank === "some" && random() < 0.4) hidden.set(element.z, "both");
  }
  return hidden;
}

/** 18족 주기율표 표. interactive면 칸마다 data-z를 붙여 화면에서 누를 수 있게 합니다. */
export function periodicTableHtml(settings: TableSettings, options: { reveal?: boolean; interactive?: boolean; selected?: number } = {}) {
  const hidden = options.reveal ? new Map() : hiddenSet(settings);
  const elements = ELEMENTS.slice(0, settings.range);
  const rows = Math.max(...elements.map(element => position(element.z).row));
  const grid: (ChemElement | "la" | "ac" | null)[][] = Array.from({ length: 11 }, () => Array(19).fill(null));
  for (const element of elements) {
    const at = position(element.z);
    grid[at.row][at.column] = element;
  }
  if (settings.range > 56) grid[6][3] = "la";
  if (settings.range > 88) grid[7][3] = "ac";
  const big = settings.range <= 36;
  const cell = (element: ChemElement) => {
    const hide = hidden.get(element.z);
    const selected = options.selected === element.z;
    return `<td${options.interactive ? ` data-z="${element.z}"` : ""} style="border:1px solid #666;background:${cellColor(element, settings.color)};padding:0.6mm 0.4mm;text-align:center;vertical-align:top;${options.interactive ? "cursor:pointer;" : ""}${selected ? "outline:2.5px solid #7c3aed;outline-offset:-2px;" : ""}">`
      + `<div style="font-size:${big ? 7.5 : 6}pt;line-height:1.1;text-align:left">${element.z}</div>`
      + `<div style="font-size:${big ? 13 : 10}pt;font-weight:700;line-height:1.15;min-height:1.15em">${hide === "symbol" || hide === "both" ? "" : element.symbol}</div>`
      + `<div style="font-size:${big ? 6.3 : 5.2}pt;letter-spacing:-0.3px;line-height:1.15;min-height:1.15em;white-space:nowrap;overflow:hidden">${hide === "name" || hide === "both" ? "" : escapeHtml(element.name)}</div>`
      + (settings.mass ? `<div style="font-size:${big ? 6.5 : 5.2}pt;line-height:1.1;color:#333">${massText(element)}</div>` : "")
      + "</td>";
  };
  const groupHead = `<tr><td></td>${Array.from({ length: 18 }, (_, index) => `<td style="text-align:center;font-size:7pt;color:#444;padding-bottom:0.5mm">${index + 1}</td>`).join("")}</tr>`;
  const body = Array.from({ length: rows }, (_, index) => index + 1).map(row => {
    if (row === 8) return `<tr><td colspan="19" style="height:2.5mm"></td></tr>`;
    const label = row <= 7 ? String(row) : "";
    const cells: string[] = [];
    for (let column = 1; column <= 18; column += 1) {
      const item = grid[row][column];
      if (item === "la" || item === "ac") cells.push(`<td style="border:1px solid #666;background:${settings.color === "none" ? "#fff" : settings.color === "metal" ? metalColors.금속 : categoryInfo[item === "la" ? "lanthanide" : "actinide"].color};text-align:center;font-size:6pt">${item === "la" ? "57~71" : "89~103"}</td>`);
      else if (item) cells.push(cell(item));
      else cells.push("<td></td>");
    }
    return `<tr><td style="font-size:7pt;color:#444;text-align:right;padding-right:1mm">${label}</td>${cells.join("")}</tr>`;
  }).join("");
  const table = `<table style="border-collapse:collapse;table-layout:fixed;width:100%;font-family:'Malgun Gothic',sans-serif"><colgroup><col style="width:3%">${"<col>".repeat(18)}</colgroup><tbody>${groupHead}${body}</tbody></table>`;
  const used = [...new Set(elements.map(element => settings.color === "metal" ? categoryInfo[element.category].metal : element.category))];
  const legend = settings.color === "none" ? "" : `<p style="margin:2mm 0 0;font-size:8pt;line-height:1.8">${used.map(key => {
    const [name, color] = settings.color === "metal" ? [key, metalColors[key as keyof typeof metalColors]] : [categoryInfo[key as ChemElement["category"]].name, categoryInfo[key as ChemElement["category"]].color];
    return `<span style="display:inline-block;margin-right:3mm"><span style="display:inline-block;width:3mm;height:3mm;border:1px solid #666;background:${color};vertical-align:middle"></span> ${escapeHtml(name)}</span>`;
  }).join("")}${settings.mass ? `<span style="display:inline-block">· 원소 이름 아래 숫자는 원자량, [ ]는 가장 오래 사는 동위 원소의 질량수</span>` : ""}</p>`;
  return table + legend;
}

export function periodicSheetHtml(title: string, settings: TableSettings, mode: SheetMode) {
  const guide = settings.blank === "none" ? "" : `<p style="margin:0 0 2mm;font-size:10pt">빈칸에 알맞은 ${settings.blank === "symbol" ? "원소 기호" : settings.blank === "name" ? "원소 이름" : "원소 기호와 이름"}을 쓰시오.</p>`;
  const answers = settings.answers && settings.blank !== "none" ? answerSection(periodicTableHtml(settings, { reveal: true }), mode) : "";
  return clipboardWrap(sheetHead(title || `주기율표 (${tableRanges[settings.range]})`) + guide + periodicTableHtml(settings) + answers, mode);
}

/* ───── 전자 배치 학습지 ───── */
export type ElectronAsk = "config" | "shells" | "valence" | "bohr";
export const electronAsks: Record<ElectronAsk, string> = { config: "전자 배치(오비탈)", shells: "껍질별 전자 수", valence: "원자가 전자 수", bohr: "원자 모형 그리기" };

export function electronSheet(zs: number[], asks: ElectronAsk[]): SheetSection[] {
  if (!zs.length || !asks.length) return [];
  const tableAsks = asks.filter(ask => ask !== "bohr");
  const sections: SheetSection[] = [];
  if (tableAsks.length) {
    const head = ["원소", "원자 번호", ...tableAsks.map(ask => electronAsks[ask])];
    const value = (z: number, ask: ElectronAsk) => ask === "config" ? configHtml(z) : ask === "shells" ? shells(z).map((count, index) => `${SHELL_NAMES[index]} ${count}`).join(", ") : String(valenceElectrons(z) ?? "—");
    const valueText = (z: number, ask: ElectronAsk) => ask === "config" ? configText(z) : ask === "shells" ? shells(z).join(", ") : String(valenceElectrons(z) ?? "—");
    const rowsBlank = zs.map(z => [`${escapeHtml(ELEMENTS[z - 1].name)} (${ELEMENTS[z - 1].symbol})`, String(z), ...tableAsks.map(() => "")]);
    const rowsFull = zs.map(z => [`${escapeHtml(ELEMENTS[z - 1].name)} (${ELEMENTS[z - 1].symbol})`, String(z), ...tableAsks.map(ask => value(z, ask))]);
    const problem: SheetProblem = {
      html: `다음 원소의 ${tableAsks.map(ask => electronAsks[ask]).join(", ")}를 쓰시오.${sheetTable(head, rowsBlank, { widths: ["18%", "11%"] }).replace(/<td style="([^"]*)"><\/td>/g, '<td style="$1height:9mm"></td>')}`,
      text: `다음 원소의 ${tableAsks.map(ask => electronAsks[ask]).join(", ")}를 쓰시오. ${zs.map(z => ELEMENTS[z - 1].name).join(", ")}`,
      answerHtml: sheetTable(head, rowsFull, { widths: ["18%", "11%"] }),
      answerText: zs.map(z => `${ELEMENTS[z - 1].name}: ${tableAsks.map(ask => valueText(z, ask)).join(" / ")}`).join("; "),
    };
    sections.push({ heading: "전자 배치", problems: [problem] });
  }
  if (asks.includes("bohr")) {
    const bohr = zs.filter(z => z <= 20);
    if (bohr.length) {
      const blanks = `<div style="display:flex;flex-wrap:wrap;gap:3mm">${bohr.map(z => `<div style="text-align:center;font-size:9.5pt">${bohrSvg(z, { blank: true, size: 130 })}<br>${escapeHtml(ELEMENTS[z - 1].name)} (${ELEMENTS[z - 1].symbol})</div>`).join("")}</div>`;
      const full = `<div style="display:flex;flex-wrap:wrap;gap:3mm">${bohr.map(z => `<div style="text-align:center;font-size:9.5pt">${bohrSvg(z, { size: 120 })}<br>${escapeHtml(ELEMENTS[z - 1].name)}</div>`).join("")}</div>`;
      sections.push({
        heading: "원자 모형",
        problems: [{
          html: "원자핵의 전하량을 쓰고, 전자 껍질에 전자를 점으로 나타내시오.",
          text: `원자핵의 전하량을 쓰고, 전자 껍질에 전자를 점으로 나타내시오. ${bohr.map(z => ELEMENTS[z - 1].name).join(", ")}`,
          figure: blanks, answerHtml: "원자 모형", answerText: bohr.map(z => `${ELEMENTS[z - 1].name}: ${shells(z).join(", ")}`).join("; "), answerFigure: full,
        }],
      });
    }
  }
  return sections;
}
