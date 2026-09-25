import { blankFigure, createLine, createPart, type FigureDoc, type FigureItem, type LineItem, type LineStyle, type PartItem, type PartKind, type Point, type TextItem } from "./model";

type Builder = {
  part: (kind: PartKind, at: Point, patch?: Partial<PartItem>) => void;
  line: (style: LineStyle, points: Point[], patch?: Partial<LineItem>) => void;
  text: (text: string, at: Point, patch?: Partial<TextItem>) => void;
};

function figure(title: string, draw: (builder: Builder) => void): FigureDoc {
  const items: FigureItem[] = [];
  let next = 0;
  const id = () => `e${(next += 1)}`;
  draw({
    part: (kind, at, patch) => { items.push({ ...createPart(kind, id(), at), ...patch }); },
    line: (style, points, patch) => { items.push({ ...createLine(style, id(), points), ...patch }); },
    text: (text, at, patch) => { items.push({ id: id(), type: "text", x: at[0], y: at[1], text, size: 18, color: "#1f2937", ...patch }); },
  });
  return { ...blankFigure(), title, items };
}

export const figureExamples: { name: string; group: string; build: () => FigureDoc }[] = [
  {
    name: "직렬 회로와 전압계", group: "전기 회로", build: () => figure("저항의 직렬연결", ({ part, line }) => {
      part("cell", [240, 150]);
      part("switchClosed", [480, 150]);
      part("ammeter", [720, 300], { rotation: 90 });
      part("resistor", [560, 450], { label: "R₁" });
      part("resistor", [360, 450], { label: "R₂" });
      part("voltmeter", [560, 540]);
      line("wire", [[270, 150], [450, 150]]);
      line("wire", [[510, 150], [720, 150], [720, 270]]);
      line("wire", [[720, 330], [720, 450], [595, 450]]);
      line("wire", [[525, 450], [395, 450]]);
      line("wire", [[325, 450], [160, 450], [160, 150], [210, 150]]);
      line("wire", [[500, 450], [500, 540], [530, 540]]);
      line("wire", [[590, 540], [620, 540], [620, 450]]);
    }),
  },
  {
    name: "병렬 회로와 전류계", group: "전기 회로", build: () => figure("저항의 병렬연결", ({ part, line }) => {
      part("resistor", [480, 180], { label: "R₁" });
      part("resistor", [480, 320], { label: "R₂" });
      part("cell", [480, 470]);
      part("ammeter", [585, 470]);
      line("wire", [[445, 180], [300, 180], [300, 470], [450, 470]]);
      line("wire", [[445, 320], [300, 320]]);
      line("wire", [[515, 180], [660, 180], [660, 470], [615, 470]]);
      line("wire", [[515, 320], [660, 320]]);
      line("wire", [[555, 470], [510, 470]]);
    }),
  },
  {
    name: "볼록 렌즈에 의한 상", group: "빛과 파동", build: () => figure("볼록 렌즈에 의한 상", ({ part, line }) => {
      line("plain", [[80, 300], [880, 300]], { dashed: false, label: "광축", labelDx: 330, labelDy: 4 });
      part("convexLens", [480, 300]);
      part("point", [360, 300], { label: "F" });
      part("point", [600, 300], { label: "F" });
      part("objectArrow", [240, 265]);
      part("objectArrow", [720, 335], { rotation: 180, label: "상", labelDy: -70 });
      line("ray", [[240, 230], [480, 230], [840, 440]]);
      line("ray", [[240, 230], [840, 405]]);
      line("ray", [[240, 230], [480, 370], [840, 370]]);
    }),
  },
  {
    name: "빛의 반사", group: "빛과 파동", build: () => figure("빛의 반사", ({ part, line, text }) => {
      part("planeMirror", [480, 420], { rotation: 90, scale: 2 });
      line("plain", [[480, 420], [480, 170]], { label: "법선", labelDx: -24, labelDy: -110 });
      line("ray", [[300, 240], [480, 420], [660, 240]]);
      text("입사각", [440, 330], { size: 16 });
      text("반사각", [522, 330], { size: 16 });
    }),
  },
  {
    name: "물의 가열 장치", group: "실험 기구", build: () => figure("물의 가열 실험 장치", ({ part }) => {
      part("stand", [445, 380]);
      part("tripod", [520, 435]);
      part("alcoholLamp", [520, 442]);
      part("wireGauze", [520, 393]);
      part("beaker", [520, 343]);
      part("thermometer", [500, 310]);
    }),
  },
  {
    name: "빗면 위의 물체에 작용하는 힘", group: "힘과 운동", build: () => figure("빗면 위의 물체에 작용하는 힘", ({ part, line, text }) => {
      part("ground", [440, 448], { scale: 1.4 });
      part("incline", [440, 380]);
      part("block", [431, 362], { rotation: -26.57, label: "" });
      line("force", [[431, 362], [431, 452]], { label: "mg" });
      line("force", [[431, 362], [395, 290]], { label: "N" });
      text("θ", [362, 432], { size: 20 });
    }),
  },
  {
    name: "도르래에 매달린 두 물체", group: "힘과 운동", build: () => figure("도르래에 매달린 두 물체", ({ part, line }) => {
      part("ceiling", [480, 110]);
      part("pulley", [480, 140]);
      part("weight", [460, 360], { label: "m₁" });
      part("weight", [500, 300], { label: "m₂" });
      line("plain", [[460, 150], [460, 335]], { color: "#1f2937", dashed: false });
      line("plain", [[500, 150], [500, 275]], { color: "#1f2937", dashed: false });
    }),
  },
  {
    name: "용수철에 연결된 물체", group: "힘과 운동", build: () => figure("용수철에 연결된 물체", ({ part, line }) => {
      part("wall", [200, 330]);
      part("ground", [448, 418], { scale: 2 });
      part("spring", [268, 390]);
      part("block", [358, 390], { label: "" });
      line("force", [[388, 390], [468, 390]], { label: "F" });
    }),
  },
  {
    name: "지구와 달의 공전", group: "지구와 우주", build: () => figure("지구와 달의 공전", ({ part, line }) => {
      part("orbit", [480, 300], { scale: 1.4 });
      part("sun", [480, 300]);
      part("earth", [690, 300]);
      part("moon", [750, 300]);
      line("arrow", [[500, 174], [440, 176]], { label: "공전 방향", labelDy: -8 });
    }),
  },
];
