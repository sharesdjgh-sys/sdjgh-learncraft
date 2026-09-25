import type { ReactNode } from "react";
import type { PartItem, PartKind, Point } from "@/lib/science-figure/model";

export const INK = "#1f2937";
const PAPER = "#ffffff";
const GLASS = "#f8f9fa";
const FLAME = { fill: "#ffd43b", stroke: "#f08c00" };

const line = (x1: number, y1: number, x2: number, y2: number, width = 2) => <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={width} />;
const leads = (inner: number, outer: number) => <>{line(-outer, 0, -inner, 0)}{line(inner, 0, outer, 0)}</>;
const letter = (value: string, size = 18) => <text x={0} y={size * 0.36} textAnchor="middle" fontSize={size} fontWeight={700} fill={INK} stroke="none">{value}</text>;

/** 빗금: 선분 from→to를 따라 한쪽(side)으로 짧은 사선을 긋습니다. */
function hatch(from: Point, to: Point, side: 1 | -1, spacing = 11, size = 9) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const [ux, uy] = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
  const [nx, ny] = [-uy * side, ux * side];
  const marks: ReactNode[] = [];
  for (let distance = spacing / 2; distance < length; distance += spacing) {
    const [x, y] = [from[0] + ux * distance, from[1] + uy * distance];
    marks.push(<line key={distance} x1={x} y1={y} x2={x + (nx - ux * 0.8) * size} y2={y + (ny - uy * 0.8) * size} strokeWidth={1.4} />);
  }
  return marks;
}

function curveHatch(p0: Point, p1: Point, p2: Point, dx: number) {
  const marks: ReactNode[] = [];
  for (let t = 0.04; t < 1; t += 0.08) {
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1];
    marks.push(<line key={t} x1={x} y1={y} x2={x + dx} y2={y + 7} strokeWidth={1.4} />);
  }
  return marks;
}

function zigzag(from: number, to: number, peaks: number, amplitude: number) {
  const step = (to - from) / (peaks * 2);
  const points = [`${from},0`];
  for (let index = 0; index < peaks * 2; index += 1) points.push(`${from + step * (index + 0.5)},${index % 2 ? amplitude : -amplitude}`);
  points.push(`${to},0`);
  return points.join(" ");
}

/** 액체를 담는 그릇: 안쪽 모양(inner)으로 잘라 바닥(bottom)부터 level% 높이까지 채웁니다. */
function Liquid({ uid, inner, top, bottom, level, color }: { uid: string; inner: string; top: number; bottom: number; level: number; color: string }) {
  if (level <= 0) return null;
  const surface = bottom - (bottom - top) * (level / 100);
  return <>
    <clipPath id={`${uid}-liquid`}><path d={inner} /></clipPath>
    <g clipPath={`url(#${uid}-liquid)`}>
      <rect x={-200} y={surface} width={400} height={bottom - surface + 20} fill={color} stroke="none" />
      <line x1={-200} y1={surface} x2={200} y2={surface} stroke="#4dabf7" strokeWidth={1.2} />
    </g>
  </>;
}

type DrawProps = { item: PartItem; uid: string };

