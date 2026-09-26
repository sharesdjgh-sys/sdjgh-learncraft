/* 세포와 물질대사: 세포 호흡(해당 과정·피루브산 산화·TCA 회로·전자 전달계)과 광합성(명반응·캘빈 회로) 도식, 빈칸 학습지입니다. */
import { arrowSvg, escapeHtml, sheetTable, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

type Label = { id: string; text: string; x: number; y: number; box?: boolean; color?: string; anchor?: "start" | "middle" | "end" };
type Diagram = { width: number; height: number; labels: Label[]; arrows: [number, number, number, number][]; frames: { x: number; y: number; w: number; h: number; title: string; color: string }[] };

/** 빈칸 후보(blankable)는 id가 있는 이름표입니다. */
const RESPIRATION: Diagram = {
  width: 640, height: 400,
  frames: [
    { x: 14, y: 14, w: 170, h: 372, title: "세포질", color: "#fef9c3" },
    { x: 196, y: 14, w: 430, h: 372, title: "미토콘드리아", color: "#e0f2fe" },
  ],
  labels: [
    { id: "glucose", text: "포도당(C₆)", x: 99, y: 60, box: true },
    { id: "glycolysis", text: "해당 과정", x: 108, y: 128, color: "#b45309", anchor: "start" },
    { id: "gly-out", text: "2ATP, 2NADH", x: 108, y: 148, color: "#475569", anchor: "start" },
    { id: "pyruvate", text: "피루브산(C₃) ×2", x: 99, y: 210, box: true },
    { id: "acetyl", text: "아세틸 CoA(C₂)", x: 300, y: 60, box: true },
    { id: "ox-out", text: "CO₂, NADH", x: 300, y: 100, color: "#475569" },
    { id: "oaa", text: "옥살아세트산(C₄)", x: 300, y: 250, box: true },
    { id: "citrate", text: "시트르산(C₆)", x: 470, y: 150, box: true },
    { id: "c5", text: "C₅ 화합물", x: 470, y: 250, box: true },
    { id: "tca", text: "TCA 회로", x: 385, y: 205, color: "#0369a1" },
    { id: "tca-out1", text: "CO₂, NADH", x: 560, y: 205, color: "#475569" },
    { id: "tca-out2", text: "CO₂, NADH, FADH₂, ATP", x: 385, y: 300, color: "#475569" },
    { id: "etc", text: "전자 전달계: NADH·FADH₂ → 많은 ATP, O₂ → H₂O", x: 410, y: 360, box: true },
  ],
  arrows: [[99, 76, 99, 194], [150, 210, 240, 76], [355, 60, 440, 138], [470, 166, 470, 234], [410, 250, 360, 250], [300, 234, 300, 150], [300, 150, 440, 150]],
};
const PHOTOSYNTHESIS: Diagram = {
  width: 640, height: 380,
  frames: [
    { x: 14, y: 14, w: 250, h: 352, title: "틸라코이드(명반응)", color: "#dcfce7" },
    { x: 276, y: 14, w: 350, h: 352, title: "스트로마(캘빈 회로)", color: "#f0fdf4" },
  ],
  labels: [
    { id: "light", text: "빛에너지", x: 80, y: 60, color: "#ca8a04" },
    { id: "water", text: "H₂O → O₂", x: 190, y: 60, box: true },
    { id: "lightrx", text: "광계 Ⅱ·Ⅰ, 전자 전달", x: 139, y: 130, color: "#15803d" },
    { id: "products", text: "ATP, NADPH", x: 139, y: 200, box: true },
    { id: "co2", text: "CO₂", x: 450, y: 50, box: true },
    { id: "rubp", text: "RuBP(C₅)", x: 330, y: 130, box: true },
    { id: "pga", text: "3PG(C₃)", x: 570, y: 130, box: true },
    { id: "g3p", text: "G3P(C₃)", x: 450, y: 250, box: true },
    { id: "calvin", text: "캘빈 회로", x: 450, y: 170, color: "#15803d" },
    { id: "glucose-out", text: "포도당", x: 450, y: 330, box: true },
    { id: "atp-use", text: "ATP·NADPH", x: 558, y: 184, color: "#475569", anchor: "start" },
    { id: "regen", text: "ATP", x: 330, y: 186, color: "#475569", anchor: "end" },
  ],
  arrows: [[100, 70, 130, 115], [139, 145, 139, 184], [200, 200, 520, 205], [450, 66, 360, 118], [370, 130, 530, 130], [570, 146, 490, 240], [410, 250, 330, 146], [450, 266, 450, 314]],
};
export const DIAGRAMS = { respiration: { name: "세포 호흡", diagram: RESPIRATION }, photosynthesis: { name: "광합성", diagram: PHOTOSYNTHESIS } } as const;
export type DiagramKind = keyof typeof DIAGRAMS;
export const blankableLabels = (kind: DiagramKind) => DIAGRAMS[kind].diagram.labels.filter(label => label.box || label.color === "#b45309" || label.color === "#0369a1" || label.color === "#15803d");

const MARKS = "㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩";
/** 도식 SVG. blanks에 든 이름표는 ㉠, ㉡ …으로 바꿉니다. */
export function diagramSvg(kind: DiagramKind, blanks: string[] = []) {
  const { diagram } = DIAGRAMS[kind];
  const parts: string[] = [];
  for (const frame of diagram.frames) parts.push(`<rect x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.h}" rx="14" fill="${frame.color}" stroke="#94a3b8"/>` + svgText(frame.x + 10, frame.y + 18, frame.title, { size: 11, color: "#475569", weight: 700 }));
  for (const [x1, y1, x2, y2] of diagram.arrows) parts.push(arrowSvg(x1, y1, x2, y2, "#334155", 1.6));
  for (const label of diagram.labels) {
    const blankIndex = blanks.indexOf(label.id);
    const text = blankIndex >= 0 ? MARKS[blankIndex] : label.text;
    const width = Math.max(44, [...text].length * 11 + 16);
    if (label.box) parts.push(`<rect x="${(label.x - width / 2).toFixed(1)}" y="${label.y - 14}" width="${width.toFixed(1)}" height="26" rx="6" fill="#fff" stroke="#334155"/>`);
    parts.push(svgText(label.x, label.y + 4, text, { size: label.box ? 12 : 11.5, anchor: label.anchor ?? "middle", color: blankIndex >= 0 ? "#b91c1c" : label.color ?? "#111", weight: label.box || blankIndex >= 0 ? 700 : undefined }));
  }
  return svgWrap(diagram.width, diagram.height, parts.join(""));
}

/** 포도당 1분자당 단계별 생성량입니다. */
export const RESPIRATION_TABLE = [
  ["해당 과정", "세포질", "2(순)", "2", "0", "0"],
  ["피루브산 산화", "미토콘드리아 기질", "0", "2", "0", "2"],
  ["TCA 회로", "미토콘드리아 기질", "2", "6", "2", "4"],
  ["전자 전달계", "미토콘드리아 내막", "많음", "—", "—", "—"],
];
export const respirationTableHtml = (blank = false) => sheetTable(["단계", "장소", "ATP", "NADH", "FADH₂", "CO₂"], RESPIRATION_TABLE.map(row => blank ? [row[0], "", "", "", "", ""] : row));

export function metabolismSheet(kinds: DiagramKind[], blanksPer: Record<DiagramKind, string[]>, table: boolean): SheetSection[] {
  const problems: SheetProblem[] = kinds.map(kind => {
    const blanks = blanksPer[kind];
    const { diagram, name } = DIAGRAMS[kind];
    const answers = blanks.map((id, index) => `${MARKS[index]} ${diagram.labels.find(label => label.id === id)?.text ?? ""}`);
    return {
      html: blanks.length ? `그림은 ${name} 과정을 나타낸 것이다. ${MARKS.slice(0, blanks.length).split("").join(", ")}에 알맞은 말을 쓰시오.` : `그림은 ${name} 과정을 나타낸 것이다.`,
      text: `${name} 도식의 빈칸 ${blanks.length}개를 채우시오. (그림은 인쇄본 참고)`,
      figure: diagramSvg(kind, blanks), answerFigure: blanks.length ? diagramSvg(kind) : undefined,
      answerHtml: answers.map(escapeHtml).join(", ") || "(빈칸 없음)", answerText: answers.join(", ") || "(빈칸 없음)", space: 4,
    };
  });
  if (table && kinds.includes("respiration")) problems.push({ html: `포도당 1분자가 세포 호흡으로 분해될 때 단계별로 생성되는 물질의 수를 쓰시오.${respirationTableHtml(true).replace(/<td style="([^"]*)"><\/td>/g, '<td style="$1height:8mm"></td>')}`, text: "세포 호흡 단계별 생성 물질 수 표를 완성하시오.", answerHtml: respirationTableHtml(), answerText: RESPIRATION_TABLE.map(row => row.join(" ")).join(" / ") });
  return problems.length ? [{ heading: "세포 호흡과 광합성", problems }] : [];
}
