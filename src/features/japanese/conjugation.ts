import { answerSection, clipboardWrap, escapeHtml, jaHtml, romans, sheetHead, shuffled, textHead, type SheetMode } from "@/features/language-sheet";

/* 동사·형용사 활용을 규칙으로 만듭니다. AI를 쓰지 않으므로 같은 낱말은 늘 같은 답이 나옵니다.
 * 활용은 끝의 가나만 바꾸므로 한자 표기(word)와 읽기(reading)에 같은 규칙을 적용합니다. 来る만 한자는 그대로 두고 읽기가 바뀝니다. */

export type WordKind = "verb" | "iAdj" | "naAdj";
export type VerbGroup = 1 | 2 | 3;
/** word는 한자 표기(な형용사는 だ 없이), reading은 히라가나 읽기입니다. */
export type ConjEntry = { word: string; reading: string; meaning: string; kind: WordKind; group?: VerbGroup; note?: string };

export const kindLabels: Record<WordKind, string> = { verb: "동사", iAdj: "い형용사", naAdj: "な형용사" };
export const groupLabels: Record<VerbGroup, string> = { 1: "1그룹", 2: "2그룹", 3: "3그룹" };

export const conjForms = {
  verb: {
    masu: { label: "ます형", hint: "~합니다" }, masen: { label: "ません", hint: "~하지 않습니다" }, mashita: { label: "ました", hint: "~했습니다" },
    te: { label: "て형", hint: "~하고, ~해서" }, ta: { label: "た형", hint: "~했다" }, nai: { label: "ない형", hint: "~하지 않다" },
    potential: { label: "가능형", hint: "~할 수 있다" }, volitional: { label: "의지형", hint: "~하자, ~해야지" },
  },
  iAdj: {
    desu: { label: "です", hint: "~합니다" }, nai: { label: "くない", hint: "~하지 않다" }, ta: { label: "かった", hint: "~했다" },
    nakatta: { label: "くなかった", hint: "~하지 않았다" }, te: { label: "くて", hint: "~하고, ~해서" }, adverb: { label: "く(부사)", hint: "~하게" },
  },
  naAdj: {
    desu: { label: "です", hint: "~합니다" }, nai: { label: "じゃない", hint: "~하지 않다" }, ta: { label: "だった", hint: "~했다" },
    nakatta: { label: "じゃなかった", hint: "~하지 않았다" }, te: { label: "で", hint: "~하고, ~해서" }, noun: { label: "な+명사", hint: "~한 (명사)" }, adverb: { label: "に(부사)", hint: "~하게" },
  },
} as const;
export type VerbForm = keyof typeof conjForms.verb;
export type IAdjForm = keyof typeof conjForms.iAdj;
export type NaAdjForm = keyof typeof conjForms.naAdj;
export type ConjForm = VerbForm | IAdjForm | NaAdjForm;
export const formKeys = <K extends WordKind>(kind: K) => Object.keys(conjForms[kind]) as (keyof (typeof conjForms)[K] & string)[];
export const formLabel = (kind: WordKind, form: string) => (conjForms[kind] as Record<string, { label: string; hint: string }>)[form];

// ── 규칙 ─────────────────────────────────────────────────