const draw: Record<PartKind, (props: DrawProps) => ReactNode> = {
  cell: () => <>
    {line(-30, 0, -4, 0)}{line(4, 0, 30, 0)}
    {line(-4, -18, -4, 18, 2.2)}{line(4, -9, 4, 9, 5)}
    <text x={-14} y={-10} textAnchor="middle" fontSize={12} fill={INK} stroke="none">+</text>
    <text x={15} y={-8} textAnchor="middle" fontSize={12} fill={INK} stroke="none">−</text>
  </>,
  battery: () => <>
    {line(-40, 0, -14, 0)}{line(-6, 0, 6, 0)}{line(14, 0, 40, 0)}
    {line(-14, -18, -14, 18, 2.2)}{line(-6, -9, -6, 9, 5)}
    {line(6, -18, 6, 18, 2.2)}{line(14, -9, 14, 9, 5)}
    <text x={-24} y={-10} textAnchor="middle" fontSize={12} fill={INK} stroke="none">+</text>
    <text x={24} y={-8} textAnchor="middle" fontSize={12} fill={INK} stroke="none">−</text>
  </>,
  dcSource: () => <>
    {leads(26, 35)}
    <rect x={-26} y={-18} width={52} height={36} rx={5} fill={PAPER} />
    <text x={-12} y={6} textAnchor="middle" fontSize={16} fontWeight={700} fill={INK} stroke="none">+</text>
    <text x={12} y={6} textAnchor="middle" fontSize={16} fontWeight={700} fill={INK} stroke="none">−</text>
  </>,
  resistor: () => <>{leads(20, 35)}<rect x={-20} y={-8} width={40} height={16} fill={PAPER} /></>,
  resistorZigzag: () => <>{leads(22, 35)}<polyline points={zigzag(-22, 22, 4, 8)} fill="none" /></>,
  variableResistor: () => <>
    {leads(20, 35)}<rect x={-20} y={-8} width={40} height={16} fill={PAPER} />
    {line(-18, 15, 18, -14)}<polygon points="21,-17 11,-14 17,-8" fill={INK} stroke="none" />
  </>,
  bulb: () => <>{leads(14, 30)}<circle r={14} fill={PAPER} />{line(-10, -10, 10, 10)}{line(-10, 10, 10, -10)}</>,
  switchOpen: () => <>
    {line(-30, 0, -18, 0)}{line(18, 0, 30, 0)}{line(-18, 0, 14, -14)}
    <circle cx={-18} r={2.8} fill={INK} /><circle cx={18} r={2.8} fill={INK} />
  </>,
  switchClosed: () => <>
    {line(-30, 0, 30, 0)}
    <circle cx={-18} r={2.8} fill={INK} /><circle cx={18} r={2.8} fill={INK} />
  </>,
  ammeter: () => <>{leads(16, 30)}<circle r={16} fill={PAPER} />{letter("A")}</>,
  voltmeter: () => <>{leads(16, 30)}<circle r={16} fill={PAPER} />{letter("V")}</>,
  galvanometer: () => <>{leads(16, 30)}<circle r={16} fill={PAPER} />{letter("G")}</>,
  diode: () => <>{leads(10, 30)}<polygon points="-10,-11 -10,11 10,0" fill={PAPER} />{line(10, -11, 10, 11, 2.2)}</>,
  capacitor: () => <>{leads(5, 25)}{line(-5, -15, -5, 15, 2.4)}{line(5, -15, 5, 15, 2.4)}</>,
  coil: () => <>
    {leads(35, 45)}
    <path d="M-35,0 a7,9 0 0 1 14,0 a7,9 0 0 1 14,0 a7,9 0 0 1 14,0 a7,9 0 0 1 14,0 a7,9 0 0 1 14,0" fill="none" />
  </>,
  junction: () => <circle r={4} fill={INK} />,

  convexLens: () => <path d="M0,-75 Q28,0 0,75 Q-28,0 0,-75 Z" fill="#e7f5ff" />,
  concaveLens: () => <path d="M-15,-75 L15,-75 Q3,0 15,75 L-15,75 Q-3,0 -15,-75 Z" fill="#e7f5ff" />,
  planeMirror: () => <>{line(0, -75, 0, 75, 3)}{hatch([1, -75], [1, 75], -1)}</>,
  concaveMirror: () => <><path d="M-15,-75 Q15,0 -15,75" fill="none" strokeWidth={3} />{curveHatch([-14, -75], [16, 0], [-14, 75], 9)}</>,
  convexMirror: () => <><path d="M15,-75 Q-15,0 15,75" fill="none" strokeWidth={3} />{curveHatch([16, -75], [-14, 0], [16, 75], 9)}</>,
  objectArrow: () => <>{line(0, 35, 0, -22, 3)}<polygon points="0,-35 -8,-19 8,-19" fill={INK} stroke="none" /></>,
  candle: () => <>
    <rect x={-8} y={-8} width={16} height={48} fill={PAPER} />{line(0, -8, 0, -15, 1.6)}
    <path d="M0,-40 Q8,-24 0,-15 Q-8,-24 0,-40 Z" fill={FLAME.fill} stroke={FLAME.stroke} />
  </>,
  lightSource: () => <>
    <circle r={12} fill="#fff3bf" />
    {Array.from({ length: 8 }, (_, index) => {
      const angle = (index * Math.PI) / 4;
      return <line key={index} x1={Math.cos(angle) * 16} y1={Math.sin(angle) * 16} x2={Math.cos(angle) * 22} y2={Math.sin(angle) * 22} strokeWidth={1.8} />;
    })}
  </>,
  prism: () => <polygon points="0,-44 50,44 -50,44" fill="#f1f3f5" />,
  screen: () => <rect x={-5} y={-70} width={10} height={140} fill="#dee2e6" />,
  doubleSlit: () => <g strokeLinecap="butt">{line(0, -75, 0, -18, 6)}{line(0, -8, 0, 8, 6)}{line(0, 18, 0, 75, 6)}</g>,
  eye: () => <><path d="M-25,0 Q0,-18 25,0 Q0,18 -25,0 Z" fill={PAPER} /><circle cx={4} r={7.5} fill="#495057" stroke="none" /><circle cx={4} r={3} fill={INK} stroke="none" /></>,
  point: () => <circle r={3.5} fill={INK} stroke="none" />,

  beaker: ({ item, uid }) => {
    const outline = "M-40,-46 Q-36,-44 -36,-40 L-36,40 Q-36,45 -31,45 L31,45 Q36,45 36,40 L36,-45";
    return <>
      <path d="M-36,-44 L-36,40 Q-36,45 -31,45 L31,45 Q36,45 36,40 L36,-45 Z" fill={GLASS} stroke="none" />
      <Liquid uid={uid} inner="M-35,-44 L-35,40 Q-35,44 -31,44 L31,44 Q35,44 35,40 L35,-44 Z" top={-40} bottom={44} level={item.liquid ?? 0} color={item.liquidColor ?? "#a5d8ff"} />
      <path d={outline} fill="none" />
      {[-20, 0, 20].map((y) => <line key={y} x1={22} y1={y} x2={32} y2={y} strokeWidth={1.2} />)}
    </>;
  },
  flask: ({ item, uid }) => {
    const body = "M-10,-50 L-10,-15 L-38,44 Q-40,50 -34,50 L34,50 Q40,50 38,44 L10,-15 L10,-50";
    return <>
      <path d={`${body} Z`} fill={GLASS} stroke="none" />
      <Liquid uid={uid} inner="M-9,-50 L-9,-15 L-37,44 Q-38,49 -33,49 L33,49 Q38,49 37,44 L9,-15 L9,-50 Z" top={-15} bottom={49} level={item.liquid ?? 0} color={item.liquidColor ?? "#a5d8ff"} />
      <path d={body} fill="none" />{line(-13, -50, 13, -50)}
    </>;
  },
  testTube: ({ item, uid }) => <>
    <path d="M-10,-50 L-10,38 A10,10 0 0 0 10,38 L10,-50 Z" fill={GLASS} stroke="none" />
    <Liquid uid={uid} inner="M-9,-50 L-9,38 A9,9 0 0 0 9,38 L9,-50 Z" top={-45} bottom={48} level={item.liquid ?? 0} color={item.liquidColor ?? "#a5d8ff"} />
    <path d="M-10,-50 L-10,38 A10,10 0 0 0 10,38 L10,-50" fill="none" />{line(-13, -50, 13, -50)}
  </>,
  graduatedCylinder: ({ item, uid }) => <>
    <rect x={-12} y={-65} width={24} height={115} fill={GLASS} stroke="none" />
    <Liquid uid={uid} inner="M-11,-65 L-11,50 L11,50 L11,-65 Z" top={-60} bottom={50} level={item.liquid ?? 0} color={item.liquidColor ?? "#a5d8ff"} />
    <path d="M-12,-65 L-12,50 L12,50 L12,-65" fill="none" />
    <rect x={-17} y={50} width={34} height={10} rx={2} fill={PAPER} />
    {Array.from({ length: 10 }, (_, index) => <line key={index} x1={-12} y1={40 - index * 10} x2={index % 5 === 0 ? -3 : -6} y2={40 - index * 10} strokeWidth={1} />)}
  </>,
  gasJar: ({ item, uid }) => <>
    <path d="M-25,-40 L-25,38 Q-25,45 -18,45 L18,45 Q25,45 25,38 L25,-40 Z" fill={GLASS} stroke="none" />
    <Liquid uid={uid} inner="M-24,-40 L-24,38 Q-24,44 -18,44 L18,44 Q24,44 24,38 L24,-40 Z" top={-38} bottom={44} level={item.liquid ?? 0} color={item.liquidColor ?? "#a5d8ff"} />
    <path d="M-25,-40 L-25,38 Q-25,45 -18,45 L18,45 Q25,45 25,38 L25,-40" fill="none" />
    <rect x={-30} y={-45} width={60} height={4} fill="#e9ecef" />
  </>,
  trough: ({ item, uid }) => <>
    <path d="M-85,-35 L-85,30 Q-85,35 -80,35 L80,35 Q85,35 85,30 L85,-35 Z" fill={GLASS} stroke="none" />
    <Liquid uid={uid} inner="M-84,-35 L-84,30 Q-84,34 -80,34 L80,34 Q84,34 84,30 L84,-35 Z" top={-32} bottom={34} level={item.liquid ?? 0} color={item.liquidColor ?? "#a5d8ff"} />
    <path d="M-85,-35 L-85,30 Q-85,35 -80,35 L80,35 Q85,35 85,30 L85,-35" fill="none" />
  </>,
  alcoholLamp: () => <>
    <path d="M-26,38 L26,38 Q30,38 28,30 Q24,6 8,0 L-8,0 Q-24,6 -28,30 Q-30,38 -26,38 Z" fill={GLASS} />
    <rect x={-7} y={-8} width={14} height={8} fill="#dee2e6" />{line(0, -8, 0, -15, 1.6)}
    <path d="M0,-38 Q9,-22 0,-15 Q-9,-22 0,-38 Z" fill={FLAME.fill} stroke={FLAME.stroke} />
  </>,
  stand: () => <>
    <rect x={-55} y={88} width={100} height={12} rx={2} fill="#e9ecef" />
    {line(-35, 88, -35, -100, 4)}{line(-35, -70, 50, -70, 3)}
    <rect x={-41} y={-76} width={12} height={12} fill="#dee2e6" />
    <rect x={48} y={-78} width={10} height={16} rx={2} fill="#dee2e6" />
  </>,
  tripod: () => <>
    {line(0, -38, 0, 45, 1.6)}{line(-36, -41, -46, 45, 2.4)}{line(36, -41, 46, 45, 2.4)}
    <ellipse cy={-43} rx={40} ry={5} fill="none" strokeWidth={2.4} />
  </>,
  wireGauze: () => <>
    <rect x={-45} y={-3} width={90} height={6} fill="#dee2e6" />
    {Array.from({ length: 14 }, (_, index) => <line key={index} x1={-39 + index * 6} y1={-3} x2={-39 + index * 6} y2={3} strokeWidth={0.8} />)}
    <rect x={-18} y={-3} width={36} height={6} fill="#adb5bd" stroke="none" />
  </>,
  thermometer: () => <>
    <rect x={-4} y={-62} width={8} height={116} rx={4} fill={PAPER} />
    <rect x={-1.6} y={-10} width={3.2} height={62} fill="#e03131" stroke="none" />
    <circle cy={56} r={7} fill="#e03131" />
    {Array.from({ length: 9 }, (_, index) => <line key={index} x1={4} y1={40 - index * 12} x2={8} y2={40 - index * 12} strokeWidth={1} />)}
  </>,
  dropper: () => <>
    <rect x={-8} y={-40} width={16} height={26} rx={7} fill="#495057" />
    <path d="M-5,-15 L-5,25 L-1.5,40 L1.5,40 L5,25 L5,-15 Z" fill={GLASS} />
  </>,
  funnel: () => <>
    <path d="M-35,-45 L35,-45 L6,5 L6,45 L-6,45 L-6,5 Z" fill={GLASS} />
    <path d="M-28,-40 L0,-2 L28,-40" fill="none" strokeWidth={1.2} strokeDasharray="4 3" />
  </>,
  balance: () => <>
    {line(0, -9, 0, -5, 3)}
    <rect x={-45} y={-15} width={90} height={6} rx={2} fill="#e9ecef" />
    <rect x={-60} y={-5} width={120} height={30} rx={4} fill={PAPER} />
    <rect x={-25} y={3} width={50} height={15} rx={2} fill={INK} />
    <text x={0} y={14} textAnchor="middle" fontSize={9} fill="#b2f2bb" stroke="none">0.00 g</text>
  </>,

  cart: () => <>
    <rect x={-45} y={-20} width={90} height={30} rx={3} fill="#f1f3f5" />
    <circle cx={-26} cy={15} r={10} fill={PAPER} /><circle cx={26} cy={15} r={10} fill={PAPER} />
    <circle cx={-26} cy={15} r={2} fill={INK} /><circle cx={26} cy={15} r={2} fill={INK} />
  </>,
  block: () => <rect x={-30} y={-20} width={60} height={40} fill="#f1f3f5" />,
  ball: () => <><circle r={18} fill="#f1f3f5" /><circle cx={-6} cy={-6} r={4} fill={PAPER} stroke="none" /></>,
  incline: () => <>
    <polygon points="-120,60 120,60 120,-60" fill="#f1f3f5" />
    <path d="M-86,60 A34,34 0 0 0 -89.59,44.79" fill="none" strokeWidth={1.4} />
  </>,
  ground: () => <>{line(-120, -8, 120, -8, 2.5)}{hatch([-120, -7], [120, -7], 1)}</>,
  wall: () => <>{line(8, -80, 8, 80, 2.5)}{hatch([7, 80], [7, -80], -1)}</>,
  ceiling: () => <>{line(-100, 8, 100, 8, 2.5)}{hatch([100, 7], [-100, 7], 1)}</>,
  pulley: () => <>
    <circle cy={10} r={20} fill={PAPER} />{line(0, -30, 0, 10, 2.5)}<circle cy={10} r={3} fill={INK} />
  </>,
  spring: () => <polyline points={`-60,0 ${zigzag(-50, 50, 9, 10)} 60,0`} fill="none" strokeLinejoin="round" />,
  weight: () => <>
    <circle cy={-20} r={4.5} fill="none" />
    <path d="M-14,-15 L14,-15 L18,25 L-18,25 Z" fill="#ced4da" />
  </>,

  sun: () => <>
    {Array.from({ length: 12 }, (_, index) => {
      const angle = (index * Math.PI) / 6;
      return <line key={index} x1={Math.cos(angle) * 31} y1={Math.sin(angle) * 31} x2={Math.cos(angle) * 39} y2={Math.sin(angle) * 39} stroke="#f59f00" strokeWidth={2} />;
    })}
    <circle r={26} fill="#ffd43b" stroke="#f59f00" />
  </>,
  earth: () => <>
    <circle r={28} fill="#a5d8ff" />
    <path d="M-16,-18 Q-4,-24 4,-14 Q10,-4 0,2 Q-10,6 -14,-4 Z M6,8 Q16,6 18,14 Q12,22 4,18 Z" fill="#8ce99a" stroke="none" />
  </>,
  moon: () => <><circle r={14} fill="#e9ecef" /><circle cx={-4} cy={-3} r={3} fill="#ced4da" stroke="none" /><circle cx={5} cy={5} r={2} fill="#ced4da" stroke="none" /></>,
  orbit: () => <ellipse rx={150} ry={90} fill="none" stroke="#868e96" strokeDasharray="6 5" strokeWidth={1.6} />,
};

/** 부품 모양(부품 좌표, 가운데가 원점). 선 굵기는 크기를 바꿔도 일정하게 유지합니다. */
export function PartShape({ item, uid }: DrawProps) {
  return <g className="sf-part" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none">{draw[item.kind]({ item, uid })}</g>;
}
