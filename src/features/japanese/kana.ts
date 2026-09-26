/* 히라가나·가타카나 50음도 자료입니다. 가나 학습지·퀴즈·플래시 카드와 자료 생성 스크립트(scripts/build-kana-data.ts)가 함께 씁니다.
 * 한글 발음은 수업에서 흔히 쓰는 참고 표기입니다(か 카, つ 츠, ん 응). 외래어 표기법(어두 か → 가)과는 다릅니다.
 * 획 수는 교과서 기준이고, 획순 그림(KanjiVG)의 획 수와 같은지 scripts/verify-japanese.ts가 확인합니다. */

export type Script = "hira" | "kata";
export type ScriptChoice = Script | "both";
export type KanaGroup = "seion" | "dakuon" | "handakuon" | "yoon";

export const scriptLabels: Record<Script, string> = { hira: "히라가나", kata: "가타카나" };
export const groupLabels: Record<KanaGroup, string> = { seion: "청음", dakuon: "탁음", handakuon: "반탁음", yoon: "요음" };

export type KanaCell = { hira: string; kata: string; romaji: string; korean: string; row: string; group: KanaGroup };
export type KanaRow = { key: string; label: string; group: KanaGroup; cells: (KanaCell | null)[] };

// 한 행을 "가나 로마자 한글|…"로 적습니다. _는 빈칸입니다(や행의 い·え 자리 등).
const ROW_SPECS: [key: string, group: KanaGroup, spec: string][] = [
  ["a", "seion", "あ a 아|い i 이|う u 우|え e 에|お o 오"],
  ["ka", "seion", "か ka 카|き ki 키|く ku 쿠|け ke 케|こ ko 코"],
  ["sa", "seion", "さ sa 사|し shi 시|す su 스|せ se 세|そ so 소"],
  ["ta", "seion", "た ta 타|ち chi 치|つ tsu 츠|て te 테|と to 토"],
  ["na", "seion", "な na 나|に ni 니|ぬ nu 누|ね ne 네|の no 노"],
  ["ha", "seion", "は ha 하|ひ hi 히|ふ fu 후|へ he 헤|ほ ho 호"],
  ["ma", "seion", "ま ma 마|み mi 미|む mu 무|め me 메|も mo 모"],
  ["ya", "seion", "や ya 야|_|ゆ yu 유|_|よ yo 요"],
  ["ra", "seion", "ら ra 라|り ri 리|る ru 루|れ re 레|ろ ro 로"],
  ["wa", "seion", "わ wa 와|_|_|_|を wo 오"],
  ["n", "seion", "ん n 응|_|_|_|_"],
  ["ga", "dakuon", "が ga 가|ぎ gi 기|ぐ gu 구|げ ge 게|ご go 고"],
  ["za", "dakuon", "ざ za 자|じ ji 지|ず zu 즈|ぜ ze 제|ぞ zo 조"],
  ["da", "dakuon", "だ da 다|ぢ ji 지|づ zu 즈|で de 데|ど do 도"],
  ["ba", "dakuon", "ば ba 바|び bi 비|ぶ bu 부|べ be 베|ぼ bo 보"],
  ["pa", "handakuon", "ぱ pa 파|ぴ pi 피|ぷ pu 푸|ぺ pe 페|ぽ po 포"],
  ["kya", "yoon", "きゃ kya 캬|きゅ kyu 큐|きょ kyo 쿄"],
  ["sha", "yoon", "しゃ sha 샤|しゅ shu 슈|しょ sho 쇼"],
  ["cha", "yoon", "ちゃ cha 챠|ちゅ chu 츄|ちょ cho 쵸"],
  ["nya", "yoon", "にゃ nya 냐|にゅ nyu 뉴|にょ nyo 뇨"],
  ["hya", "yoon", "ひゃ hya 햐|ひゅ hyu 휴|ひょ hyo 효"],
  ["mya", "yoon", "みゃ mya 먀|みゅ myu 뮤|みょ myo 묘"],
  ["rya", "yoon", "りゃ rya 랴|りゅ ryu 류|りょ ryo 료"],
  ["gya", "yoon", "ぎゃ gya 갸|ぎゅ gyu 규|ぎょ gyo 교"],
  ["ja", "yoon", "じゃ ja 쟈|じゅ ju 쥬|じょ jo 죠"],
  ["bya", "yoon", "びゃ bya 뱌|びゅ byu 뷰|びょ byo 뵤"],
  ["pya", "yoon", "ぴゃ pya 퍄|ぴゅ pyu 퓨|ぴょ pyo 표"],
];

