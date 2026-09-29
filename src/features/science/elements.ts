/* 화학: 원소 118개(대한화학회 원소 이름, IUPAC 표준 원자량)와 주기율표 자리, 전자 배치입니다.
 * 원자량은 IUPAC 표준 원자량을 다섯 자리 안팎으로 줄였고, 안정한 동위 원소가 없는 원소는 가장 오래 사는 동위 원소의 질량수를 [ ]로 적습니다. */
import { supDigits } from "./sheet";

export type ElementCategory = "alkali" | "alkaline" | "transition" | "post" | "metalloid" | "nonmetal" | "halogen" | "noble" | "lanthanide" | "actinide";
export type ChemElement = {
  z: number; symbol: string; name: string; english: string;
  /** 원자량. massNumber면 표준 원자량이 없어 가장 오래 사는 동위 원소의 질량수입니다. */
  mass: number; massNumber: boolean; radioactive: boolean;
  category: ElementCategory;
  /** 교과서에서 함께 쓰는 이름(나트륨 ↔ 소듐) */
  alias?: string;
};

// [기호, 이름, 영어 이름, 원자량(방사성은 음수로 질량수)]
const RAW: [string, string, string, number][] = [
  ["H", "수소", "Hydrogen", 1.008], ["He", "헬륨", "Helium", 4.0026], ["Li", "리튬", "Lithium", 6.94], ["Be", "베릴륨", "Beryllium", 9.0122],
  ["B", "붕소", "Boron", 10.81], ["C", "탄소", "Carbon", 12.011], ["N", "질소", "Nitrogen", 14.007], ["O", "산소", "Oxygen", 15.999],
  ["F", "플루오린", "Fluorine", 18.998], ["Ne", "네온", "Neon", 20.180], ["Na", "나트륨", "Sodium", 22.990], ["Mg", "마그네슘", "Magnesium", 24.305],
  ["Al", "알루미늄", "Aluminium", 26.982], ["Si", "규소", "Silicon", 28.085], ["P", "인", "Phosphorus", 30.974], ["S", "황", "Sulfur", 32.06],
  ["Cl", "염소", "Chlorine", 35.45], ["Ar", "아르곤", "Argon", 39.948], ["K", "칼륨", "Potassium", 39.098], ["Ca", "칼슘", "Calcium", 40.078],
  ["Sc", "스칸듐", "Scandium", 44.956], ["Ti", "타이타늄", "Titanium", 47.867], ["V", "바나듐", "Vanadium", 50.942], ["Cr", "크로뮴", "Chromium", 51.996],
  ["Mn", "망가니즈", "Manganese", 54.938], ["Fe", "철", "Iron", 55.845], ["Co", "코발트", "Cobalt", 58.933], ["Ni", "니켈", "Nickel", 58.693],
  ["Cu", "구리", "Copper", 63.546], ["Zn", "아연", "Zinc", 65.38], ["Ga", "갈륨", "Gallium", 69.723], ["Ge", "저마늄", "Germanium", 72.630],
  ["As", "비소", "Arsenic", 74.922], ["Se", "셀레늄", "Selenium", 78.971], ["Br", "브로민", "Bromine", 79.904], ["Kr", "크립톤", "Krypton", 83.798],
  ["Rb", "루비듐", "Rubidium", 85.468], ["Sr", "스트론튬", "Strontium", 87.62], ["Y", "이트륨", "Yttrium", 88.906], ["Zr", "지르코늄", "Zirconium", 91.224],
  ["Nb", "나이오븀", "Niobium", 92.906], ["Mo", "몰리브데넘", "Molybdenum", 95.95], ["Tc", "테크네튬", "Technetium", -98], ["Ru", "루테늄", "Ruthenium", 101.07],
  ["Rh", "로듐", "Rhodium", 102.91], ["Pd", "팔라듐", "Palladium", 106.42], ["Ag", "은", "Silver", 107.87], ["Cd", "카드뮴", "Cadmium", 112.41],
  ["In", "인듐", "Indium", 114.82], ["Sn", "주석", "Tin", 118.71], ["Sb", "안티모니", "Antimony", 121.76], ["Te", "텔루륨", "Tellurium", 127.60],
  ["I", "아이오딘", "Iodine", 126.90], ["Xe", "제논", "Xenon", 131.29], ["Cs", "세슘", "Caesium", 132.91], ["Ba", "바륨", "Barium", 137.33],
  ["La", "란타넘", "Lanthanum", 138.91], ["Ce", "세륨", "Cerium", 140.12], ["Pr", "프라세오디뮴", "Praseodymium", 140.91], ["Nd", "네오디뮴", "Neodymium", 144.24],
  ["Pm", "프로메튬", "Promethium", -145], ["Sm", "사마륨", "Samarium", 150.36], ["Eu", "유로퓸", "Europium", 151.96], ["Gd", "가돌리늄", "Gadolinium", 157.25],
  ["Tb", "터븀", "Terbium", 158.93], ["Dy", "디스프로슘", "Dysprosium", 162.50], ["Ho", "홀뮴", "Holmium", 164.93], ["Er", "어븀", "Erbium", 167.26],
  ["Tm", "툴륨", "Thulium", 168.93], ["Yb", "이터븀", "Ytterbium", 173.05], ["Lu", "루테튬", "Lutetium", 174.97], ["Hf", "하프늄", "Hafnium", 178.49],
  ["Ta", "탄탈럼", "Tantalum", 180.95], ["W", "텅스텐", "Tungsten", 183.84], ["Re", "레늄", "Rhenium", 186.21], ["Os", "오스뮴", "Osmium", 190.23],
  ["Ir", "이리듐", "Iridium", 192.22], ["Pt", "백금", "Platinum", 195.08], ["Au", "금", "Gold", 196.97], ["Hg", "수은", "Mercury", 200.59],
  ["Tl", "탈륨", "Thallium", 204.38], ["Pb", "납", "Lead", 207.2], ["Bi", "비스무트", "Bismuth", 208.98], ["Po", "폴로늄", "Polonium", -209],
  ["At", "아스타틴", "Astatine", -210], ["Rn", "라돈", "Radon", -222], ["Fr", "프랑슘", "Francium", -223], ["Ra", "라듐", "Radium", -226],
  ["Ac", "악티늄", "Actinium", -227], ["Th", "토륨", "Thorium", 232.04], ["Pa", "프로트악티늄", "Protactinium", 231.04], ["U", "우라늄", "Uranium", 238.03],
  ["Np", "넵투늄", "Neptunium", -237], ["Pu", "플루토늄", "Plutonium", -244], ["Am", "아메리슘", "Americium", -243], ["Cm", "퀴륨", "Curium", -247],
  ["Bk", "버클륨", "Berkelium", -247], ["Cf", "캘리포늄", "Californium", -251], ["Es", "아인슈타이늄", "Einsteinium", -252], ["Fm", "페르뮴", "Fermium", -257],
  ["Md", "멘델레븀", "Mendelevium", -258], ["No", "노벨륨", "Nobelium", -259], ["Lr", "로렌슘", "Lawrencium", -262], ["Rf", "러더포듐", "Rutherfordium", -267],
  ["Db", "더브늄", "Dubnium", -268], ["Sg", "시보귬", "Seaborgium", -269], ["Bh", "보륨", "Bohrium", -270], ["Hs", "하슘", "Hassium", -269],
  ["Mt", "마이트너륨", "Meitnerium", -278], ["Ds", "다름슈타튬", "Darmstadtium", -281], ["Rg", "뢴트게늄", "Roentgenium", -282], ["Cn", "코페르니슘", "Copernicium", -285],
  ["Nh", "니호늄", "Nihonium", -286], ["Fl", "플레로븀", "Flerovium", -289], ["Mc", "모스코븀", "Moscovium", -290], ["Lv", "리버모륨", "Livermorium", -293],
  ["Ts", "테네신", "Tennessine", -294], ["Og", "오가네손", "Oganesson", -294],
];
const ALIASES: Record<string, string> = { Na: "소듐", K: "포타슘" };

