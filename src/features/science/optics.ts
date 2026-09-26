/* 물리학: 얇은 렌즈·구면 거울의 상(1/a + 1/b = 1/f)과 광선 작도, 문제입니다. */
import { num, seededRandom, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export type OpticKind = "convexLens" | "concaveLens" | "concaveMirror" | "convexMirror";
export const opticKinds: Record<OpticKind, string> = { convexLens: "볼록 렌즈", concaveLens: "오목 렌즈", concaveMirror: "오목 거울", convexMirror: "볼록 거울" };
export type OpticSetup = { kind: OpticKind; focal: number; distance: number; height: number };

const isLens = (kind: OpticKind) => kind === "convexLens" || kind === "concaveLens";
const signedFocal = (setup: OpticSetup) => setup.kind === "convexLens" || setup.kind === "concaveMirror" ? Math.abs(setup.focal) : -Math.abs(setup.focal);

/** 상의 위치 b(+: 실상 쪽), 배율, 상의 성질입니다. 물체가 초점에 있으면 상이 생기지 않습니다. */
export function image(setup: OpticSetup) {
  const f = signedFocal(setup);
  const a = setup.distance;
  if (Math.abs(a - f) < 1e-9) return null;
  const b = (a * f) / (a - f);
  const magnification = -b / a;
  return {
    b, magnification, heightOut: setup.height * magnification,
    real: b > 0, upright: magnification > 0,
    size: Math.abs(magnification) > 1 + 1e-9 ? "확대" : Math.abs(magnification) < 1 - 1e-9 ? "축소" : "같은 크기",
  };
}
export const imageText = (setup: OpticSetup) => {
  const result = image(setup);
  if (!result) return "상이 생기지 않음(물체가 초점에 있음)";
  const where = isLens(setup.kind) ? (result.real ? "렌즈 뒤" : "렌즈 앞(물체 쪽)") : (result.real ? "거울 앞" : "거울 뒤");
  return `${where} ${num(Math.abs(result.b))} cm, ${result.real ? "실상" : "허상"} · ${result.upright ? "정립" : "도립"} · ${result.size}(배율 ${num(Math.abs(result.magnification))})`;
};

/** 광선 작도. 세 광선(평행 광선, 중심·꼭짓점 광선, 초점 광선)을 그리고 허상은 점선 연장선으로 찾습니다. */
export function opticSvg(setup: OpticSetup, options: { rays?: boolean; imageShown?: boolean } = {}) {
  const width = 640;
  const height = 300;
  const f = signedFocal(setup);
  const result = image(setup);
  const lens = isLens(setup.kind);
  const a = setup.distance;
  const extent = Math.max(a * 1.25, Math.abs(f) * 2.6, result ? Math.abs(result.b) * 1.15 : 0);
  const center = lens ? width / 2 : width * 0.72;
  const scale = (lens ? width / 2 - 30 : width * 0.66) / extent;
  const clampH = Math.max(setup.height, result ? Math.abs(result.heightOut) : 0);
  const vScale = Math.min(scale, 110 / clampH);
  const axisY = height / 2 + 10;
  const X = (x: number) => center + x * scale;
  const Y = (y: number) => axisY - y * vScale;
  const parts: string[] = [];
  parts.push(`<line x1="10" y1="${axisY}" x2="${width - 10}" y2="${axisY}" stroke="#555" stroke-dasharray="6 4"/>`);
  // 광학 기구
  if (lens) {
    const convex = setup.kind === "convexLens";
    parts.push(`<path d="M${center} ${axisY - 125} ${convex ? `Q${center + 16} ${axisY} ${center} ${axisY + 125} Q${center - 16} ${axisY} ${center} ${axisY - 125}` : `Q${center + 5} ${axisY} ${center} ${axisY + 125} L${center + 12} ${axisY + 125} Q${center + 3} ${axisY} ${center + 12} ${axisY - 125} Z M${center} ${axisY - 125} L${center - 12} ${axisY - 125} Q${center - 3} ${axisY} ${center - 12} ${axisY + 125} L${center} ${axisY + 125}`}" fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.5"/>`);
  } else {
    // 반사면은 왼쪽(물체 쪽)을 봅니다. 오목 거울은 가장자리가 물체 쪽으로 휘고, 볼록 거울은 반대입니다.
    const edge = setup.kind === "concaveMirror" ? -14 : 14;
    parts.push(`<path d="M${center + edge} ${axisY - 125} Q${center - edge} ${axisY} ${center + edge} ${axisY + 125}" fill="none" stroke="#1d4ed8" stroke-width="3"/>`);
    for (let y = -112; y <= 112; y += 16) parts.push(`<line x1="${center + 16}" y1="${axisY + y}" x2="${center + 26}" y2="${axisY + y - 8}" stroke="#93c5fd" stroke-width="1"/>`);
  }
  // 초점 표시
  const marks = lens ? [f, -f, 2 * f, -2 * f] : [f, 2 * f];
  for (const at of marks) {
    // 거울의 초점·곡률 중심은 오목 거울이면 앞(왼쪽), 볼록 거울이면 뒤(오른쪽)에 있습니다.
    const x = lens ? X(at) : X(-at);
    const name = Math.abs(Math.abs(at) - Math.abs(f)) < 1e-9 ? "F" : lens ? "2F" : "C";
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${axisY}" r="3" fill="#111"/>` + svgText(x, axisY + 16, name, { size: 11, anchor: "middle" }));
  }
  // 물체
  const arrow = (x: number, y: number, color: string, dashed = false) => `<line x1="${x.toFixed(1)}" y1="${axisY}" x2="${x.toFixed(1)}" y2="${Y(y).toFixed(1)}" stroke="${color}" stroke-width="3"${dashed ? ` stroke-dasharray="5 3"` : ""}/><path d="M${x.toFixed(1)} ${Y(y).toFixed(1)} l-6 ${y > 0 ? 10 : -10} h12 z" fill="${color}"/>`;
  parts.push(arrow(X(-a), setup.height, "#16a34a") + svgText(X(-a), Y(setup.height) - 6, "물체", { size: 11, anchor: "middle", color: "#166534" }));
  if (result && options.rays !== false) {
    const top: [number, number] = [-a, setup.height];
    // 렌즈: 상의 x는 +b(오른쪽이 실상). 거울: 실상은 앞(왼쪽) -b, 허상은 뒤 +|b|.
    const imageX = lens ? result.b : -result.b;
    const imageTop: [number, number] = [imageX, result.heightOut];
    const hits = [setup.height, 0, result.heightOut];
    const colors = ["#dc2626", "#ea580c", "#9333ea"];
    hits.forEach((hit, index) => {
      const at: [number, number] = [0, hit];
      parts.push(`<line x1="${X(top[0]).toFixed(1)}" y1="${Y(top[1]).toFixed(1)}" x2="${X(0).toFixed(1)}" y2="${Y(hit).toFixed(1)}" stroke="${colors[index]}" stroke-width="1.6"/>`);
      // 나가는 방향: 실상이면 상 쪽으로, 허상이면 상에서 멀어지는 쪽으로
      let dx: number; let dy: number;
      if (result.real) { dx = imageTop[0] - at[0]; dy = imageTop[1] - at[1]; }
      else { dx = at[0] - imageTop[0]; dy = at[1] - imageTop[1]; }
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return;
      const length = Math.hypot(dx * scale, dy * vScale) || 1;
      const reach = 700;
      const endX = X(0) + (dx * scale / length) * reach;
      const endY = Y(hit) - (dy * vScale / length) * reach;
      parts.push(`<line x1="${X(0).toFixed(1)}" y1="${Y(hit).toFixed(1)}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke="${colors[index]}" stroke-width="1.6"/>`);
      if (!result.real) parts.push(`<line x1="${X(0).toFixed(1)}" y1="${Y(hit).toFixed(1)}" x2="${X(imageTop[0]).toFixed(1)}" y2="${Y(imageTop[1]).toFixed(1)}" stroke="${colors[index]}" stroke-width="1.2" stroke-dasharray="5 4"/>`);
    });
    if (options.imageShown !== false) parts.push(arrow(X(imageX), result.heightOut, "#2563eb", !result.real) + svgText(X(imageX), Y(result.heightOut) + (result.heightOut > 0 ? -6 : 16), result.real ? "실상" : "허상", { size: 11, anchor: "middle", color: "#1d4ed8" }));
  }
  return svgWrap(width, height, `<defs><clipPath id="optic-clip"><rect x="0" y="0" width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#optic-clip)">${parts.join("")}</g>`);
}

/* ───── 문제 ───── */
export function opticProblems(kinds: OpticKind[], count: number, seed: number): SheetSection[] {
  if (!kinds.length) return [];
  const random = seededRandom(seed * 19 + 7);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const problems: SheetProblem[] = [];
  for (let index = 0; index < count; index += 1) {
    const kind = kinds[index % kinds.length];
    let setup: OpticSetup | null = null;
    for (let attempt = 0; attempt < 60 && !setup; attempt += 1) {
      const focal = pick([10, 12, 15, 20]);
      const distance = pick([5, 6, 8, 10, 12, 15, 20, 24, 30, 36, 40, 60]);
      const candidate = { kind, focal, distance, height: 4 };
      const result = image(candidate);
      if (result && Number.isInteger(Math.round(result.b * 10) / 10) && Math.abs(result.b) <= 90 && Math.abs(result.magnification) <= 4) setup = candidate;
    }
    if (!setup) continue;
    const name = opticKinds[kind];
    problems.push({
      html: `초점 거리가 ${setup.focal} cm인 ${name}의 앞 ${setup.distance} cm 되는 곳에 물체를 놓았다. 상의 위치와 성질(실상·허상, 정립·도립, 확대·축소)을 쓰고, 광선을 작도하여 상을 그리시오.`,
      text: `초점 거리가 ${setup.focal} cm인 ${name}의 앞 ${setup.distance} cm 되는 곳에 물체를 놓았다. 상의 위치와 성질을 쓰시오.`,
      figure: opticSvg(setup, { rays: false }), answerFigure: opticSvg(setup),
      answerHtml: imageText(setup), answerText: imageText(setup), space: 6,
    });
  }
  return [{ heading: "렌즈와 거울에 의한 상", problems }];
}