/** 히라가나를 가타카나로 바꿉니다(ぁ~ゖ → ァ~ヶ). 다른 글자는 그대로 둡니다. */
export const toKatakana = (text: string) => text.replace(/[ぁ-ゖ]/g, char => String.fromCharCode(char.charCodeAt(0) + 0x60));
/** 가타카나를 히라가나로 바꿉니다. 장음 부호(ー)는 그대로 둡니다. */
export const toHiragana = (text: string) => text.replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));

export const KANA_ROWS: KanaRow[] = ROW_SPECS.map(([key, group, spec]) => {
  const cells = spec.split("|").map(part => {
    if (part === "_") return null;
    const [hira, romaji, korean] = part.split(" ");
    return { hira, kata: toKatakana(hira), romaji, korean, row: key, group };
  });
  return { key, group, label: key === "n" ? "ん" : `${cells.find(Boolean)!.hira}행`, cells };
});
export const KANA_CELLS = KANA_ROWS.flatMap(row => row.cells.filter((cell): cell is KanaCell => cell !== null));
export const rowsOfGroup = (group: KanaGroup) => KANA_ROWS.filter(row => row.group === group);

const cellByKana = new Map(KANA_CELLS.flatMap(cell => [[cell.hira, cell], [cell.kata, cell]] as const));
export const kanaCell = (kana: string) => cellByKana.get(kana);

// 교과서 획 수입니다. 탁음은 청음 + 2획, 반탁음은 + 1획입니다.
const parseStrokes = (text: string) => new Map([...text.matchAll(/(\D)(\d)/gu)].map(match => [match[1], Number(match[2])]));
const HIRA_STROKES = parseStrokes("あ3い2う2え2お3か3き4く1け3こ2さ3し1す2せ3そ1た4ち2つ1て1と2な4に3ぬ2ね2の1は3ひ1ふ4へ1ほ4ま3み2む3め2も3や3ゆ2よ2ら2り2る1れ2ろ1わ2を3ん1");
const KATA_STROKES = parseStrokes("ア2イ2ウ3エ3オ3カ2キ3ク2ケ3コ2サ3シ3ス2セ2ソ2タ3チ3ツ3テ3ト2ナ2ニ2ヌ2ネ4ノ1ハ2ヒ2フ1ヘ1ホ4マ2ミ3ム2メ2モ3ヤ2ユ2ヨ3ラ2リ2ル2レ1ロ3ワ2ヲ3ン2");
/** 한 글자의 획 수입니다. 요음처럼 두 글자면 null입니다. */
export function strokeCount(kana: string): number | null {
  if ([...kana].length !== 1) return null;
  const [base, mark] = [...kana.normalize("NFD")];
  const count = HIRA_STROKES.get(base) ?? KATA_STROKES.get(base);
  if (!count) return null;
  return count + (mark === "゙" ? 2 : mark === "゚" ? 1 : 0);
}

const SMALL_KANA = "ゃゅょっャュョッ";
/** 획순 자료가 필요한 글자: 요음을 뺀 모든 가나와 작은 가나입니다. */
export const KANA_CHARS = [...new Set([...KANA_CELLS.filter(cell => cell.group !== "yoon").flatMap(cell => [cell.hira, cell.kata]), ...SMALL_KANA])];

// ── 헷갈리는 글자 ─────────────────────────────────────────