const CATEGORY_SETS: [ElementCategory, string][] = [
  ["alkali", "Li Na K Rb Cs Fr"], ["alkaline", "Be Mg Ca Sr Ba Ra"],
  ["metalloid", "B Si Ge As Sb Te"], ["nonmetal", "H C N O P S Se"], ["halogen", "F Cl Br I At Ts"], ["noble", "He Ne Ar Kr Xe Rn Og"],
  ["post", "Al Ga In Sn Tl Pb Bi Po Nh Fl Mc Lv"],
];
const categoryOf = (symbol: string, z: number): ElementCategory => {
  if (z >= 57 && z <= 71) return "lanthanide";
  if (z >= 89 && z <= 103) return "actinide";
  return CATEGORY_SETS.find(([, symbols]) => symbols.split(" ").includes(symbol))?.[0] ?? "transition";
};

export const ELEMENTS: ChemElement[] = RAW.map(([symbol, name, english, mass], index) => ({
  // Th·Pa·U는 방사성이지만 자연의 동위 원소 조성이 일정해 표준 원자량이 있습니다.
  z: index + 1, symbol, name, english, mass: Math.abs(mass), massNumber: mass < 0,
  radioactive: mass < 0 || index + 1 >= 84,
  category: categoryOf(symbol, index + 1),
  ...(ALIASES[symbol] ? { alias: ALIASES[symbol] } : {}),
}));
export const elementBySymbol = new Map(ELEMENTS.map(element => [element.symbol, element]));

