/* 기하 Ⅱ. 공간도형과 공간좌표: 사선 투영 좌표 그림, 두 점 사이의 거리, 내분점, 대칭점, 구의 방정식, 정사영의 넓이, 삼수선 정리 그림입니다. */
import { arrowSvg, mathProblem, q, qTex, radicalTex, svgText, svgWrap, tex, type Q, type SheetProblem, type SheetSection } from "./core";
import { coefTerm, picker, ratioParticle } from "./pg-common";

export type P3 = [number, number, number];

/** 두 점 사이의 거리의 제곱 */
export const dist2 = (a: P3, b: P3) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
/** 거리 TeX(근호 간단히) */
export const distTex = (a: P3, b: P3) => radicalTex(1, dist2(a, b));
/** 선분 AB를 m : n으로 내분하는 점(분수로 정확히) */
export const internal = (a: P3, b: P3, m: number, n: number): [Q, Q, Q] => [0, 1, 2].map(i => q(m * b[i] + n * a[i], m + n)) as [Q, Q, Q];
export const pointTex = (point: (number | Q)[]) => `(${point.map(value => typeof value === "number" ? String(value) : qTex(value)).join(",\\ ")})`;

export type Mirror = "xy" | "yz" | "zx" | "x" | "y" | "z" | "o";
export const mirrorNames: Record<Mirror, string> = { xy: "xy평면", yz: "yz평면", zx: "zx평면", x: "x축", y: "y축", z: "z축", o: "원점" };
/** 대칭점: 평면이면 그 평면에 없는 좌표의 부호, 축이면 나머지 두 좌표의 부호를 바꿉니다. */
export function mirror([x, y, z]: P3, about: Mirror): P3 {
  const map: Record<Mirror, P3> = { xy: [x, y, -z], yz: [-x, y, z], zx: [x, -y, z], x: [x, -y, -z], y: [-x, y, -z], z: [-x, -y, z], o: [-x, -y, -z] };
  return map[about].map(value => (Object.is(value, -0) ? 0 : value)) as P3;
}

/** 구 x² + y² + z² + Ax + By + Cz + D = 0 의 중심과 반지름의 제곱 */
export function sphereFromGeneral(A: number, B: number, C: number, D: number) {
  const center: [Q, Q, Q] = [q(-A, 2), q(-B, 2), q(-C, 2)];
  const r2 = q(A * A + B * B + C * C - 4 * D, 4);
  return { center, r2, valid: r2.n > 0 };
}
/** 중심 (a, b, c), 반지름 r인 구의 표준형 TeX */
export function sphereTex(center: P3, r2: number) {
  const part = (v: string, c: number) => (c === 0 ? `${v}^{2}` : `(${v}${c > 0 ? "-" : "+"}${Math.abs(c)})^{2}`);
  return `${part("x", center[0])}+${part("y", center[1])}+${part("z", center[2])}=${r2}`;
}
/** 표준형을 전개한 일반형 TeX */
export function sphereGeneralTex(center: P3, r2: number) {
  const [a, b, c] = center;
  const D = a * a + b * b + c * c - r2;
  const term = (coef: number, v: string) => (coef === 0 ? "" : `${coef > 0 ? "+" : "-"}${Math.abs(coef) === 1 ? "" : Math.abs(coef)}${v}`);
  return `x^{2}+y^{2}+z^{2}${term(-2 * a, "x")}${term(-2 * b, "y")}${term(-2 * c, "z")}${D === 0 ? "" : D > 0 ? `+${D}` : D}=0`;
}

/** 정사영의 넓이: S′ = S cos θ (θ = 0, 30, 45, 60, 90°)를 TeX로 */
export function projectionAreaTex(area: number, angle: 0 | 30 | 45 | 60 | 90) {
  if (angle === 0) return String(area);
  if (angle === 90) return "0";
  if (angle === 60) return qTex(q(area, 2));
  const root = angle === 30 ? 3 : 2;
  const coef = q(area, 2);
  return coef.d === 1 ? `${coef.n === 1 ? "" : coef.n}\\sqrt{${root}}` : `\\frac{${coef.n === 1 ? "" : coef.n}\\sqrt{${root}}}{${coef.d}}`;
}
export const projectionArea = (area: number, angle: number) => area * Math.cos((angle * Math.PI) / 180);

/* ───── 그림 ───── */

