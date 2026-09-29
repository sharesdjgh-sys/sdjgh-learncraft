/**
 * 중국어 도구가 쓰는 간체자·병음 자료를 만듭니다: npx tsx scripts/build-chinese-data.ts
 *
 * 1. Unicode Unihan 데이터베이스(Unihan.zip)를 .cache/hanja에 받습니다(한문 자료 스크립트와 같은 파일).
 * 2. src/data/chinese-hanzi.ts      통용규범한자표(kTGHZ2013) 8,105자의 병음·총획수·빈도 순위·번체자.
 *                                    병음은 자주 쓰는 읽기(kHanyuPinlu 빈도, kMandarin)를 앞에 둡니다.
 * 3. src/data/chinese-syllables.ts  음절·성조(경성 포함)마다 가장 자주 쓰는 글자. 음절표와 성조 듣기에서 소리를 낼 때 씁니다.
 * 호환 한자(U+F900~)는 뺍니다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

const CACHE = ".cache/hanja";
const UNIHAN_URL = "https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip";

async function unihanZip() {
  const path = join(CACHE, "Unihan.zip");
  if (!existsSync(path)) {
    mkdirSync(CACHE, { recursive: true });
    const response = await fetch(UNIHAN_URL);
    if (!response.ok) throw new Error(`Unihan.zip을 받지 못했습니다: ${response.status}`);
    writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  }
  return readFileSync(path);
}

// 중앙 디렉터리에서 파일 하나를 찾아 풉니다. Unihan.zip은 deflate(8) 방식만 씁니다.
function unzipEntry(zip: Buffer, name: string) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let offset = zip.readUInt32LE(end + 16);
  const count = zip.readUInt16LE(end + 10);
  for (let index = 0; index < count; index += 1) {
    const method = zip.readUInt16LE(offset + 10);
    const size = zip.readUInt32LE(offset + 20);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extra = zip.readUInt16LE(offset + 30);
    const comment = zip.readUInt16LE(offset + 32);
    const local = zip.readUInt32LE(offset + 42);
    if (zip.toString("utf8", offset + 46, offset + 46 + nameLength) === name) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      return (method === 0 ? data : inflateRawSync(data)).toString("utf8");
    }
    offset += 46 + nameLength + extra + comment;
  }
  throw new Error(`${name}이 ZIP에 없습니다.`);
}

const isCompatibility = (code: number) => code >= 0xf900 && code <= 0xfaff;
const fieldOf = (text: string, field: string) => {
  const values = new Map<string, string>();
  for (const match of text.matchAll(new RegExp(`^U\\+([0-9A-F]+)\\t${field}\\t(.+)$`, "gm"))) {
    const code = Number.parseInt(match[1], 16);
    if (!isCompatibility(code)) values.set(String.fromCodePoint(code), match[2].trim());
  }
  return values;
};
const charOf = (code: string) => String.fromCodePoint(Number.parseInt(code.replace("U+", ""), 16));
// NFC로 모아 ü·ǘ 등을 한 글자로 씁니다. 성조 표시가 없는 병음은 경성입니다.
const normalize = (pinyin: string) => pinyin.normalize("NFC").toLowerCase();

async function main() {
  const zip = await unihanZip();
  const readingsText = unzipEntry(zip, "Unihan_Readings.txt");
  const variantsText = unzipEntry(zip, "Unihan_Variants.txt");
  const irgText = unzipEntry(zip, "Unihan_IRGSources.txt");
  const version = readingsText.match(/^# Unicode Version (\S+)/m)?.[1] ?? "unknown";

  const tghz = fieldOf(readingsText, "kTGHZ2013");
  const mandarin = fieldOf(readingsText, "kMandarin");
  const pinlu = fieldOf(readingsText, "kHanyuPinlu");
  const traditional = fieldOf(variantsText, "kTraditionalVariant");
  const strokes = fieldOf(irgText, "kTotalStrokes");

  // 빈도: kHanyuPinlu(현대 한어 빈도 사전)의 읽기별 횟수입니다.
  const counts = new Map<string, Map<string, number>>();
  for (const [char, value] of pinlu) {
    const byReading = new Map<string, number>();
    for (const match of value.matchAll(/([^\s(]+)\((\d+)\)/g)) byReading.set(normalize(match[1]), Number(match[2]));
    counts.set(char, byReading);
  }
  const total = (char: string) => [...(counts.get(char)?.values() ?? [])].reduce((sum, value) => sum + value, 0);
  const ranked = [...tghz.keys()].filter(char => total(char) > 0).sort((a, b) => total(b) - total(a));
  const rank = new Map(ranked.map((char, index) => [char, index + 1]));

  const lines: string[] = [];
  for (const [char, value] of tghz) {
    const standard = [...new Set(value.split(/\s+/).map(item => normalize(item.split(":")[1] ?? "")).filter(Boolean))];
    const primary = normalize(mandarin.get(char)?.split(/\s+/)[0] ?? standard[0]);
    const byCount = counts.get(char) ?? new Map<string, number>();
    // 표준 읽기만 쓰되, 실제로 자주 쓰는 읽기(빈도)를 앞에 두고, 빈도가 같으면 대표 읽기(kMandarin)를 앞에 둡니다(长 cháng·zhǎng).
    const readings = [...new Set([primary, ...standard])].filter(reading => standard.includes(reading) || reading === primary)
      .sort((a, b) => (byCount.get(b) ?? 0) - (byCount.get(a) ?? 0) || (b === primary ? 1 : 0) - (a === primary ? 1 : 0));
    const traditionalChars = (traditional.get(char)?.split(/\s+/) ?? []).map(charOf).filter(item => item !== char && !isCompatibility(item.codePointAt(0)!));
    const stroke = Number(strokes.get(char)?.split(/\s+/)[0]) || 0;
    lines.push(`${char}|${stroke}|${rank.get(char) ?? 0}|${readings.join(" ")}|${traditionalChars.join("")}`);
  }

  // 음절·성조마다 대표 글자: 그 읽기로 가장 많이 쓰이는 글자입니다. 빈도 자료에 없으면 표준 읽기의 첫 글자를 씁니다.
  const best = new Map<string, { char: string; count: number }>();
  for (const [char, value] of tghz) {
    for (const reading of value.split(/\s+/).map(item => normalize(item.split(":")[1] ?? "")).filter(Boolean)) {
      const count = counts.get(char)?.get(reading) ?? 0;
      const current = best.get(reading);
      if (!current || count > current.count) best.set(reading, { char, count });
    }
  }
  const syllables = [...best.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([reading, { char, count }]) => `${reading}${char}${count ? "" : "?"}`);

  const header = `/* 자동 생성 파일입니다. scripts/build-chinese-data.ts로 다시 만듭니다.
 * 출처: Unicode Unihan Database ${version} (kTGHZ2013, kMandarin, kHanyuPinlu, kTraditionalVariant, kTotalStrokes). https://www.unicode.org/terms_of_use.html`;
  writeFileSync("src/data/chinese-hanzi.ts", `${header}
 * CHINESE_HANZI는 통용규범한자표 글자마다 한 줄에 "간체자|총획수|빈도 순위(없으면 0)|병음(자주 쓰는 읽기부터, 띄어 씀)|번체자"입니다.
 * 번체자가 비어 있으면 간체와 번체가 같은 글자입니다. */
export const CHINESE_HANZI_VERSION = ${JSON.stringify(version)};
export const CHINESE_HANZI = ${JSON.stringify(lines.join("\n"))};
`);
  writeFileSync("src/data/chinese-syllables.ts", `${header}
 * CHINESE_SYLLABLES는 "성조 표시 병음 + 대표 글자"를 띄어 이은 문자열입니다(mā妈 má麻 …). 글자 뒤 ?는 빈도 자료가 없는 음절입니다. */
export const CHINESE_SYLLABLES = ${JSON.stringify(syllables.join(" "))};
`);
  console.log(`간체자 ${lines.length}자(빈도 순위 ${ranked.length}자), 음절·성조 ${syllables.length}개 (Unicode ${version})`);
}

void main();
