/**
 * 한문 도구가 쓰는 한자 자료를 만듭니다: npx tsx scripts/build-hanja-data.ts
 *
 * 1. Unicode Unihan 데이터베이스(Unihan.zip)와 CJKRadicals.txt, libhangul hanja.txt(고정한 커밋)를 .cache에 받습니다.
 * 2. src/data/hanja-readings.ts   한국 한자음(kHangul)과 교육용 기초한자(E 표시). 독음 점검에 씁니다.
 * 3. src/data/hanja-dictionary.ts 글자마다 총획수·부수·음별 훈. 한자 카드와 학습지에 씁니다.
 * 4. src/data/hanja-words.ts      교육용 기초한자 두 글자로 된 한자어와 독음. AI가 고른 한자어가 실제 낱말인지 서버에서 확인합니다.
 * 호환 한자(U+F900~)는 NFC로 통합 한자와 같아지므로 뺍니다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

const CACHE = ".cache/hanja";
const LIBHANGUL_COMMIT = "717409ce61524bb3d8426060a384822f21354c62";
const sources = {
  unihan: { file: "Unihan.zip", url: "https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip" },
  radicals: { file: "CJKRadicals.txt", url: "https://www.unicode.org/Public/UCD/latest/ucd/CJKRadicals.txt" },
  libhangul: { file: "hanja.txt", url: `https://raw.githubusercontent.com/libhangul/libhangul/${LIBHANGUL_COMMIT}/data/hanja/hanja.txt` },
};

async function source(name: keyof typeof sources) {
  const { file, url } = sources[name];
  const path = join(CACHE, file);
  if (!existsSync(path)) {
    mkdirSync(CACHE, { recursive: true });
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${file}을 받지 못했습니다: ${response.status}`);
    writeFileSync(path, Buffer.from(await response.arrayBuffer()));
  }
  return readFileSync(path);
}

// 중앙 디렉터리에서 파일 하나를 찾아 풉니다. Unihan.zip은 deflate(8) 방식만 씁니다.
function unzipEntry(zip: Buffer, name: string) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("ZIP 끝 레코드를 찾지 못했습니다.");
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
const unihanFields = (text: string, field: string) => {
  const values = new Map<string, string>();
  for (const match of text.matchAll(new RegExp(`^U\\+([0-9A-F]+)\\t${field}\\t(.+)$`, "gm"))) {
    const code = Number.parseInt(match[1], 16);
    if (!isCompatibility(code)) values.set(String.fromCodePoint(code), match[2].trim());
  }
  return values;
};
const syllableBody = (syllable: string) => (syllable.charCodeAt(0) - 0xac00) % 588;
const initialOf = (syllable: string) => Math.floor((syllable.charCodeAt(0) - 0xac00) / 588);
// ㄹ→ㄴ·ㅇ, ㄴ→ㅇ 으로만 다른 음(두음법칙 음)인지 봅니다.
const isInitialVariant = (variant: string, base: string) => syllableBody(variant) === syllableBody(base)
  && ((initialOf(base) === 5 && [2, 11].includes(initialOf(variant))) || (initialOf(base) === 2 && initialOf(variant) === 11));
const clean = (text: string) => text.replace(/[|;,\n]/g, " ").replace(/\s+/g, " ").trim();

async function main() {
  const zip = await source("unihan");
  const readingsText = unzipEntry(zip, "Unihan_Readings.txt");
  const irgText = unzipEntry(zip, "Unihan_IRGSources.txt");
  const version = readingsText.match(/^# Unicode Version (\S+)/m)?.[1] ?? "unknown";

  // 1) 한국 한자음
  const kHangul = unihanFields(readingsText, "kHangul");
  const educationReadings = new Map<string, string[]>();
  const readingEntries: string[] = [];
  for (const [char, value] of kHangul) {
    const readings = value.split(/\s+/).map(item => item.split(":"));
    readingEntries.push(char + [...new Set(readings.map(([reading]) => reading))].join(""));
    const education = readings.filter(([, flags = ""]) => flags.includes("E")).map(([reading]) => reading);
    if (education.length) educationReadings.set(char, education);
  }
  writeFileSync("src/data/hanja-readings.ts", `/* 자동 생성 파일입니다. scripts/build-hanja-data.ts로 다시 만듭니다.
 * 출처: Unicode Unihan Database ${version} (kHangul). https://www.unicode.org/terms_of_use.html
 * HANJA_READINGS는 한자 한 글자 뒤에 그 글자의 한국 한자음(두음법칙 음 포함)을 이어 쓴 문자열입니다.
 * EDUCATION_HANJA는 교육용 기초한자 음(E 표시)이 있는 글자입니다. */