export const CONFUSABLE_SETS: { chars: string[]; tip: string }[] = [
  { chars: ["シ", "ツ"], tip: "シ는 점 두 개를 세로로 찍고 마지막 획을 아래에서 위로 긋습니다. ツ는 점을 가로로 찍고 마지막 획을 위에서 아래로 긋습니다." },
  { chars: ["ソ", "ン"], tip: "ソ는 두 획 모두 위에서 아래로 긋고, ン은 마지막 획을 아래에서 위로 올려 긋습니다." },
  { chars: ["ぬ", "め"], tip: "ぬ는 끝에 작은 고리가 있고, め는 고리 없이 끝납니다." },
  { chars: ["る", "ろ"], tip: "る는 끝에 작은 고리가 있고, ろ는 고리 없이 끝납니다." },
  { chars: ["わ", "ね", "れ"], tip: "왼쪽 획은 같고 오른쪽 끝이 다릅니다. わ는 둥글게 끝나고, ね는 고리를 만들고, れ는 바깥으로 뻗습니다." },
  { chars: ["は", "ほ"], tip: "ほ는 오른쪽 위에 가로획이 하나 더 있습니다." },
  { chars: ["あ", "お"], tip: "あ는 가로획을 먼저 긋고 세로획이 가로획을 뚫고 내려갑니다. お는 오른쪽 위에 점이 있습니다." },
  { chars: ["い", "こ"], tip: "い는 두 획이 좌우로 나란하고, こ는 두 획이 위아래로 나란합니다." },
  { chars: ["コ", "ユ"], tip: "コ는 왼쪽이 열려 있고, ユ는 아래 가로획이 왼쪽까지 길게 나옵니다." },
  { chars: ["ア", "マ"], tip: "ア는 두 번째 획이 왼쪽 아래로 길게 내려오고, マ는 짧은 점으로 끝납니다." },
  { chars: ["ク", "ケ", "タ"], tip: "ケ는 가로획이 오른쪽으로 길게 뻗고, タ는 안쪽에 짧은 획이 하나 더 있습니다." },
  { chars: ["ノ", "メ"], tip: "メ는 ノ에 짧은 획 하나를 엇갈려 긋습니다." },
];

// ── 고른 글자 ─────────────────────────────────────────────

export type KanaSelection = { script: ScriptChoice; rows: string[]; confusable: boolean };
export type KanaItem = { char: string; script: Script; romaji: string; korean: string; row: string; group: KanaGroup; pair: string; tip?: string };

const itemOf = (cell: KanaCell, script: Script, tip?: string): KanaItem => ({
  char: cell[script], script, romaji: cell.romaji, korean: cell.korean, row: cell.row, group: cell.group, pair: cell[script === "hira" ? "kata" : "hira"], ...(tip && { tip }),
});
export const scriptOf = (kana: string): Script => /[゠-ヿ]/.test(kana) ? "kata" : "hira";

/** 고른 행의 글자를 히라가나 먼저, 50음도 순서대로 늘어놓고, 헷갈리는 글자를 뒤에 붙입니다. */
export function selectedItems(selection: KanaSelection): KanaItem[] {
  const scripts: Script[] = selection.script === "both" ? ["hira", "kata"] : [selection.script];
  const rows = KANA_ROWS.filter(row => selection.rows.includes(row.key));
  const items = scripts.flatMap(script => rows.flatMap(row => row.cells.flatMap(cell => cell ? [itemOf(cell, script)] : [])));
  if (selection.confusable) {
    const seen = new Set(items.map(item => item.char));
    for (const set of CONFUSABLE_SETS) for (const char of set.chars) {
      const cell = kanaCell(char);
      if (cell && !seen.has(char)) { seen.add(char); items.push(itemOf(cell, scriptOf(char), set.tip)); }
    }
  }
  return items;
}
export const tipOf = (char: string) => CONFUSABLE_SETS.find(set => set.chars.includes(char))?.tip;

// ── 낱말 ──────────────────────────────────────────────────

/** 가나를 읽는 단위로 나눕니다. 작은 ゃゅょ는 앞 글자와 한 단위입니다. 모르는 글자가 있으면 null입니다. */
export function kanaUnits(word: string): KanaCell[] | null {
  const units: KanaCell[] = [];
  const chars = [...word];
  for (let index = 0; index < chars.length; index += 1) {
    const yoon = "ゃゅょャュョ".includes(chars[index + 1] ?? "_") ? kanaCell(chars[index] + chars[index + 1]) : undefined;
    const cell = yoon ?? kanaCell(chars[index]);
    if (!cell) return null;
    if (yoon) index += 1;
    units.push(cell);
  }
  return units;
}