export const categoryInfo: Record<ElementCategory, { name: string; color: string; metal: "금속" | "준금속" | "비금속" }> = {
  alkali: { name: "알칼리 금속", color: "#ffd6d6", metal: "금속" },
  alkaline: { name: "알칼리 토금속", color: "#ffe6c7", metal: "금속" },
  transition: { name: "전이 금속", color: "#fff3bf", metal: "금속" },
  post: { name: "그 밖의 금속", color: "#e3f1d4", metal: "금속" },
  lanthanide: { name: "란타넘족", color: "#fde2f3", metal: "금속" },
  actinide: { name: "악티늄족", color: "#f3dcf9", metal: "금속" },
  metalloid: { name: "준금속", color: "#d3f0ea", metal: "준금속" },
  nonmetal: { name: "비금속", color: "#d6eaff", metal: "비금속" },
  halogen: { name: "할로젠", color: "#dcdcff", metal: "비금속" },
  noble: { name: "18족(비활성 기체)", color: "#e9e3ff", metal: "비금속" },
};
export const metalColors = { 금속: "#fff0c2", 준금속: "#d3f0ea", 비금속: "#d6eaff" } as const;

/** 교과서 계산 문제에서 쓰는 어림 원자량(H 1, C 12, O 16, Na 23, Cl 35.5 …)입니다. */
export function textbookMass(element: ChemElement) {
  if (element.symbol === "Cl") return 35.5;
  if (element.symbol === "Cu") return 63.5;
  return Math.round(element.mass);
}
export const massText = (element: ChemElement) => element.massNumber ? `[${element.mass}]` : String(element.mass);

/* ───── 주기율표 자리 ───── */
const PERIOD_ENDS = [2, 10, 18, 36, 54, 86, 118];
export type TablePosition = { period: number; group: number | null; fRow: boolean; column: number; row: number };
/** 주기·족과, 표에 그릴 칸(열 1~18, 행 1~7, 란타넘족·악티늄족은 아래 9·10행)을 구합니다. */
export function position(z: number): TablePosition {
  const period = PERIOD_ENDS.findIndex(end => z <= end) + 1;
  const start = period === 1 ? 1 : PERIOD_ENDS[period - 2] + 1;
  const at = z - start + 1;
  let group: number;
  if (period === 1) group = z === 1 ? 1 : 18;
  else if (period <= 3) group = at <= 2 ? at : at + 10;
  else if (period <= 5) group = at;
  else if (at <= 2) group = at;
  else if (at <= 17) return { period, group: null, fRow: true, column: at, row: period + 3 };
  else group = at - 14;
  return { period, group, fRow: false, column: group, row: period };
}