// 1그룹 동사 끝 가나의 あ·い·え·お단입니다.
const GODAN: Record<string, [string, string, string, string]> = {
  う: ["わ", "い", "え", "お"], く: ["か", "き", "け", "こ"], ぐ: ["が", "ぎ", "げ", "ご"], す: ["さ", "し", "せ", "そ"], つ: ["た", "ち", "て", "と"],
  ぬ: ["な", "に", "ね", "の"], ぶ: ["ば", "び", "べ", "ぼ"], む: ["ま", "み", "め", "も"], る: ["ら", "り", "れ", "ろ"],
};
// 1그룹 て형·た형(음편)입니다.
const ONBIN: Record<string, [string, string]> = {
  う: ["って", "った"], つ: ["って", "った"], る: ["って", "った"], む: ["んで", "んだ"], ぶ: ["んで", "んだ"], ぬ: ["んで", "んだ"], く: ["いて", "いた"], ぐ: ["いで", "いだ"], す: ["して", "した"],
};
const ICHIDAN: Record<VerbForm, string> = { masu: "ます", masen: "ません", mashita: "ました", te: "て", ta: "た", nai: "ない", potential: "られる", volitional: "よう" };
const SURU: Record<VerbForm, string> = { masu: "します", masen: "しません", mashita: "しました", te: "して", ta: "した", nai: "しない", potential: "できる", volitional: "しよう" };
const KURU: Record<VerbForm, [string, string]> = { masu: ["き", "ます"], masen: ["き", "ません"], mashita: ["き", "ました"], te: ["き", "て"], ta: ["き", "た"], nai: ["こ", "ない"], potential: ["こ", "られる"], volitional: ["こ", "よう"] };
const I_ADJ: Record<IAdjForm, string> = { desu: "いです", nai: "くない", ta: "かった", nakatta: "くなかった", te: "くて", adverb: "く" };
const NA_ADJ: Record<NaAdjForm, string> = { desu: "です", nai: "じゃない", ta: "だった", nakatta: "じゃなかった", te: "で", noun: "な", adverb: "に" };

export const U_ENDINGS = Object.keys(GODAN);
const isKana = (char: string) => /[ぁ-ゟ゠-ヿ]/.test(char);
export const isHiragana = (text: string) => /^[ぁ-ゟー]+$/.test(text);

export type Conjugated = { word: string; reading: string };

/** 활용한 모양입니다. 만들 수 없는 활용(ある의 가능형)이면 null입니다. */
export function conjugate(entry: ConjEntry, form: ConjForm): Conjugated | null {
  const { word, reading } = entry;
  const swap = (cut: number, tail: string, readingTail = tail): Conjugated => ({ word: word.slice(0, word.length - cut) + tail, reading: reading.slice(0, reading.length - cut) + readingTail });
  if (entry.kind === "iAdj") {
    const ending = I_ADJ[form as IAdjForm];
    if (!ending) return null;
    // いい는 よい의 활용을 씁니다: いい → よくない, よかった. 정중형은 いいです 그대로입니다.
    if (form !== "desu" && reading.endsWith("いい") && word.endsWith("いい")) return swap(2, `よ${ending}`);
    return swap(1, ending);
  }
  if (entry.kind === "naAdj") {
    const ending = NA_ADJ[form as NaAdjForm];
    return ending ? { word: word + ending, reading: reading + ending } : null;
  }
  const verbForm = form as VerbForm;
  if (!(verbForm in ICHIDAN)) return null;
  if (entry.group === 3) {
    if (reading.endsWith("する")) return swap(2, SURU[verbForm]);
    const [head, tail] = KURU[verbForm];
    return word.endsWith("来る") ? { word: word.slice(0, -1) + tail, reading: reading.slice(0, -2) + head + tail } : swap(2, head + tail);
  }
  if (entry.group === 2) return swap(1, ICHIDAN[verbForm]);
  const last = reading.at(-1)!;
  const rows = GODAN[last];
  if (!rows) return null;
  if (reading === "ある" && verbForm === "potential") return null;
  if (reading === "ある" && verbForm === "nai") return { word: "ない", reading: "ない" };
  // 行く만 て형·た형이 って·った입니다(行って, 行った).
  const iku = /[いゆ]く$/.test(reading) && /(行|い|ゆ)く$/.test(word);
  const tail = {
    masu: `${rows[1]}ます`, masen: `${rows[1]}ません`, mashita: `${rows[1]}ました`,
    te: iku ? "って" : ONBIN[last][0], ta: iku ? "った" : ONBIN[last][1],
    nai: `${rows[0]}ない`, potential: `${rows[2]}る`, volitional: `${rows[3]}う`,
  }[verbForm];
  return swap(1, tail);
}