// ん은 앞 글자의 받침(ㄴ)으로 붙입니다: ほん → 혼, レモン → 레몬.
function koreanOf(units: KanaCell[]) {
  let result = "";
  for (const unit of units) {
    const last = result.charCodeAt(result.length - 1);
    if (unit.row === "n" && last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 === 0) result = result.slice(0, -1) + String.fromCharCode(last + 4);
    else result += unit.korean;
  }
  return result;
}
export function wordReading(word: string) {
  const units = kanaUnits(word);
  return units ? { romaji: units.map(unit => unit.romaji).join(""), korean: koreanOf(units) } : null;
}

// 배운 글자만으로 읽을 수 있는 낱말을 고르는 데 씁니다. 촉음(っ)·장음(ー)이 든 낱말은 넣지 않았습니다.
export const KANA_WORDS: [word: string, meaning: string][] = [
  ["あい", "사랑"], ["あお", "파랑"], ["あき", "가을"], ["あさ", "아침"], ["あし", "다리, 발"], ["いえ", "집"], ["いぬ", "개"], ["うえ", "위"], ["うた", "노래"], ["うみ", "바다"],
  ["えき", "역"], ["おかし", "과자"], ["かお", "얼굴"], ["かさ", "우산"], ["かぎ", "열쇠"], ["きく", "국화"], ["くち", "입"], ["くつ", "신발"], ["くるま", "자동차"], ["こえ", "목소리"],
  ["さかな", "생선"], ["さくら", "벚꽃"], ["しお", "소금"], ["すし", "초밥"], ["そら", "하늘"], ["たこ", "문어"], ["ちず", "지도"], ["つき", "달"], ["つくえ", "책상"], ["とけい", "시계"],
  ["なつ", "여름"], ["にく", "고기"], ["ねこ", "고양이"], ["はな", "꽃"], ["はる", "봄"], ["ひと", "사람"], ["ふね", "배"], ["ふゆ", "겨울"], ["へや", "방"], ["ほし", "별"],
  ["ほん", "책"], ["みみ", "귀"], ["みず", "물"], ["むし", "벌레"], ["もり", "숲"], ["やま", "산"], ["ゆき", "눈(내리는 눈)"], ["よる", "밤"], ["りんご", "사과"], ["わたし", "나, 저"],
  ["てがみ", "편지"], ["ごはん", "밥"], ["でんわ", "전화"], ["かぞく", "가족"], ["ともだち", "친구"], ["おちゃ", "차(마시는 차)"], ["きしゃ", "기차"], ["いしゃ", "의사"], ["でんしゃ", "전철"], ["しゅくだい", "숙제"],
  ["カメラ", "카메라"], ["パン", "빵"], ["ピアノ", "피아노"], ["テレビ", "텔레비전"], ["トマト", "토마토"], ["バナナ", "바나나"], ["メロン", "멜론"], ["ラジオ", "라디오"], ["ペン", "펜"], ["ホテル", "호텔"],
  ["アメリカ", "미국"], ["カナダ", "캐나다"], ["サラダ", "샐러드"], ["ドア", "문"], ["ナイフ", "나이프"], ["ハンカチ", "손수건"], ["ミルク", "우유"], ["レモン", "레몬"], ["キムチ", "김치"], ["ソウル", "서울"],
  ["アイス", "아이스크림"], ["ネクタイ", "넥타이"], ["ワイン", "와인"], ["ピザ", "피자"], ["ボタン", "단추, 버튼"], ["マスク", "마스크"], ["テニス", "테니스"], ["バス", "버스"], ["メモ", "메모"], ["ドラマ", "드라마"],
  ["シャツ", "셔츠"], ["パスタ", "파스타"], ["クラス", "반, 학급"],
].filter(([word]) => !/[っッー]/.test(word)) as [string, string][];

/** 고른 글자만으로 된 낱말입니다. */
export function wordsFor(items: KanaItem[]) {
  const known = new Set(items.map(item => item.char));
  return KANA_WORDS.filter(([word]) => {
    const units = kanaUnits(word);
    const script = scriptOf(word);
    return units?.every(unit => known.has(unit[script]));
  });
}