/* ───── 전자 배치 ───── */
const ORDER = ["1s", "2s", "2p", "3s", "3p", "4s", "3d", "4p", "5s", "4d", "5p", "6s", "4f", "5d", "6p", "7s", "5f", "6d", "7p"];
const CAPACITY: Record<string, number> = { s: 2, p: 6, d: 10, f: 14 };
// 쌓음 원리와 다른 바닥상태(실험값)입니다.
const EXCEPTIONS: Record<number, Record<string, number>> = {
  24: { "4s": 1, "3d": 5 }, 29: { "4s": 1, "3d": 10 },
  41: { "5s": 1, "4d": 4 }, 42: { "5s": 1, "4d": 5 }, 44: { "5s": 1, "4d": 7 }, 45: { "5s": 1, "4d": 8 }, 46: { "5s": 0, "4d": 10 }, 47: { "5s": 1, "4d": 10 },
  57: { "4f": 0, "5d": 1 }, 58: { "4f": 1, "5d": 1 }, 64: { "4f": 7, "5d": 1 }, 78: { "6s": 1, "5d": 9 }, 79: { "6s": 1, "5d": 10 },
  89: { "5f": 0, "6d": 1 }, 90: { "5f": 0, "6d": 2 }, 91: { "5f": 2, "6d": 1 }, 92: { "5f": 3, "6d": 1 }, 93: { "5f": 4, "6d": 1 }, 96: { "5f": 7, "6d": 1 }, 103: { "6d": 0, "7p": 1 },
};
/** 오비탈마다 들어간 전자 수를 쌓음 순서대로 돌려줍니다. 104번 이후는 계산으로 짐작한 값입니다. */
export function orbitals(z: number): [string, number][] {
  const filled: [string, number][] = [];
  let left = z;
  for (const orbital of ORDER) {
    if (left <= 0) break;
    const count = Math.min(left, CAPACITY[orbital[1]]);
    filled.push([orbital, count]);
    left -= count;
  }
  const change = EXCEPTIONS[z];
  if (change) {
    for (const [orbital, count] of Object.entries(change)) {
      const found = filled.find(([name]) => name === orbital);
      if (found) found[1] = count;
      else filled.push([orbital, count]);
    }
    filled.sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
  }
  return filled.filter(([, count]) => count > 0);
}
export const configText = (z: number) => orbitals(z).map(([orbital, count]) => `${orbital}${supDigits(String(count))}`).join(" ");
export const configHtml = (z: number) => orbitals(z).map(([orbital, count]) => `${orbital}<sup>${count}</sup>`).join(" ");
/** 전자 껍질(K, L, M, N …)마다 전자 수입니다. */
export function shells(z: number) {
  const counts: number[] = [];
  for (const [orbital, count] of orbitals(z)) {
    const n = Number(orbital[0]);
    counts[n - 1] = (counts[n - 1] ?? 0) + count;
  }
  return Array.from(counts, count => count ?? 0);
}
export const SHELL_NAMES = ["K", "L", "M", "N", "O", "P", "Q"];
/** 원자가 전자 수(주족 원소만). 18족은 화학 결합에 참여하지 않아 0입니다. */
export function valenceElectrons(z: number) {
  const { group } = position(z);
  if (group === null || (group >= 3 && group <= 12)) return null;
  if (group === 18) return 0;
  return group <= 2 ? group : group - 10;
}

/** 원자 모형(보어 모형) SVG. 20번까지 교과서처럼 껍질에 전자를 점으로 찍습니다. */
export function bohrSvg(z: number, options: { blank?: boolean; size?: number } = {}) {
  const element = ELEMENTS[z - 1];
  const counts = shells(z);
  const size = options.size ?? 180;
  const center = size / 2;
  const gap = (size / 2 - 22) / Math.max(counts.length, 1);
  const parts: string[] = [`<rect width="${size}" height="${size}" fill="#fff"/>`];
  parts.push(`<circle cx="${center}" cy="${center}" r="15" fill="#fde68a" stroke="#111" stroke-width="1.2"/>`);
  parts.push(`<text x="${center}" y="${center + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#111">${options.blank ? "" : `+${z}`}</text>`);
  counts.forEach((count, index) => {
    const radius = 15 + gap * (index + 1);
    parts.push(`<circle cx="${center}" cy="${center}" r="${radius.toFixed(1)}" fill="none" stroke="#555" stroke-width="1"/>`);
    if (options.blank) return;
    // 8개까지는 교과서처럼 위·아래·오른쪽·왼쪽에 하나씩 놓고, 5번째부터 짝을 지어 줍니다. 그보다 많으면 고르게 놓습니다.
    const angles: number[] = [];
    if (count <= 8) {
      [0, 180, 90, 270].forEach((base, direction) => {
        const here = (count > direction ? 1 : 0) + (count > direction + 4 ? 1 : 0);
        if (here === 1) angles.push(base);
        if (here === 2) angles.push(base - 14, base + 14);
      });
    } else for (let electron = 0; electron < count; electron += 1) angles.push((electron / count) * 360);
    for (const degree of angles) {
      const angle = (degree - 90) * Math.PI / 180;
      parts.push(`<circle cx="${(center + radius * Math.cos(angle)).toFixed(1)}" cy="${(center + radius * Math.sin(angle)).toFixed(1)}" r="4" fill="#2563eb"/>`);
    }
  });
  parts.push(`<text x="4" y="14" font-size="12" font-weight="700" fill="#111">${options.blank ? "" : element.symbol}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="max-width:100%;height:auto;font-family:'Malgun Gothic',sans-serif">${parts.join("")}</svg>`;
}
