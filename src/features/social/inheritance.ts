/* 법과 사회: 민법의 법정 상속(순위·상속분)과 유류분, 가계도 그림, 문제입니다. 채무·생전 증여·대습 상속은 다루지 않습니다. */
import { escapeHtml, fraction, gcd, grouped, plainText, seededRandom, subjectParticle, svgText, svgWrap, type SheetProblem, type SheetSection } from "./sheet";

export type Family = { spouse: boolean; children: number; parents: number; siblings: number };
export type HeirKind = "spouse" | "child" | "parent" | "sibling";
export type Heir = { kind: HeirKind; label: string; top: number; bottom: number };
export const kindNames: Record<HeirKind, string> = { spouse: "배우자", child: "자녀", parent: "부모", sibling: "형제자매" };
/** 유류분: 직계 비속·배우자는 법정 상속분의 1/2, 직계 존속은 1/3. 형제자매는 2024년 4월 헌법 재판소 위헌 결정으로 효력을 잃었습니다. */
export const RESERVE: Record<HeirKind, [number, number]> = { spouse: [1, 2], child: [1, 2], parent: [1, 3], sibling: [0, 1] };

/** 1순위 직계 비속, 2순위 직계 존속, 3순위 형제자매. 배우자는 1·2순위와 함께 상속하며 5할을 더 받고, 그들이 없으면 단독 상속합니다. */
export function heirsOf(family: Family) {
  const group: { kind: HeirKind; count: number; order: number } | null = family.children > 0 ? { kind: "child", count: family.children, order: 1 }
    : family.parents > 0 ? { kind: "parent", count: family.parents, order: 2 }
      : !family.spouse && family.siblings > 0 ? { kind: "sibling", count: family.siblings, order: 3 } : null;
  const heirs: Heir[] = [];
  if (group) {
    // 공동 상속인 한 명을 2, 배우자를 3으로 두면 분수가 정수로 나옵니다.
    const unit = family.spouse ? 2 : 1;
    const bottom = group.count * unit + (family.spouse ? 3 : 0);
    for (let index = 0; index < group.count; index += 1) heirs.push({ kind: group.kind, label: group.count > 1 ? `${kindNames[group.kind]} ${index + 1}` : kindNames[group.kind], top: unit, bottom });
    if (family.spouse) heirs.unshift({ kind: "spouse", label: "배우자", top: 3, bottom });
  } else if (family.spouse) heirs.push({ kind: "spouse", label: "배우자", top: 1, bottom: 1 });
  return { heirs, order: group?.order ?? (family.spouse ? 0 : null) };
}

/** 3억 5,000만 원처럼 적습니다. */
export function krw(value: number) {
  const rounded = Math.round(value);
  if (rounded === 0) return "0원";
  const eok = Math.floor(rounded / 1e8);
  const man = Math.floor((rounded % 1e8) / 1e4);
  const rest = rounded % 1e4;
  const parts = [eok ? `${grouped(eok, 0)}억` : "", man ? `${grouped(man, 0)}만` : "", rest ? grouped(rest, 0) : ""].filter(Boolean);
  return `${parts.join(" ")}${rest ? "" : " "}원`;
}
export const shareText = (heir: Heir) => fraction(heir.top, heir.bottom);
export function reserveOf(heir: Heir) {
  const [top, bottom] = RESERVE[heir.kind];
  const t = heir.top * top; const b = heir.bottom * bottom; const d = gcd(t, b) || 1;
  return { top: t / d, bottom: b / d };
}

/** 유증(재산 일부를 남에게 주는 유언)이 있을 때 상속인마다 받는 몫과 유류분 부족액입니다. */
export function bequestResult(family: Family, estate: number, bequest: number) {
  const { heirs } = heirsOf(family);
  const left = Math.max(0, estate - Math.min(bequest, estate));
  return heirs.map(heir => {
    const reserve = reserveOf(heir);
    const reserveAmount = estate * reserve.top / reserve.bottom;
    const received = left * heir.top / heir.bottom;
    return { heir, legal: estate * heir.top / heir.bottom, reserve, reserveAmount, received, shortfall: Math.max(0, reserveAmount - received) };
  });
}