export const HANJA_READINGS_VERSION = ${JSON.stringify(version)};
export const HANJA_READINGS = ${JSON.stringify(readingEntries.join(""))};
export const EDUCATION_HANJA = ${JSON.stringify([...educationReadings.keys()].join(""))};
`);

  // 2) 훈음·부수·획수
  const libhangul = (await source("libhangul")).toString("utf8");
  const meanings = new Map<string, Map<string, string[]>>();
  const words = new Map<string, Set<string>>();
  for (const line of libhangul.split("\n")) {
    if (line.startsWith("#")) continue;
    const [reading = "", hanja = "", meaning = ""] = line.split(":");
    const chars = [...hanja.normalize("NFC")];
    if (chars.length === 1 && [...reading].length === 1 && kHangul.has(chars[0]) && meaning.trim()) {
      const byReading = meanings.get(chars[0]) ?? new Map<string, string[]>();
      // "배울 학"처럼 끝에 붙은 음을 떼고 훈만 남깁니다.
      const glosses = meaning.split(",").map(item => clean(item).replace(new RegExp(`\\s*${reading}$`), "")).filter(Boolean);
      byReading.set(reading, [...new Set([...(byReading.get(reading) ?? []), ...glosses])]);
      meanings.set(chars[0], byReading);
    }
    if (chars.length === 2 && [...reading].length === 2 && chars.every(char => educationReadings.has(char))) {
      const key = chars.join("");
      words.set(key, (words.get(key) ?? new Set()).add(reading));
    }
  }
  const strokes = unihanFields(irgText, "kTotalStrokes");
  const radicalOf = unihanFields(irgText, "kRSUnicode");
  const radicalChars: string[] = [];
  for (const line of (await source("radicals")).toString("utf8").split("\n")) {
    const match = line.match(/^(\d+);\s*[0-9A-F]+;\s*([0-9A-F]+)/);
    if (match) radicalChars[Number(match[1]) - 1] = String.fromCodePoint(Number.parseInt(match[2], 16));
  }
  if (radicalChars.length !== 214 || radicalChars.some(char => !char)) throw new Error("부수 214자를 모두 찾지 못했습니다.");
  const dictionary: string[] = [];
  for (const char of kHangul.keys()) {
    const byReading = meanings.get(char);
    if (!byReading) continue;
    const education = educationReadings.get(char) ?? [];
    // 두음법칙 음은 본음의 훈과 겹치면 뺍니다(樂 낙 ⊂ 락). 교육용 음을 앞에 둡니다.
    const kept = [...byReading.entries()].filter(([reading, glosses]) => ![...byReading.entries()].some(([base, baseGlosses]) =>
      base !== reading && isInitialVariant(reading, base) && glosses.every(gloss => baseGlosses.includes(gloss))));
    kept.sort(([a], [b]) => Number(!education.includes(a)) - Number(!education.includes(b)));
    const radical = Number(radicalOf.get(char)?.split(/\s+/)[0].split(".")[0].replace("'", "")) || 0;
    const stroke = Number(strokes.get(char)?.split(/\s+/)[0]) || 0;
    dictionary.push(`${char}|${stroke}|${radical}|${kept.map(([reading, glosses]) => `${reading}:${glosses.slice(0, 5).join(",")}`).join(";")}`);
  }
  writeFileSync("src/data/hanja-dictionary.ts", `/* 자동 생성 파일입니다. scripts/build-hanja-data.ts로 다시 만듭니다.
 * 출처: Unicode Unihan Database ${version} (kTotalStrokes, kRSUnicode), CJKRadicals.txt. https://www.unicode.org/terms_of_use.html
 *       libhangul hanja.txt (${LIBHANGUL_COMMIT.slice(0, 7)}) Copyright (c) 2005,2006 Choe Hwanjin. All rights reserved. BSD 3-Clause License.
 * HANJA_DICTIONARY는 한 줄에 "글자|총획수|부수 번호|음:훈,훈;음:훈"입니다. 교육용 음을 앞에 둡니다.
 * RADICALS는 강희자전 부수 214자를 번호 순서대로 이은 문자열입니다. */
export const HANJA_DICTIONARY = ${JSON.stringify(dictionary.join("\n"))};
export const RADICALS = ${JSON.stringify(radicalChars.join(""))};
`);

  // 3) 한자어
  const wordEntries = [...words.entries()].flatMap(([hanja, readings]) => [...readings].map(reading => hanja + reading));
  writeFileSync("src/data/hanja-words.ts", `import "server-only";

/* 자동 생성 파일입니다. scripts/build-hanja-data.ts로 다시 만듭니다.
 * 출처: libhangul hanja.txt (${LIBHANGUL_COMMIT.slice(0, 7)}) Copyright (c) 2005,2006 Choe Hwanjin. All rights reserved. BSD 3-Clause License.
 * 교육용 기초한자 두 글자로 된 한자어입니다. 네 글자씩 "한자 두 자 + 독음 두 자"를 이어 썼습니다. */
export const HANJA_WORDS = ${JSON.stringify(wordEntries.join(""))};
`);
  console.log(`한자음 ${readingEntries.length}자(교육용 ${educationReadings.size}자), 훈음 ${dictionary.length}자, 한자어 ${wordEntries.length}개 (Unicode ${version})`);
}

void main();
