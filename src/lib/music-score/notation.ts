// 한글 계이름 악보 입력을 해석합니다. 계이름은 이동도법(조표의 으뜸음 기준, 단조는 '라'가 으뜸음)을 따릅니다.
// 예: "도4 레8 미8 [G]파4. 솔8 | 라2~ 라2 | 쉼4 높은도4 시b2"

export const clefs = { treble: "높은음자리표", bass: "낮은음자리표" } as const;
export type Clef = keyof typeof clefs;
export const timeSignatures = ["2/4", "3/4", "4/4", "6/8", "3/8", "2/2"] as const;
export type TimeSignature = (typeof timeSignatures)[number];
export type LabelMode = "solfege" | "letter" | "none";

// fifths: 조표의 올림(+)/내림(-) 개수, doLetter/doAlter: 계이름 '도'의 음(0=C … 6=B)
export const musicKeys = [
  { id: "C", name: "다장조", vex: "C", fifths: 0, minor: false },
  { id: "G", name: "사장조", vex: "G", fifths: 1, minor: false },
  { id: "D", name: "라장조", vex: "D", fifths: 2, minor: false },
  { id: "A", name: "가장조", vex: "A", fifths: 3, minor: false },
  { id: "E", name: "마장조", vex: "E", fifths: 4, minor: false },
  { id: "F", name: "바장조", vex: "F", fifths: -1, minor: false },
  { id: "Bb", name: "내림나장조", vex: "Bb", fifths: -2, minor: false },
  { id: "Eb", name: "내림마장조", vex: "Eb", fifths: -3, minor: false },
  { id: "Ab", name: "내림가장조", vex: "Ab", fifths: -4, minor: false },
  { id: "Am", name: "가단조", vex: "Am", fifths: 0, minor: true },
  { id: "Em", name: "마단조", vex: "Em", fifths: 1, minor: true },
  { id: "Bm", name: "나단조", vex: "Bm", fifths: 2, minor: true },
  { id: "Dm", name: "라단조", vex: "Dm", fifths: -1, minor: true },
  { id: "Gm", name: "사단조", vex: "Gm", fifths: -2, minor: true },
  { id: "Cm", name: "다단조", vex: "Cm", fifths: -3, minor: true },
] as const;
export type MusicKeyId = (typeof musicKeys)[number]["id"];

export type ScoreSettings = {
  title: string; composer: string; lyricist: string;
  clef: Clef; key: MusicKeyId; time: TimeSignature; tempo: number;
  lyrics: string; perLine: number; labels: LabelMode;
};

export type ScoreNote = {
  rest: boolean;
  /** 계이름 0=도 … 6=시 */
  degree: number;
  /** 사용자가 붙인 올림(+1)/내림(-1) */
  alter: number;
  /** 높은(+1)/낮은(-1) 옥타브 이동 */
  shift: number;
  duration: 1 | 2 | 4 | 8 | 16;
  dotted: boolean;
  tie: boolean;
  chord: string | null;
  token: string;
  /** 계산 결과 */
  letter: number; accidental: number; octave: number; midi: number; units: number;
  lyric: string | null;
};
export type ScoreMeasure = { notes: ScoreNote[]; units: number };
export type ScoreIssue = { measure: number | null; message: string };
export type ParsedScore = { measures: ScoreMeasure[]; capacity: number; errors: ScoreIssue[]; warnings: ScoreIssue[] };

export const solfegeNames = ["도", "레", "미", "파", "솔", "라", "시"] as const;
const letterNames = ["다", "라", "마", "바", "사", "가", "나"] as const;
const vexLetters = ["c", "d", "e", "f", "g", "a", "b"] as const;
const letterSemitones = [0, 2, 4, 5, 7, 9, 11];
const sharpOrder = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B
const flatOrder = [6, 2, 5, 1, 4, 0, 3]; // B E A D G C F
/** 32분음표를 1로 둔 음표 길이 */
const durationUnits: Record<ScoreNote["duration"], number> = { 1: 32, 2: 16, 4: 8, 8: 4, 16: 2 };
export const durationNames: Record<ScoreNote["duration"], string> = { 1: "온음표", 2: "2분음표", 4: "4분음표", 8: "8분음표", 16: "16분음표" };

export const keyInfo = (id: MusicKeyId) => musicKeys.find(key => key.id === id) ?? musicKeys[0];
export function measureCapacity(time: TimeSignature) {
  const [count, unit] = time.split("/").map(Number);
  return count * 32 / unit;
}
function signatureAlter(fifths: number, letter: number) {
  if (fifths > 0) return sharpOrder.slice(0, fifths).includes(letter) ? 1 : 0;
  if (fifths < 0) return flatOrder.slice(0, -fifths).includes(letter) ? -1 : 0;
  return 0;
}
/** 조표 기준 계이름 '도'의 글자와 올림·내림 */
export function doPitch(id: MusicKeyId) {
  const key = keyInfo(id);
  // 장조 으뜸음은 5도권에서 C로부터 fifths만큼 떨어집니다. 단조도 같은 조표의 장조 '도'를 씁니다.
  const letter = ((key.fifths * 4) % 7 + 7) % 7;
  return { letter, alter: signatureAlter(key.fifths, letter) };
}