/** 사전형(기본형)입니다. な형용사는 だ를 붙여 보여 줍니다. */
export const dictionaryForm = (entry: ConjEntry): Conjugated => entry.kind === "naAdj" ? { word: `${entry.word}だ`, reading: `${entry.reading}だ` } : { word: entry.word, reading: entry.reading };

// 1그룹인데 2그룹처럼 생긴(い·え단 + る) 동사입니다. 한자 표기로 가립니다.
const GODAN_RU_EXCEPTIONS = new Set(["帰る", "入る", "走る", "知る", "切る", "要る", "減る", "滑る", "蹴る", "焦る", "握る", "参る", "散る", "照る", "茂る", "湿る", "練る", "限る", "喋る", "混じる", "交じる", "覆る", "遮る", "陥る", "甦る", "蘇る", "捻る", "罵る", "嘲る"]);
// 읽기만으로는 1그룹·2그룹을 가릴 수 없는 낱말입니다(かえる: 帰る 1그룹, 変える 2그룹).
const AMBIGUOUS_READINGS = new Set(["かえる", "きる", "いる", "しる", "ねる", "へる", "しめる", "はいる", "はしる", "ける", "ちる", "てる", "まいる", "かぎる", "にぎる", "あせる", "すべる", "しげる"]);
const I_E_ROW = new Set([..."いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ"]);

/** 동사 그룹을 짐작합니다. sure가 false면 화면에서 확인해 달라고 알립니다. */
export function guessGroup(word: string, reading: string): { group: VerbGroup; sure: boolean } {
  if (reading.endsWith("する") || (reading.endsWith("くる") && (word.endsWith("来る") || word === "くる"))) return { group: 3, sure: true };
  if (!reading.endsWith("る")) return { group: 1, sure: true };
  const before = reading.at(-2) ?? "";
  if (!I_E_ROW.has(before)) return { group: 1, sure: true };
  if ([...GODAN_RU_EXCEPTIONS].some(exception => word.endsWith(exception))) return { group: 1, sure: true };
  const kanaOnly = [...word].every(isKana);
  return { group: 2, sure: !(kanaOnly && AMBIGUOUS_READINGS.has(reading)) };
}

export type EntryIssue = string;
/** 직접 넣은 낱말이 활용할 수 있는 모양인지 봅니다. */
export function entryIssue(entry: Pick<ConjEntry, "word" | "reading" | "kind">): EntryIssue | null {
  const word = entry.word.trim();
  const reading = entry.reading.trim();
  if (!word) return "낱말을 입력해 주세요.";
  if (!reading || !isHiragana(reading)) return "읽기를 히라가나로 입력해 주세요.";
  const kanaTail = (text: string) => text.at(-1) ?? "";
  if (entry.kind === "verb") {
    if (!U_ENDINGS.includes(kanaTail(reading)) || kanaTail(word) !== kanaTail(reading)) return "동사는 う단(う·く·ぐ·す·つ·ぬ·ぶ·む·る)으로 끝나는 사전형으로 입력해 주세요.";
  }
  if (entry.kind === "iAdj" && (!reading.endsWith("い") || !word.endsWith("い"))) return "い형용사는 い로 끝나는 기본형으로 입력해 주세요.";
  if (entry.kind === "naAdj" && (word.endsWith("だ") || word.endsWith("な"))) return "な형용사는 だ·な를 빼고 입력해 주세요(예: 静か).";
  if (isHiragana(word) && word !== reading) return "히라가나로 쓴 낱말은 읽기와 같아야 해요.";
  return null;
}

// ── 후리가나 ───────────────────────────────────────────────

export type RubyPart = { text: string; ruby?: string };
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const kanaOf = (text: string) => text.replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));