/** 사선 투영: x축은 왼쪽 아래, y축은 오른쪽, z축은 위 */
export function projector(scale: number, origin: [number, number]) {
  const k = 0.55;
  const angle = (225 * Math.PI) / 180;
  return ([x, y, z]: P3): [number, number] => [origin[0] + scale * (y + k * x * Math.cos(angle)), origin[1] - scale * (z + k * x * Math.sin(angle))];
}
/** 점들을 공간좌표에 찍은 그림. 점마다 좌표축으로 내린 점선을 그립니다. */
export function spaceSvg(points: { name: string; at: P3 }[], options: { segment?: [number, number]; sphere?: { center: P3; r: number } } = {}) {
  const extent = Math.max(3, ...points.flatMap(point => point.at.map(Math.abs))) + 1;
  const width = 360;
  const height = 320;
  const scale = 120 / extent;
  const to = projector(scale, [width / 2 - 10, height / 2 + 20]);
  const parts: string[] = [];
  const line = (a: P3, b: P3, color = "#111", dash = false, width = 1.2) => { const [x1, y1] = to(a); const [x2, y2] = to(b); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${width}"${dash ? ` stroke-dasharray="4 3"` : ""}/>`; };
  const axis = (end: P3, label: string) => { const [x1, y1] = to([0, 0, 0]); const [x2, y2] = to(end); const [lx, ly] = to(end.map(v => v * 1.08) as P3); return arrowSvg(x1, y1, x2, y2, "#111", 1.4) + svgText(lx, ly + 4, label, { size: 13, anchor: "middle", italic: true }); };
  parts.push(axis([extent, 0, 0], "x"), axis([0, extent, 0], "y"), axis([0, 0, extent], "z"));
  const [ox, oy] = to([0, 0, 0]);
  parts.push(svgText(ox - 10, oy + 14, "O", { size: 12, italic: true }));
  if (options.sphere) {
    const [cx, cy] = to(options.sphere.center);
    const r = options.sphere.r * scale;
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="#dbeafe" fill-opacity=".5" stroke="#1d4ed8" stroke-width="1.4"/>`, `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.3).toFixed(1)}" fill="none" stroke="#1d4ed8" stroke-dasharray="4 3"/>`);
  }
  for (const { at } of points) {
    const [x, y] = at;
    const foot: P3 = [x, y, 0];
    parts.push(line([x, 0, 0], foot, "#94a3b8", true, 1), line([0, y, 0], foot, "#94a3b8", true, 1), line(foot, at, "#94a3b8", true, 1));
  }
  if (options.segment) parts.push(line(points[options.segment[0]].at, points[options.segment[1]].at, "#dc2626", false, 2));
  for (const { name, at } of points) {
    const [x, y] = to(at);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="#dc2626"/>`, svgText(x + 6, y - 6, `${name}(${at.join(", ")})`, { size: 11.5, weight: 700 }));
  }
  return svgWrap(width, height, parts.join(""));
}

/** 삼수선 정리 그림: 평면 α 밖의 점 P, PO ⊥ α, 평면 위 직선 l, OH ⊥ l 이면 PH ⊥ l */
export function threePerpendicularSvg() {
  const width = 380;
  const height = 250;
  const plane = "M40 190 L250 190 L340 110 L130 110 Z";
  const O: [number, number] = [150, 160];
  const P: [number, number] = [150, 40];
  const H: [number, number] = [238, 145];
  const l1: [number, number] = [190, 190];
  const l2: [number, number] = [295, 110];
  const mark = (at: [number, number], dx: number, dy: number, ex: number, ey: number) => `<path d="M${at[0] + dx} ${at[1] + dy} L${at[0] + dx + ex} ${at[1] + dy + ey} L${at[0] + ex} ${at[1] + ey}" fill="none" stroke="#111" stroke-width="1"/>`;
  return svgWrap(width, height, [
    `<path d="${plane}" fill="#eef2ff" stroke="#6366f1" stroke-width="1.3"/>`,
    svgText(58, 182, "α", { size: 14, italic: true, color: "#4f46e5" }),
    `<line x1="${l1[0]}" y1="${l1[1]}" x2="${l2[0]}" y2="${l2[1]}" stroke="#111" stroke-width="1.6"/>`, svgText(l2[0] + 4, l2[1] - 2, "l", { size: 13, italic: true }),
    `<line x1="${P[0]}" y1="${P[1]}" x2="${O[0]}" y2="${O[1]}" stroke="#dc2626" stroke-width="1.6"/>`,
    `<line x1="${O[0]}" y1="${O[1]}" x2="${H[0]}" y2="${H[1]}" stroke="#2563eb" stroke-width="1.6"/>`,
    `<line x1="${P[0]}" y1="${P[1]}" x2="${H[0]}" y2="${H[1]}" stroke="#16a34a" stroke-width="1.6" stroke-dasharray="5 3"/>`,
    mark(O, 0, -10, 10, -2), mark(H, -8, 5, 5, -5),
    ...[["P", P, -18, 0], ["O", O, -16, 12], ["H", H, 6, 16]].map(([name, at, dx, dy]) => `<circle cx="${(at as number[])[0]}" cy="${(at as number[])[1]}" r="3" fill="#111"/>${svgText((at as number[])[0] + (dx as number), (at as number[])[1] + (dy as number), name as string, { size: 13, weight: 700 })}`),
    svgText(width / 2, height - 12, "PO ⊥ α, OH ⊥ l 이면 PH ⊥ l", { size: 12, anchor: "middle", color: "#333" }),
  ].join(""));
}

/* ───── 문제 ───── */
export type SpaceAsk = "distance" | "division" | "mirror" | "sphere" | "general" | "projection";
export const spaceAsks: Record<SpaceAsk, string> = {
  distance: "두 점 사이의 거리", division: "선분의 내분점", mirror: "대칭인 점", sphere: "구의 방정식", general: "구의 중심·반지름", projection: "정사영의 넓이",
};

export function spaceProblems(asks: SpaceAsk[], perAsk: number, seed: number): SheetSection[] {
  const { pick, int } = picker(seed * 31 + 19);
  const problems: SheetProblem[] = [];
  const add = (html: string, answer: string, options: Partial<SheetProblem> = {}) => problems.push(mathProblem(html, answer, { space: 14, ...options }));
  const point = (): P3 => [int(-4, 5), int(-4, 5), int(-3, 5)];
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    if (ask === "distance") {
      const a = point();
      let b = point();
      while (dist2(a, b) === 0) b = point();
      add(`두 점 ${tex(`A${pointTex(a)}`)}, ${tex(`B${pointTex(b)}`)} 사이의 거리를 구하시오.`,
        `${tex(`\\overline{AB}=\\sqrt{${[0, 1, 2].map(i => `(${b[i]}${a[i] < 0 ? `+${-a[i]}` : `-${a[i]}`})^{2}`).join("+")}}=${distTex(a, b)}`)}`, { answerFigure: spaceSvg([{ name: "A", at: a }, { name: "B", at: b }], { segment: [0, 1] }) });
    } else if (ask === "division") {
      const [m, n] = pick<[number, number]>([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [1, 1]]);
      const a = point();
      const b = point();
      add(`두 점 ${tex(`A${pointTex(a)}`)}, ${tex(`B${pointTex(b)}`)}에 대하여 선분 AB를 ${tex(`${m}:${n}`)}${ratioParticle(n)} 내분하는 점의 좌표를 구하시오.`,
        `${tex(pointTex(internal(a, b, m, n)))} (${tex(`\\left(\\frac{${coefTerm(m, "x_{2}")}+${coefTerm(n, "x_{1}")}}{${m + n}},\\ \\cdots\\right)`)})`);
    } else if (ask === "mirror") {
      const a = point().map(v => v || 2) as P3;
      const about = pick(Object.keys(mirrorNames) as Mirror[]);
      add(`점 ${tex(`P${pointTex(a)}`)}를 ${mirrorNames[about]}에 대하여 대칭이동한 점의 좌표를 구하시오.`, tex(pointTex(mirror(a, about))));
    } else if (ask === "sphere") {
      const center = point();
      if (index % 2 === 0) {
        const r = int(1, 6);
        add(`중심이 ${tex(pointTex(center))}이고 반지름의 길이가 ${r}인 구의 방정식을 구하시오.`, tex(sphereTex(center, r * r)));
      } else {
        let other = point();
        while (dist2(center, other) === 0) other = point();
        add(`중심이 ${tex(`C${pointTex(center)}`)}이고 점 ${tex(`P${pointTex(other)}`)}를 지나는 구의 방정식을 구하시오.`,
          `${tex(sphereTex(center, dist2(center, other)))} (반지름 ${tex(`\\overline{CP}=${distTex(center, other)}`)})`);
      }
    } else if (ask === "general") {
      const center = point();
      const r = int(1, 5);
      const { center: found, r2 } = sphereFromGeneral(-2 * center[0], -2 * center[1], -2 * center[2], center[0] ** 2 + center[1] ** 2 + center[2] ** 2 - r * r);
      add(`구 ${tex(sphereGeneralTex(center, r * r))}의 중심의 좌표와 반지름의 길이를 구하시오.`,
        `중심 ${tex(pointTex(found))}, 반지름 ${tex(radicalTex(1, r2.n / r2.d))} (완전제곱식으로 고치면 ${tex(sphereTex(center, r * r))})`);
    } else {
      const angle = pick([30, 45, 60] as const);
      const area = pick([4, 6, 8, 10, 12, 18]);
      add(`넓이가 ${area}인 평면 도형을, 이 도형이 있는 평면과 이루는 각의 크기가 ${angle}°인 평면 위로 정사영한 도형의 넓이를 구하시오.`,
        `${tex(`${area}\\cos ${angle}°=${projectionAreaTex(area, angle)}`)}`);
    }
  }
  return [{ heading: "공간좌표", problems }];
}