const tokenPattern = /^(?:\[([^\]\s]{1,10})\])?(?:(쉼)|((?:높은|낮은)*)(도|레|미|파|솔|라|시)([#♯b♭]?))(16|1|2|4|8)?(\.)?(~)?$/;
const gluedPattern = /(?:\[[^\]\s]{1,10}\])?(?:쉼|(?:높은|낮은)*(?:도|레|미|파|솔|라|시)[#♯b♭]?)(?:16|1|2|4|8)?\.?~?/g;
// "도4레4", "도레미파"처럼 붙여 쓴 음표도 하나씩 나눠 읽습니다.
function splitGlued(token: string) {
  if (tokenPattern.test(token)) return [token];
  const pieces = token.match(gluedPattern);
  return pieces && pieces.join("") === token ? pieces : [token];
}
function tokenHint(token: string) {
  if (/^(?:16|1|2|4|8)\.?~?$/.test(token)) return `'${token}' 앞에 계이름을 붙여 써 주세요. 예: 도${token} (계이름과 숫자 사이는 띄우지 않아요)`;
  if (/^[A-Ga-g]/.test(token)) return `'${token}': 음은 계이름(도·레·미)으로 적어요. 코드라면 [C]도4처럼 괄호에 넣어 주세요.`;
  return `'${token}'을(를) 읽지 못했어요. 예: 도4, 높은솔8, 파#4., 쉼2`;
}

function resolvePitch(settings: Pick<ScoreSettings, "key" | "clef">, degree: number, alter: number, shift: number) {
  const key = keyInfo(settings.key);
  const tonic = doPitch(settings.key);
  // 장조는 '도'부터, 단조는 으뜸음 '라'부터 '솔'까지를 가운데 옥타브로 봅니다. 예: 가단조 라4 시4 도5
  const raw = key.minor ? (tonic.letter + 5) % 7 + (degree + 2) % 7 : tonic.letter + degree;
  const letter = raw % 7;
  const accidental = signatureAlter(key.fifths, letter) + alter;
  const octave = (settings.clef === "bass" ? 3 : 4) + Math.floor(raw / 7) + shift;
  return { letter, accidental, octave, midi: 12 * (octave + 1) + letterSemitones[letter] + accidental };
}

export function parseScore(text: string, settings: ScoreSettings): ParsedScore {
  const capacity = measureCapacity(settings.time);
  const errors: ScoreIssue[] = [];
  const warnings: ScoreIssue[] = [];
  // 코드는 "[C]도4"처럼 붙여 쓰거나 "[C] 도4"처럼 띄어 써도 다음 음표에 붙습니다. 전각 괄호도 받습니다.
  const chunks = text.replace(/［/g, "[").replace(/］/g, "]").replace(/\[([^\]\s|]{1,10})\]\s+(?=[^\s|])/g, "[$1]").split("|");
  if (chunks.length > 1 && !chunks.at(-1)!.trim()) chunks.pop();
  let lastDuration: ScoreNote["duration"] = 4;
  const measures: ScoreMeasure[] = [];
  for (const chunk of chunks) {
    const tokens = chunk.trim().split(/\s+/).filter(Boolean).flatMap(splitGlued);
    if (!tokens.length) {
      if (chunks.length > 1) errors.push({ measure: measures.length + 1, message: "빈 마디가 있어요. 쉼표를 넣거나 '|'를 지워 주세요." });
      continue;
    }
    const notes: ScoreNote[] = [];
    for (const token of tokens) {
      const match = tokenPattern.exec(token);
      if (!match && /^\[[^\]]*\]$/.test(token)) {
        errors.push({ measure: measures.length + 1, message: `코드 '${token}' 뒤에 음표가 없어요. 예: [C]도4` });
        continue;
      }
      if (!match) {
        errors.push({ measure: measures.length + 1, message: tokenHint(token) });
        continue;
      }
      const [, chord, rest, prefix = "", syllable, sign, length, dot, tie] = match;
      const duration = (length ? Number(length) : lastDuration) as ScoreNote["duration"];
      lastDuration = duration;
      if (dot && duration === 16) {
        errors.push({ measure: measures.length + 1, message: `'${token}': 점16분음표는 지원하지 않아요.` });
        continue;
      }
      const shift = (prefix.match(/높은/g)?.length ?? 0) - (prefix.match(/낮은/g)?.length ?? 0);
      const degree = rest ? 0 : solfegeNames.indexOf(syllable as (typeof solfegeNames)[number]);
      const alter = sign === "#" || sign === "♯" ? 1 : sign === "b" || sign === "♭" ? -1 : 0;
      const pitch = rest ? { letter: 0, accidental: 0, octave: 4, midi: 0 } : resolvePitch(settings, degree, alter, shift);
      if (!rest && (pitch.midi < 36 || pitch.midi > 96)) {
        errors.push({ measure: measures.length + 1, message: `'${token}'은(는) 너무 높거나 낮아요.` });
        continue;
      }
      const units = durationUnits[duration] * (dot ? 1.5 : 1);
      notes.push({ rest: Boolean(rest), degree, alter, shift, duration, dotted: Boolean(dot), tie: Boolean(tie) && !rest, chord: chord ?? null, token, ...pitch, units, lyric: null });
    }
    if (notes.length) measures.push({ notes, units: notes.reduce((sum, note) => sum + note.units, 0) });
  }
  measures.forEach((measure, index) => {
    const beat = capacity / Number(settings.time.split("/")[0]);
    const diff = measure.units - capacity;
    if (diff === 0) return;
    const amount = `${formatBeats(Math.abs(diff) / beat)}박`;
    if (diff > 0) errors.push({ measure: index + 1, message: `${index + 1}마디: 박자가 ${amount} 넘쳐요.` });
    else if (index === 0 || index === measures.length - 1) warnings.push({ measure: index + 1, message: `${index + 1}마디가 ${amount} 모자라요. 못갖춘마디라면 괜찮아요.` });
    else errors.push({ measure: index + 1, message: `${index + 1}마디: 박자가 ${amount} 모자라요.` });
  });
  assignLyrics(measures, settings.lyrics);
  return { measures, capacity, errors, warnings };
}

function formatBeats(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

// 가사는 띄어쓰기로 나눠 쉼표와 붙임줄 뒤 음을 뺀 음표에 차례로 붙입니다. '-'는 그 음표를 건너뜁니다.
function assignLyrics(measures: ScoreMeasure[], lyrics: string) {
  const syllables = lyrics.trim().split(/\s+/).filter(Boolean);
  let index = 0;
  let tiedFromPrevious = false;
  for (const note of measures.flatMap(measure => measure.notes)) {
    const skip = note.rest || tiedFromPrevious;
    tiedFromPrevious = note.tie;
    if (skip || index >= syllables.length) continue;
    const syllable = syllables[index++];
    note.lyric = syllable === "-" ? null : syllable;
  }
}

const accidentalMark = (value: number) => value > 0 ? "#".repeat(value) : value < 0 ? "b".repeat(-value) : "";
export function vexKey(note: ScoreNote) {
  return `${vexLetters[note.letter]}${accidentalMark(note.accidental)}/${note.octave}`;
}
export function noteLabel(note: ScoreNote, mode: LabelMode) {
  if (note.rest || mode === "none") return null;
  if (mode === "solfege") return `${solfegeNames[note.degree]}${note.alter > 0 ? "#" : note.alter < 0 ? "b" : ""}`;
  const prefix = note.accidental > 0 ? "올림" : note.accidental < 0 ? "내림" : "";
  return `${prefix}${letterNames[note.letter]}`;
}

/** 마우스 입력용: 계이름·길이를 입력 문법의 토큰으로 만듭니다. */
export function noteToken({ degree, alter = 0, shift = 0, duration, dotted = false, rest = false }: { degree?: number; alter?: number; shift?: number; duration: ScoreNote["duration"]; dotted?: boolean; rest?: boolean }) {
  if (rest) return `쉼${duration}${dotted ? "." : ""}`;
  const prefix = shift > 0 ? "높은".repeat(shift) : "낮은".repeat(-shift);
  return `${prefix}${solfegeNames[degree ?? 0]}${alter > 0 ? "#" : alter < 0 ? "b" : ""}${duration}${dotted ? "." : ""}`;
}

/** 재생용 소리 목록과 음표별 강조 시각. 붙임줄로 이어진 같은 음은 한 소리로 이어 냅니다. */
export function playbackEvents(score: ParsedScore, tempo: number) {
  const secondsPerUnit = 60 / tempo / 8;
  const sounds: { midi: number; start: number; length: number }[] = [];
  const highlights: number[] = [];
  let time = 0;
  let tieOpen = false;
  for (const note of score.measures.flatMap(measure => measure.notes)) {
    const length = note.units * secondsPerUnit;
    highlights.push(time);
    const previous = sounds.at(-1);
    if (!note.rest) {
      if (tieOpen && previous && previous.midi === note.midi && Math.abs(previous.start + previous.length - time) < 1e-6) previous.length += length;
      else sounds.push({ midi: note.midi, start: time, length });
    }
    tieOpen = note.tie;
    time += length;
  }
  return { sounds, highlights, total: time };
}