/** 한자 표기와 읽기를 맞춰 한자 부분에만 후리가나를 붙입니다. 맞출 수 없으면 전체에 읽기를 붙입니다. */
export function alignRuby(word: string, reading: string): RubyPart[] {
  const runs = word.match(/[ぁ-ゟ゠-ヿー]+|[^ぁ-ゟ゠-ヿー]+/g) ?? [];
  if (runs.every(run => isKana(run[0]))) return [{ text: word }];
  const pattern = new RegExp(`^${runs.map(run => isKana(run[0]) ? `(${escapeRegex(kanaOf(run))})` : "(.+?)").join("")}$`);
  const match = kanaOf(reading).match(pattern);
  if (!match) return [{ text: word, ruby: reading }];
  return runs.map((run, index) => isKana(run[0]) ? { text: run } : { text: run, ruby: match[index + 1] });
}

/** 바뀐 끝부분을 찾아 [그대로인 앞부분, 바뀐 부분]으로 나눕니다. */
export function splitChange(base: string, changed: string): [string, string] {
  let index = 0;
  const limit = Math.min(base.length - 1, changed.length);
  while (index < limit && base[index] === changed[index]) index += 1;
  return [changed.slice(0, index), changed.slice(index)];
}

// ── 기본 낱말 ──────────────────────────────────────────────

const entry = (kind: WordKind, group?: VerbGroup) => (spec: string): ConjEntry => {
  const [word, reading, meaning, note] = spec.split("|");
  return { word, reading, meaning, kind, ...(group && { group }), ...(note && { note }) };
};
// 고등학교 일본어Ⅰ 교과서에 자주 나오는 낱말입니다. note는 헷갈리기 쉬운 점입니다.
export const BUILTIN_ENTRIES: ConjEntry[] = [
  ...["会う|あう|만나다", "買う|かう|사다", "言う|いう|말하다", "使う|つかう|사용하다", "習う|ならう|배우다", "歌う|うたう|노래하다",
    "行く|いく|가다|て형·た형이 行って·行った인 예외", "書く|かく|쓰다", "聞く|きく|듣다, 묻다", "歩く|あるく|걷다", "泳ぐ|およぐ|헤엄치다",
    "話す|はなす|이야기하다", "待つ|まつ|기다리다", "持つ|もつ|들다, 가지다", "死ぬ|しぬ|죽다", "遊ぶ|あそぶ|놀다", "呼ぶ|よぶ|부르다",
    "飲む|のむ|마시다", "読む|よむ|읽다", "休む|やすむ|쉬다", "作る|つくる|만들다", "乗る|のる|타다", "分かる|わかる|알다, 이해하다",
    "ある|ある|있다(사물)|ない형이 ない인 예외", "帰る|かえる|돌아가다|2그룹처럼 보이는 1그룹", "入る|はいる|들어가다|2그룹처럼 보이는 1그룹",
    "走る|はしる|달리다|2그룹처럼 보이는 1그룹", "知る|しる|알다|2그룹처럼 보이는 1그룹", "切る|きる|자르다|2그룹처럼 보이는 1그룹"].map(entry("verb", 1)),
  ...["見る|みる|보다", "起きる|おきる|일어나다", "着る|きる|입다", "借りる|かりる|빌리다", "いる|いる|있다(사람·동물)", "できる|できる|할 수 있다",
    "食べる|たべる|먹다", "寝る|ねる|자다", "教える|おしえる|가르치다", "出る|でる|나가다", "見せる|みせる|보여 주다", "開ける|あける|열다",
    "忘れる|わすれる|잊다", "始める|はじめる|시작하다"].map(entry("verb", 2)),
  ...["する|する|하다", "来る|くる|오다|来는 활용에 따라 き·こ로 읽음", "勉強する|べんきょうする|공부하다", "運動する|うんどうする|운동하다", "料理する|りょうりする|요리하다"].map(entry("verb", 3)),
  ...["高い|たかい|높다, 비싸다", "安い|やすい|싸다", "大きい|おおきい|크다", "小さい|ちいさい|작다", "新しい|あたらしい|새롭다", "古い|ふるい|낡다, 오래되다",
    "暑い|あつい|덥다", "寒い|さむい|춥다", "楽しい|たのしい|즐겁다", "おいしい|おいしい|맛있다", "難しい|むずかしい|어렵다", "易しい|やさしい|쉽다",
    "忙しい|いそがしい|바쁘다", "面白い|おもしろい|재미있다", "近い|ちかい|가깝다", "遠い|とおい|멀다", "多い|おおい|많다",
    "いい|いい|좋다|활용할 때는 よい로 바뀜(よくない, よかった)"].map(entry("iAdj")),
  ...["好き|すき|좋아하다", "嫌い|きらい|싫어하다", "上手|じょうず|잘하다, 능숙하다", "下手|へた|서투르다", "静か|しずか|조용하다", "有名|ゆうめい|유명하다",
    "元気|げんき|건강하다, 활기차다", "親切|しんせつ|친절하다", "便利|べんり|편리하다", "きれい|きれい|예쁘다, 깨끗하다|い로 끝나지만 な형용사",
    "大丈夫|だいじょうぶ|괜찮다", "暇|ひま|한가하다", "大切|たいせつ|소중하다", "簡単|かんたん|간단하다", "にぎやか|にぎやか|번화하다, 북적이다"].map(entry("naAdj")),
];
export const entryKey = (entry: Pick<ConjEntry, "word" | "kind">) => `${entry.kind}:${entry.word}`;