/** 가계도: 피상속인을 가운데 두고 부모는 위, 배우자는 오른쪽, 형제자매는 왼쪽, 자녀는 아래에 그립니다. 상속인은 색을 칠하고 상속분을 적습니다. */
export function familySvg(family: Family, estate: number, width = 680) {
  const height = 330;
  const { heirs } = heirsOf(family);
  const cx = width / 2;
  const cy = 150;
  const shareFor = (kind: HeirKind) => heirs.find(heir => heir.kind === kind);
  const box = (x: number, y: number, label: string, kind: HeirKind | "self") => {
    const heir = kind === "self" ? undefined : shareFor(kind);
    const fill = kind === "self" ? "#f3f4f6" : heir ? "#dbeafe" : "#fff";
    const stroke = kind === "self" ? "#111" : heir ? "#2563eb" : "#aaa";
    const w = 96;
    const lines = kind === "self" ? ["사망", ""] : heir ? [shareText(heir), krw(estate * heir.top / heir.bottom)] : ["상속 안 됨", ""];
    return `<rect x="${x - w / 2}" y="${y - 28}" width="${w}" height="56" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="${heir || kind === "self" ? 1.8 : 1}"${heir || kind === "self" ? "" : ` stroke-dasharray="4 3"`}/>`
      + svgText(x, y - 10, label, { anchor: "middle", size: 12.5, weight: 800, color: heir || kind === "self" ? "#111" : "#888" })
      + svgText(x, y + 6, lines[0], { anchor: "middle", size: 11.5, weight: 700, color: heir ? "#1d4ed8" : "#999" })
      + (lines[1] ? svgText(x, y + 21, lines[1], { anchor: "middle", size: 10, color: "#333" }) : "");
  };
  const line = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#666" stroke-width="1.3"/>`;
  const parts: string[] = [];
  const parentXs = family.parents === 2 ? [cx - 60, cx + 60] : family.parents === 1 ? [cx] : [];
  if (parentXs.length) { parts.push(line(cx, cy - 28, cx, 70)); if (parentXs.length === 2) parts.push(line(cx - 60, 70, cx + 60, 70)); }
  const siblingShown = Math.min(family.siblings, 2);
  const siblingXs = Array.from({ length: siblingShown }, (_, index) => cx - 150 - index * 108);
  if (siblingShown) parts.push(line(cx, 70, cx, cy - 28), line(siblingXs[siblingShown - 1], 70, cx, 70), ...siblingXs.map(x => line(x, 70, x, cy - 28)));
  if (family.spouse) parts.push(line(cx + 48, cy, cx + 112, cy));
  const childShown = Math.min(family.children, 5);
  const childXs = Array.from({ length: childShown }, (_, index) => cx + (index - (childShown - 1) / 2) * 108);
  if (childShown) parts.push(line(cx + (family.spouse ? 80 : 0), cy, cx + (family.spouse ? 80 : 0), 235), line(Math.min(childXs[0], cx + 80), 235, Math.max(childXs[childShown - 1], family.spouse ? cx + 80 : cx), 235), ...childXs.map(x => line(x, 235, x, 262)));
  parentXs.forEach((x, index) => parts.push(box(x, 44, family.parents === 2 ? (index ? "어머니" : "아버지") : "부모", "parent")));
  siblingXs.forEach((x, index) => parts.push(box(x, cy, `형제자매 ${index + 1}`, "sibling")));
  if (family.siblings > siblingShown) parts.push(svgText(siblingXs[siblingShown - 1] - 56, cy + 40, `외 ${family.siblings - siblingShown}명`, { size: 11, color: "#555" }));
  parts.push(box(cx, cy, "피상속인", "self"));
  if (family.spouse) parts.push(box(cx + 160, cy, "배우자", "spouse"));
  childXs.forEach((x, index) => parts.push(box(x, 290, family.children > 1 ? `자녀 ${index + 1}` : "자녀", "child")));
  if (family.children > childShown) parts.push(svgText(childXs[childShown - 1] + 52, 322, `외 ${family.children - childShown}명`, { size: 11, color: "#555" }));
  return svgWrap(width, height, parts.join(""));
}

/** “배우자, 자녀 2명, 어머니”처럼 가족을 적습니다. */
export function familyText(family: Family) {
  const parts = [family.spouse ? "배우자" : "", family.children ? `자녀 ${family.children}명` : "", family.parents === 2 ? "아버지와 어머니" : family.parents === 1 ? "어머니" : "", family.siblings ? `형제자매 ${family.siblings}명` : ""].filter(Boolean);
  return parts.length ? parts.join(", ") : "가족 없음";
}

