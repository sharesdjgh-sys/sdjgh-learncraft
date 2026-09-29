/**
 * 일본어 도구가 쓰는 가나 획순 자료를 만듭니다: npx tsx scripts/build-kana-data.ts
 *
 * 1. KanjiVG(고정한 커밋)에서 50음도·탁음·반탁음 가나와 작은 가나(ゃゅょっ)의 SVG를 .cache/kana에 받습니다.
 * 2. src/data/kana-strokes.ts  글자마다 획 경로(109×109 좌표)와 획 번호 위치. 가나 카드와 쓰기 연습지의 획순 그림에 씁니다.
 * 획 수는 경로 수입니다. src/features/japanese/kana.ts의 교과서 획 수와 같은지 scripts/verify-japanese.ts가 확인합니다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { KANA_CHARS } from "../src/features/japanese/kana";

const CACHE = ".cache/kana";
const KANJIVG_COMMIT = "422b5538595676da918c288a4230cb5e22a1ee7e";
const fileOf = (char: string) => `${char.codePointAt(0)!.toString(16).padStart(5, "0")}.svg`;

async function svgOf(char: string) {
  const file = fileOf(char);
  const path = join(CACHE, file);
  if (!existsSync(path)) {
    mkdirSync(CACHE, { recursive: true });
    const response = await fetch(`https://raw.githubusercontent.com/KanjiVG/kanjivg/${KANJIVG_COMMIT}/kanji/${file}`);
    if (!response.ok) throw new Error(`${char}(${file})를 받지 못했습니다: ${response.status}`);
    writeFileSync(path, await response.text());
  }
  return readFileSync(path, "utf8");
}

// 좌표는 소수 첫째 자리까지만 남겨 파일을 줄입니다. 109칸 격자에서 0.1은 눈에 띄지 않습니다.
// 부호는 그대로 둡니다. -0.02가 0이 되면 앞 숫자와 붙어 버립니다(20.25-0.02 → 20.30).
const compact = (d: string) => d.replace(/-?\d+\.\d+/g, number => (number.startsWith("-") ? "-" : "") + String(Math.abs(Math.round(Number(number) * 10) / 10))).replace(/\s+/g, " ").trim();

async function main() {
  const lines: string[] = [];
  for (const char of KANA_CHARS) {
    const svg = await svgOf(char);
    const paths = [...svg.matchAll(/<path [^>]*\sd="([^"]+)"/g)].map(match => compact(match[1]));
    const numbers = [...svg.matchAll(/<text transform="matrix\(1 0 0 1 ([\d.]+) ([\d.]+)\)">(\d+)<\/text>/g)]
      .sort((a, b) => Number(a[3]) - Number(b[3])).map(match => `${Math.round(Number(match[1]))},${Math.round(Number(match[2]))}`);
    if (!paths.length || paths.length !== numbers.length) throw new Error(`${char}: 획 ${paths.length}개, 번호 ${numbers.length}개`);
    lines.push(`${char}|${numbers.join(";")}|${paths.join("|")}`);
  }

  writeFileSync("src/data/kana-strokes.ts", `/* 자동 생성 파일입니다. scripts/build-kana-data.ts로 다시 만듭니다.
 * 출처: KanjiVG (${KANJIVG_COMMIT.slice(0, 7)}) Copyright (C) 2009-2023 Ulrich Apel. https://kanjivg.tagaini.net
 *       Creative Commons Attribution-Share Alike 3.0 (https://creativecommons.org/licenses/by-sa/3.0/).
 *       이 파일은 KanjiVG의 획 경로를 옮겨 적은 것이므로 같은 라이선스(CC BY-SA 3.0)를 따릅니다.
 * KANA_STROKES는 한 줄에 "글자|획 번호 위치(x,y;x,y…)|1획 경로|2획 경로…"입니다. 좌표는 109×109 격자입니다. */
export const KANA_STROKES = ${JSON.stringify(lines.join("\n"))};
`);
  console.log(`kana-strokes.ts: ${lines.length}자`);
}

void main();