// ── 규칙 안내 ──────────────────────────────────────────────

export const RULE_NOTES: Record<WordKind, [string, string][]> = {
  verb: [
    ["1그룹", "う단으로 끝나는 동사(2·3그룹이 아닌 동사). ます형은 い단 + ます, ない형은 あ단 + ない(う → わない)."],
    ["て형(1그룹)", "う·つ·る → って, む·ぶ·ぬ → んで, く → いて, ぐ → いで, す → して. 行く는 行って."],
    ["2그룹", "い단·え단 + る로 끝나는 동사. る를 떼고 ます·て·た·ない·られる·よう를 붙입니다. 帰る·入る·走る·知る·切る는 1그룹."],
    ["3그룹", "する → します·して·しない·できる, 来る(くる) → 来ます(き)·来ない(こ)·来られる(こ)."],
  ],
  iAdj: [
    ["い형용사", "끝의 い를 떼고 くない·かった·くなかった·くて·く를 붙입니다. 정중형은 기본형 + です."],
    ["예외", "いい는 よい로 바꿔 활용합니다: よくない, よかった, よくて."],
  ],
  naAdj: [
    ["な형용사", "어간에 です·じゃない·だった·じゃなかった·で를 붙이고, 명사 앞에서는 な, 부사로는 に를 붙입니다."],
    ["주의", "きれい·きらい처럼 い로 끝나도 な형용사인 낱말이 있습니다. じゃない는 ではない라고도 씁니다."],
  ],
};

// ── 활용 연습지 ────────────────────────────────────────────

export type ConjSheetOptions = { title: string; kind: WordKind; forms: string[]; example: boolean; group: boolean; meaning: boolean; furigana: boolean; rules: boolean; shuffle: boolean; seed: number; answers: boolean };

const rubyHtml = (parts: RubyPart[], show: boolean) => parts.map(part => part.ruby && show ? `<ruby>${escapeHtml(part.text)}<rt style="font-size:.5em">${escapeHtml(part.ruby)}</rt></ruby>` : escapeHtml(part.text)).join("");
export const formText = (value: Conjugated) => value.word === value.reading ? value.word : `${value.word}(${value.reading})`;