/* ───── 문제 ───── */
export type InheritanceAsk = "order" | "share" | "reserve";
export const inheritanceAsks: Record<InheritanceAsk, string> = { order: "상속인 찾기(순위)", share: "법정 상속분과 상속액", reserve: "유류분" };

export function inheritanceProblems(asks: InheritanceAsk[], perAsk: number, seed: number): SheetSection[] {
  if (!asks.length) return [];
  const random = seededRandom(seed * 43 + 19);
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
  const problems: SheetProblem[] = [];
  const add = (html: string, answerHtml: string, space = 12) => problems.push({ html, text: plainText(html), answerHtml, answerText: plainText(answerHtml), space });
  const randomFamily = (): Family => {
    for (;;) {
      const family = { spouse: random() < 0.7, children: random() < 0.6 ? int(1, 3) : 0, parents: random() < 0.6 ? int(1, 2) : 0, siblings: random() < 0.6 ? int(1, 3) : 0 };
      if (heirsOf(family).heirs.length) return family;
    }
  };
  for (const ask of asks) for (let index = 0; index < perAsk; index += 1) {
    const family = randomFamily();
    const { heirs } = heirsOf(family);
    const bottom = heirs[0].bottom;
    if (ask === "order") {
      const names = [...new Set(heirs.map(heir => heir.kind === "parent" ? (family.parents === 2 ? "아버지, 어머니" : "어머니") : kindNames[heir.kind]))];
      add(`갑이 유언 없이 사망하였다. 갑의 가족은 ${escapeHtml(familyText(family))}이다. 갑의 재산을 상속받는 사람을 모두 쓰시오.`,
        `${escapeHtml(names.join(", "))} (1순위 직계 비속 → 2순위 직계 존속 → 3순위 형제자매. 배우자는 1·2순위와 함께, 없으면 단독 상속)`, 8);
    } else if (ask === "share") {
      const estate = bottom * [2, 3, 5, 10][int(0, 3)] * 1e7;
      const lines = [...new Map(heirs.map(heir => [heir.kind, heir])).values()].map(heir => {
        const many = heirs.filter(item => item.kind === heir.kind).length > 1;
        const name = heir.kind === "parent" && !many ? "어머니" : `${kindNames[heir.kind]}${many ? " 1명당" : ""}`;
        return `${name} ${heir.top === heir.bottom ? "전부" : shareText(heir)} → ${krw(estate * heir.top / heir.bottom)}`;
      });
      add(`갑이 유언 없이 사망하였다. 갑의 가족은 ${escapeHtml(familyText(family))}이고 상속 재산은 ${krw(estate)}이다. 각 상속인의 법정 상속분과 상속액을 구하시오. (빚은 없다.)`,
        `${escapeHtml(lines.join(" / "))}${family.spouse && heirs.length > 1 ? " (배우자는 함께 상속하는 사람 몫의 1.5배)" : ""}`);
    } else {
      const heir = heirs.find(item => item.kind !== "spouse") ?? heirs[0];
      const reserve = reserveOf(heir);
      const estate = bottom * 6 * [1, 2, 5][int(0, 2)] * 1e7;
      const amount = estate * reserve.top / reserve.bottom;
      const who = heirs.filter(item => item.kind === heir.kind).length > 1 ? `${kindNames[heir.kind]} 가운데 한 명` : heir.kind === "parent" ? "어머니" : kindNames[heir.kind];
      add(`갑의 가족은 ${escapeHtml(familyText(family))}이다. 갑은 전 재산 ${krw(estate)}을 ○○ 재단에 준다는 유언(유증)을 남기고 사망하였다. ${escapeHtml(subjectParticle(who))} 청구할 수 있는 유류분 금액을 구하시오. (빚과 생전 증여는 없다.)`,
        heir.kind === "sibling" ? "청구할 수 없음 (형제자매의 유류분은 2024년 4월 헌법 재판소 위헌 결정으로 효력을 잃었어요.)"
          : `${krw(amount)} (법정 상속분 ${shareText(heir)} × ${heir.kind === "parent" ? "1/3" : "1/2"} = ${fraction(reserve.top, reserve.bottom)})`);
    }
  }
  return [{ heading: "상속과 유류분", problems }];
}