/** 낱말마다 한 줄, 활용마다 한 칸인 표입니다. 예시를 켜면 첫 줄은 답을 채워 둡니다. */
export function conjSheetHtml(entries: ConjEntry[], options: ConjSheetOptions, mode: SheetMode) {
  const list = options.shuffle ? shuffled(entries, options.seed) : entries;
  const forms = options.forms;
  const border = "border:1px solid #555";
  const table = (filled: boolean) => {
    const head = `<tr><th style="${border};background:#f2f2f2;font-size:9.5pt;padding:1.5mm">사전형</th>${options.group && options.kind === "verb" ? `<th style="${border};background:#f2f2f2;font-size:9pt;width:13mm">그룹</th>` : ""}`
      + forms.map(form => `<th style="${border};background:#f2f2f2;font-size:9.5pt;padding:1.5mm">${escapeHtml(formLabel(options.kind, form).label)}</th>`).join("") + "</tr>";
    const rows = list.map((entry, index) => {
      const show = filled || (options.example && index === 0);
      const base = dictionaryForm(entry);
      const head = `<td style="${border};padding:1.5mm 2mm;white-space:nowrap"><div style="font-size:13pt;line-height:1.5">${jaHtml(rubyHtml(alignRuby(base.word, base.reading), options.furigana), mode)}</div>`
        + (options.meaning ? `<div style="font-size:8.5pt;color:#555">${escapeHtml(entry.meaning)}</div>` : "") + "</td>";
      const group = options.group && options.kind === "verb" ? `<td style="${border};text-align:center;font-size:10pt">${show ? escapeHtml(String(entry.group ?? "")) : ""}</td>` : "";
      const cells = forms.map(form => {
        const value = conjugate(entry, form as ConjForm);
        const text = !value ? "—" : show ? jaHtml(rubyHtml(alignRuby(value.word, value.reading), options.furigana), mode) : "";
        return `<td style="${border};padding:1.5mm 1.5mm;height:11mm;text-align:center;font-size:11.5pt;${show && !filled ? "color:#666;" : ""}">${text}</td>`;
      }).join("");
      return `<tr style="break-inside:avoid">${head}${group}${cells}</tr>`;
    }).join("");
    return `<table style="width:100%;border-collapse:collapse;table-layout:auto;margin:0 0 4mm">${head}${rows}</table>`;
  };
  const rules = options.rules ? `<div style="margin:0 0 4mm;padding:2mm 3mm;border:1px solid #999;font-size:9.5pt;line-height:1.6">${RULE_NOTES[options.kind].map(([title, body]) => `<div><b>${escapeHtml(title)}</b> ${escapeHtml(body)}</div>`).join("")}</div>` : "";
  const instruction = `<h2 style="margin:0 0 2mm;font-size:12pt">${romans[0]}. 다음 ${kindLabels[options.kind]}를 활용하여 빈칸을 채우시오.${options.group && options.kind === "verb" ? " (그룹 칸에는 1·2·3 중 하나를 쓰시오.)" : ""}</h2>`;
  const answers = options.answers ? answerSection(table(true), mode) : "";
  return clipboardWrap(sheetHead(options.title.trim() || `${kindLabels[options.kind]} 활용 연습`) + rules + instruction + table(false) + answers, mode);
}

export function conjSheetText(entries: ConjEntry[], options: ConjSheetOptions) {
  const list = options.shuffle ? shuffled(entries, options.seed) : entries;
  const blocks = textHead(options.title.trim() || `${kindLabels[options.kind]} 활용 연습`);
  if (options.rules) blocks.push(RULE_NOTES[options.kind].map(([title, body]) => `${title}: ${body}`).join("\n"));
  const header = ["사전형", ...(options.group && options.kind === "verb" ? ["그룹"] : []), ...options.forms.map(form => formLabel(options.kind, form).label)].join(" | ");
  const row = (entry: ConjEntry, filled: boolean) => {
    const base = dictionaryForm(entry);
    return [formText(base) + (options.meaning ? ` ${entry.meaning}` : ""), ...(options.group && options.kind === "verb" ? [filled ? String(entry.group ?? "") : "   "] : []),
      ...options.forms.map(form => { const value = conjugate(entry, form as ConjForm); return !value ? "—" : filled ? formText(value) : "________"; })].join(" | ");
  };
  blocks.push([`${romans[0]}. 다음 ${kindLabels[options.kind]}를 활용하여 빈칸을 채우시오.`, header, ...list.map((entry, index) => row(entry, options.example && index === 0))].join("\n"));
  if (options.answers) blocks.push(["[정답]", header, ...list.map(entry => row(entry, true))].join("\n"));
  return blocks.join("\n\n");
}
