import { alignRuby } from "./conjugation";
import { answerSection, clipboardWrap, escapeHtml, jaHtml, romans, sheetHead, textHead, type SheetMode } from "./sheet";

/* 일본문화 수업의 주제 자료와 활동지입니다. 주제 내용은 고등학교 일본문화 교과에서 흔히 다루는 사실만 직접 적었습니다.
 * 일본어에는 {漢字|かんじ} 표기로 후리가나를 답니다(본문 풀이 도구와 같은 표기). */

// ── 후리가나 표기 ─────────────────────────────────────────

export type RubyToken = { text: string; ruby?: string };
const KANJI = /[\p{Script=Han}々〆ヶ]/u;
const KANA_ONLY = /^[ぁ-ゟ゠-ヿー]+$/u;

/** {한자|읽기}를 후리가나 조각으로, 나머지는 글자 그대로 나눕니다. 띄어쓰기는 그대로 둡니다. */
export function rubyTokens(text: string): RubyToken[] {
  const tokens: RubyToken[] = [];
  for (const part of text.normalize("NFC").split(/(\{[^{}|]+\|[^{}|]*\})/u)) {
    if (!part) continue;
    const match = part.match(/^\{([^{}|]+)\|([^{}|]*)\}$/u);
    if (match) tokens.push({ text: match[1], ruby: match[2] });
    else if (tokens.at(-1) && !tokens.at(-1)!.ruby) tokens.at(-1)!.text += part;
    else tokens.push({ text: part });
  }
  return tokens;
}
export const stripRuby = (text: string) => rubyTokens(text).map(token => token.text).join("");

/** 후리가나를 단 HTML입니다. furigana가 꺼져 있으면 한자만 씁니다. */
export function rubyHtml(text: string, furigana: boolean) {
  return rubyTokens(text).map(token => token.ruby && furigana ? `<ruby>${escapeHtml(token.text)}<rt style="font-size:.5em">${escapeHtml(token.ruby)}</rt></ruby>` : escapeHtml(token.text)).join("");
}
/** 낱말과 읽기를 맞춰 한자 부분에만 후리가나를 단 HTML입니다(おせち料理 → 料理에만 りょうり). */
export const wordRubyHtml = (word: string, reading: string) => alignRuby(word, reading).map(part => part.ruby ? `<ruby>${escapeHtml(part.text)}<rt style="font-size:.5em">${escapeHtml(part.ruby)}</rt></ruby>` : escapeHtml(part.text)).join("");
export const rubyText = (text: string) => rubyTokens(text).map(token => token.ruby ? `${token.text}(${token.ruby})` : token.text).join("");

/** 후리가나 표기 형식을 점검합니다. japanese면 후리가나가 없는 한자도 알립니다. */
export function rubyIssues(text: string, japanese: boolean): string[] {
  const issues: string[] = [];
  const tokens = rubyTokens(text);
  const braces = [...text].filter(char => "{}|".includes(char)).length - tokens.filter(token => token.ruby !== undefined).length * 3;
  if (braces) issues.push("후리가나 괄호 {한자|읽기}가 맞지 않는 곳이 있습니다.");
  const bad = tokens.filter(token => token.ruby !== undefined && !KANA_ONLY.test(token.ruby));
  if (bad.length) issues.push(`후리가나는 가나로만 씁니다: ${bad.map(token => token.text).join(", ")}`);
  if (japanese) {
    const bare = [...new Set(tokens.filter(token => token.ruby === undefined).flatMap(token => [...token.text].filter(char => KANJI.test(char))))];
    if (bare.length) issues.push(`후리가나가 없는 한자: ${bare.slice(0, 8).join(" ")}`);
  }
  return issues;
}

// ── 주제 자료 ─────────────────────────────────────────────

export const cultureCategories = { events: "연중 행사", food: "음식", life: "생활·예절", tradition: "전통 문화", school: "학교·대중문화", regions: "지역" } as const;
export type CultureCategory = keyof typeof cultureCategories;
export type CultureWord = { word: string; reading: string; meaning: string };
export type CultureQuiz = { statement: string; answer: boolean; note?: string };
/** ja·phrase.ja는 후리가나 표기, 나머지 설명은 한국어입니다. japan·korea는 한일 비교표의 한 줄입니다. */
export type CultureTopic = {
  id: string; category: CultureCategory; title: string; ja: string; when?: string;
  summary: string; points: string[]; words: CultureWord[]; phrase?: { ja: string; ko: string };
  japan: string; korea: string; quiz: CultureQuiz[]; think: string;
};

const words = (spec: string): CultureWord[] => spec.split("|").map(item => {
  const [word, reading, meaning] = item.split("/");
  return { word, reading, meaning };
});

export const CULTURE_TOPICS: CultureTopic[] = [
  {
    id: "shogatsu", category: "events", title: "설날", ja: "お{正月|しょうがつ}", when: "1월 1일",
    summary: "일본은 양력 1월 1일을 새해 첫날로 쇠며, 1년 가운데 가장 큰 명절입니다. 가족이 모여 설 음식을 먹고 신사나 절에 새해 첫 참배를 갑니다.",
    points: ["문 앞에 門松(かどまつ)나 しめ飾り를 장식해 새해의 신을 맞이합니다.", "おせち料理(설 요리)와 お雑煮(떡을 넣은 국)를 먹습니다.", "새해에 처음으로 신사나 절에 참배하는 것을 初詣(はつもうで)라고 합니다.", "아이들은 お年玉(세뱃돈)를 받고, 새해 인사 엽서인 年賀状(연하장)를 주고받습니다."],
    words: words("初詣/はつもうで/새해 첫 참배|お年玉/おとしだま/세뱃돈|年賀状/ねんがじょう/연하장|おせち料理/おせちりょうり/설 요리|お雑煮/おぞうに/떡을 넣은 설 음식"),
    phrase: { ja: "{明|あ}けましておめでとうございます。", ko: "새해 복 많이 받으세요." },
    japan: "양력 1월 1일, 初詣·おせち料理·お年玉", korea: "음력 1월 1일(설날), 차례·세배·떡국·세뱃돈",
    quiz: [{ statement: "일본의 설날은 음력 1월 1일이다.", answer: false, note: "메이지 시대에 양력을 쓰기 시작한 뒤로 양력 1월 1일을 설로 쇱니다." }, { statement: "새해에 처음으로 신사나 절에 참배하는 것을 初詣라고 한다.", answer: true }],
    think: "한국의 설날과 일본의 お正月에서 비슷한 점과 다른 점은 무엇일까요?",
  },
  {
    id: "setsubun", category: "events", title: "세쓰분", ja: "{節分|せつぶん}", when: "2월 3일 무렵",
    summary: "節分은 계절이 나뉘는 날이라는 뜻으로, 지금은 입춘 전날을 가리킵니다. 콩을 뿌려 나쁜 기운을 쫓고 복을 부르는 행사를 합니다.",
    points: ["「鬼は外、福は内」라고 외치며 볶은 콩을 뿌립니다(豆まき).", "나이만큼, 또는 나이보다 하나 더 콩을 먹으며 건강을 빕니다.", "그해의 길한 방향(恵方)을 보며 굵은 김밥 恵方巻를 먹는 풍습도 널리 퍼졌습니다."],
    words: words("豆まき/まめまき/콩 뿌리기|鬼/おに/도깨비|福/ふく/복|恵方巻/えほうまき/복을 비는 굵은 김밥"),
    phrase: { ja: "{鬼|おに}は{外|そと}、{福|ふく}は{内|うち}!", ko: "도깨비는 밖으로, 복은 안으로!" },
    japan: "입춘 전날, 콩을 뿌려 도깨비(나쁜 기운)를 쫓음", korea: "정월대보름에 부럼을 깨물며 한 해의 건강을 빎",
    quiz: [{ statement: "節分에는 콩을 뿌리며 나쁜 기운을 쫓는다.", answer: true }, { statement: "節分은 여름이 시작되는 날의 전날이다.", answer: false, note: "지금은 입춘(봄이 시작되는 날) 전날을 말합니다." }],
    think: "나쁜 기운을 쫓고 복을 비는 한국의 풍습에는 무엇이 있을까요?",
  },
  {
    id: "hinamatsuri", category: "events", title: "히나마쓰리", ja: "ひな{祭|まつ}り", when: "3월 3일",
    summary: "여자아이가 건강하고 행복하게 자라기를 비는 날입니다. 복숭아꽃이 피는 무렵이라 桃の節句라고도 합니다.",
    points: ["집에 ひな人形(히나 인형)를 계단 모양 단에 장식합니다.", "ひなあられ(색깔 과자), ちらし寿司 등을 먹습니다.", "공휴일은 아닙니다."],
    words: words("ひな人形/ひなにんぎょう/히나 인형|桃の節句/もものせっく/복숭아 절구(3월 3일)|ちらし寿司/ちらしずし/재료를 흩뿌린 초밥"),
    japan: "3월 3일, 여자아이의 성장을 빌며 히나 인형 장식", korea: "삼짇날(음력 3월 3일)에 진달래 화전을 부쳐 먹던 풍습",
    quiz: [{ statement: "ひな祭り는 남자아이의 성장을 비는 날이다.", answer: false, note: "여자아이의 성장을 비는 날입니다. 남자아이는 5월 5일과 관련이 깊습니다." }, { statement: "ひな祭り는 일본의 공휴일이다.", answer: false, note: "공휴일은 아닙니다." }],
    think: "아이의 성장을 축하하는 한국의 행사(백일, 돌잔치)와 비교해 봅시다.",
  },
  {
    id: "kodomo", category: "events", title: "어린이날", ja: "こどもの{日|ひ}", when: "5월 5일",
    summary: "아이들의 행복을 비는 공휴일입니다. 원래는 남자아이의 성장을 빌던 端午の節句(단오)였습니다.",
    points: ["잉어 모양 깃발 こいのぼり를 높이 매답니다. 잉어처럼 씩씩하게 자라라는 뜻이 담겨 있습니다.", "무사의 투구(兜) 장식을 꾸미고, 柏餅(떡갈나무 잎으로 싼 떡)를 먹습니다.", "4월 말부터 5월 초까지 공휴일이 이어지는 ゴールデンウィーク에 들어 있습니다."],
    words: words("こいのぼり/こいのぼり/잉어 모양 깃발|柏餅/かしわもち/떡갈나무 잎으로 싼 떡|兜/かぶと/투구|端午の節句/たんごのせっく/단오"),
    japan: "양력 5월 5일 공휴일, こいのぼり·투구 장식·柏餅", korea: "5월 5일 어린이날(공휴일), 단오는 음력 5월 5일로 따로 있음",
    quiz: [{ statement: "こどもの日에는 잉어 모양 깃발을 매단다.", answer: true }, { statement: "일본의 こどもの日는 음력 5월 5일이다.", answer: false, note: "양력 5월 5일입니다." }],
    think: "한국과 일본의 어린이날은 날짜가 같습니다. 보내는 방법은 어떻게 다를까요?",
  },
  {
    id: "tanabata", category: "events", title: "칠석", ja: "{七夕|たなばた}", when: "7월 7일",
    summary: "직녀(織姫)와 견우(彦星)가 1년에 한 번 은하수를 건너 만난다는 전설에서 온 행사입니다.",
    points: ["短冊(たんざく)라는 색종이에 소원을 적어 대나무(笹)에 매답니다.", "지역에 따라 한 달 늦은 8월에 행사를 하기도 합니다(센다이 칠석 축제 등)."],
    words: words("短冊/たんざく/소원을 적는 종이|笹/ささ/조릿대|織姫/おりひめ/직녀|彦星/ひこぼし/견우|願い事/ねがいごと/소원"),
    phrase: { ja: "{願|ねが}い{事|ごと}が{叶|かな}いますように。", ko: "소원이 이루어지기를." },
    japan: "양력 7월 7일, 短冊에 소원을 적어 대나무에 매닮", korea: "음력 7월 7일 칠석, 견우와 직녀 이야기",
    quiz: [{ statement: "七夕에는 短冊에 소원을 적어 대나무에 매단다.", answer: true }, { statement: "七夕 전설의 주인공은 해와 달이다.", answer: false, note: "직녀(織姫)와 견우(彦星)입니다." }],
    think: "한국의 칠석 이야기와 일본의 七夕는 무엇이 같고 무엇이 다를까요?",
  },
  {
    id: "obon", category: "events", title: "오본", ja: "お{盆|ぼん}", when: "8월 중순 무렵",
    summary: "돌아가신 조상의 영혼이 집에 돌아온다고 여겨 맞이하고 다시 보내는 행사입니다. 많은 지역에서 8월 13일~16일 무렵에 지냅니다.",
    points: ["많은 사람이 고향에 돌아가 성묘를 합니다(帰省).", "마을마다 盆踊り(본오도리)라는 춤 행사가 열립니다.", "조상을 맞이하는 迎え火, 보내는 送り火를 피웁니다. 교토의 五山送り火가 유명합니다."],
    words: words("帰省/きせい/귀성|盆踊り/ぼんおどり/오본 때 추는 춤|お墓参り/おはかまいり/성묘"),
    japan: "8월 중순, 귀성·성묘·盆踊り", korea: "추석(음력 8월 15일), 귀성·차례·성묘·송편",
    quiz: [{ statement: "お盆에는 고향에 돌아가 성묘하는 사람이 많다.", answer: true }, { statement: "お盆은 법으로 정한 공휴일이다.", answer: false, note: "법정 공휴일은 아니지만 많은 회사가 쉽니다." }],
    think: "お盆과 추석은 어떤 점이 비슷할까요?",
  },
  {
    id: "shichigosan", category: "events", title: "시치고산", ja: "{七五三|しちごさん}", when: "11월 15일 무렵",
    summary: "3살·5살·7살이 된 아이의 성장을 축하하고 앞으로의 건강을 비는 행사입니다.",
    points: ["아이에게 기모노 등을 입히고 신사에 참배합니다.", "오래 살라는 뜻을 담은 가늘고 긴 사탕 千歳飴(ちとせあめ)를 삽니다.", "대체로 남자아이는 3살·5살, 여자아이는 3살·7살에 축하합니다(지역마다 다름)."],
    words: words("千歳飴/ちとせあめ/장수를 비는 긴 사탕|神社/じんじゃ/신사|お参り/おまいり/참배"),
    japan: "11월 15일 무렵, 3·5·7살 아이가 신사에 참배", korea: "백일·돌잔치로 아이의 성장을 축하",
    quiz: [{ statement: "七五三은 3살·5살·7살 아이의 성장을 축하하는 행사이다.", answer: true }, { statement: "千歳飴는 짧고 동그란 사탕이다.", answer: false, note: "오래 살라는 뜻으로 가늘고 긴 사탕입니다." }],
    think: "아이의 성장을 축하할 때 한국과 일본은 어떤 음식이나 물건을 쓸까요?",
  },
  {
    id: "omisoka", category: "events", title: "섣달그믐", ja: "{大晦日|おおみそか}", when: "12월 31일",
    summary: "한 해의 마지막 날입니다. 대청소를 마치고 가족과 함께 새해를 맞을 준비를 합니다.",
    points: ["가늘고 길게 오래 살라는 뜻 등을 담아 年越しそば를 먹습니다.", "절에서는 자정 무렵 除夜の鐘을 108번 칩니다. 108은 사람의 번뇌 수라고 합니다.", "TV 음악 프로그램 紅白歌合戦을 보며 한 해를 보내는 집도 많습니다."],
    words: words("年越しそば/としこしそば/해를 넘기며 먹는 메밀국수|除夜の鐘/じょやのかね/제야의 종|大掃除/おおそうじ/대청소"),
    phrase: { ja: "よいお{年|とし}を。", ko: "좋은 새해 맞으세요.(연말 인사)" },
    japan: "12월 31일, 年越しそば·절의 除夜の鐘 108번", korea: "12월 31일 밤 보신각 제야의 종 33번 타종",
    quiz: [{ statement: "大晦日에는 年越しそば를 먹는 풍습이 있다.", answer: true }, { statement: "일본 절의 除夜の鐘은 33번 친다.", answer: false, note: "108번 칩니다. 33번은 서울 보신각 타종입니다." }],
    think: "한 해를 마무리할 때 우리 가족은 무엇을 하나요?",
  },
  {
    id: "washoku", category: "food", title: "와쇼쿠(일본 음식)", ja: "{和食|わしょく}",
    summary: "쌀밥을 중심으로 국과 반찬을 곁들이는 일본의 전통 식문화입니다. 2013년 유네스코 인류무형문화유산에 올랐습니다.",
    points: ["밥·국 하나·반찬 셋으로 차리는 一汁三菜가 기본 형태입니다.", "다시마나 가다랑어포로 우려낸 だし(맛국물)로 재료 맛을 살립니다.", "제철 재료와 계절감을 담아 그릇과 담는 모양에도 신경 씁니다."],
    words: words("一汁三菜/いちじゅうさんさい/국 하나와 반찬 셋|だし/だし/맛국물|味噌汁/みそしる/된장국|ご飯/ごはん/밥"),
    japan: "밥·국·반찬(一汁三菜), だし, 2013년 유네스코 무형문화유산", korea: "밥·국·반찬, 김치와 장, 김장 문화도 2013년 유네스코 무형문화유산",
    quiz: [{ statement: "和食는 유네스코 인류무형문화유산에 올랐다.", answer: true }, { statement: "一汁三菜는 국 셋과 반찬 하나를 뜻한다.", answer: false, note: "국 하나와 반찬 셋입니다." }],
    think: "한국의 밥상과 일본의 一汁三菜를 비교해 봅시다.",
  },
  {
    id: "manners", category: "food", title: "식사 예절", ja: "{食事|しょくじ}のマナー",
    summary: "일본에서는 식사 전후의 인사와 젓가락 쓰는 법을 중요하게 여깁니다.",
    points: ["먹기 전에 「いただきます」, 다 먹은 뒤에 「ごちそうさまでした」라고 말합니다.", "숟가락 없이 젓가락으로 먹고, 밥그릇과 국그릇은 손에 들고 먹습니다.", "젓가락을 밥에 꽂아 세우거나 젓가락끼리 음식을 주고받는 것은 장례를 떠올리게 해 피합니다."],
    words: words("いただきます/いただきます/잘 먹겠습니다|ごちそうさまでした/ごちそうさまでした/잘 먹었습니다|箸/はし/젓가락|お茶碗/おちゃわん/밥그릇"),
    phrase: { ja: "いただきます。", ko: "잘 먹겠습니다." },
    japan: "젓가락으로 먹고 그릇을 손에 들고 먹음", korea: "숟가락과 젓가락을 쓰고 그릇을 상에 둔 채 먹음",
    quiz: [{ statement: "일본에서는 밥그릇을 손에 들고 먹는 것이 자연스럽다.", answer: true }, { statement: "젓가락을 밥에 꽂아 두는 것은 좋은 예절이다.", answer: false, note: "장례 풍습을 떠올리게 해 피합니다." }],
    think: "한국에서 밥그릇을 들고 먹지 않는 까닭을 생각해 봅시다.",
  },
  {
    id: "bento", category: "food", title: "도시락", ja: "お{弁当|べんとう}",
    summary: "학교·회사·소풍에 가져가는 도시락 문화가 발달했습니다. 편의점과 역에서도 여러 가지 도시락을 팝니다.",
    points: ["기차역에서 파는 지역 특색 도시락을 駅弁(えきべん)이라고 합니다.", "만화 캐릭터 모양으로 꾸민 キャラ弁도 인기입니다.", "식어도 맛있게 먹을 수 있도록 간을 하고 모양을 예쁘게 담습니다."],
    words: words("お弁当/おべんとう/도시락|駅弁/えきべん/역에서 파는 도시락|コンビニ/コンビニ/편의점"),
    japan: "駅弁·キャラ弁, 식어도 먹기 좋은 반찬", korea: "학교 급식이 일반적, 소풍 김밥 도시락",
    quiz: [{ statement: "駅弁은 기차역에서 파는 도시락이다.", answer: true }, { statement: "キャラ弁은 캐릭터 모양으로 꾸민 도시락이다.", answer: true }],
    think: "내가 도시락을 싼다면 어떤 반찬을 넣고 싶나요?",
  },
  {
    id: "aisatsu", category: "life", title: "인사와 절", ja: "あいさつとお{辞儀|じぎ}",
    summary: "일본에서는 허리를 굽혀 인사하는 お辞儀를 자주 하고, 때와 상대에 따라 인사말을 구별해 씁니다.",
    points: ["아침에는 おはようございます, 낮에는 こんにちは, 저녁에는 こんばんは라고 인사합니다.", "사과할 때, 고마울 때, 사람을 부를 때 모두 すみません을 쓸 수 있습니다.", "깊이 숙일수록 더 정중한 인사가 됩니다."],
    words: words("おはようございます/おはようございます/안녕하세요(아침)|こんにちは/こんにちは/안녕하세요(낮)|すみません/すみません/죄송합니다, 저기요|お辞儀/おじぎ/허리 굽혀 하는 인사"),
    phrase: { ja: "よろしくお{願|ねが}いします。", ko: "잘 부탁드립니다." },
    japan: "때에 따라 다른 인사말, お辞儀", korea: "'안녕하세요' 하나로 두루 씀, 목례와 큰절",
    quiz: [{ statement: "일본어 인사말은 아침·낮·저녁에 따라 다르다.", answer: true }, { statement: "すみません은 사과할 때만 쓴다.", answer: false, note: "고마울 때나 사람을 부를 때도 씁니다." }],
    think: "한국어와 일본어 인사말을 때와 상대에 따라 나눠 표로 정리해 봅시다.",
  },
  {
    id: "house", category: "life", title: "집과 다다미", ja: "{家|いえ}と{畳|たたみ}",
    summary: "일본 집에서는 현관에서 신발을 벗고 들어가며, 짚으로 만든 다다미를 깐 방(和室)이 있는 집도 많습니다.",
    points: ["현관(玄関)에서 신발을 벗은 뒤 코가 바깥을 향하도록 가지런히 둡니다.", "방 크기를 다다미 장 수로 말하기도 합니다. 예: 6畳(ろくじょう)의 방.", "和室에서는 押し入れ(붙박이장)에서 이불(布団)을 꺼내 깔고 잡니다."],
    words: words("玄関/げんかん/현관|畳/たたみ/다다미|和室/わしつ/일본식 방|布団/ふとん/이불"),
    japan: "현관에서 신발 벗기, 다다미방, 이불을 깔고 잠", korea: "신발 벗기, 온돌방, 요를 깔고 자던 전통",
    quiz: [{ statement: "일본에서는 방 크기를 다다미 장 수로 말하기도 한다.", answer: true }, { statement: "일본 집에서는 신발을 신은 채 방에 들어간다.", answer: false, note: "현관에서 신발을 벗고 들어갑니다." }],
    think: "온돌과 다다미는 각각 어떤 기후에 알맞을까요?",
  },
  {
    id: "onsen", category: "life", title: "목욕과 온천", ja: "お{風呂|ふろ}と{温泉|おんせん}",
    summary: "일본은 화산이 많아 곳곳에 온천이 있고, 욕조에 몸을 담그는 목욕 문화가 발달했습니다.",
    points: ["탕에 들어가기 전에 먼저 몸을 씻습니다.", "수건을 탕 안에 넣지 않습니다.", "대중목욕탕을 銭湯(せんとう)라고 합니다."],
    words: words("温泉/おんせん/온천|銭湯/せんとう/대중목욕탕|お風呂/おふろ/목욕, 욕조"),
    japan: "온천·銭湯, 욕조에 몸 담그기", korea: "대중목욕탕·찜질방 문화",
    quiz: [{ statement: "온천 탕에 들어가기 전에 먼저 몸을 씻는다.", answer: true }, { statement: "수건을 탕 안에 담가도 된다.", answer: false, note: "수건은 탕 안에 넣지 않습니다." }],
    think: "한국의 찜질방과 일본의 온천은 어떻게 다를까요?",
  },
  {
    id: "omiyage", category: "life", title: "여행 선물", ja: "お{土産|みやげ}",
    summary: "여행이나 출장을 다녀오면 가족·친구·직장 동료에게 그 지역의 과자 등을 선물하는 문화가 있습니다.",
    points: ["여러 사람이 나눠 먹기 좋게 낱개로 포장된 과자를 많이 고릅니다.", "지역마다 이름난 과자와 특산품(名物)이 있고, 역과 공항에 お土産 가게가 많습니다."],
    words: words("お土産/おみやげ/여행 선물|名物/めいぶつ/명물, 특산품"),
    japan: "여행 뒤 낱개 포장 과자를 여럿에게 나눠 줌", korea: "여행 다녀와 가까운 사람에게 기념품을 주기도 함",
    quiz: [{ statement: "お土産는 여행지에서 사 온 선물을 말한다.", answer: true }, { statement: "お土産로는 여럿이 나눠 먹기 좋은 과자를 많이 고른다.", answer: true }],
    think: "우리 지역을 찾은 일본 친구에게 줄 선물을 고른다면 무엇이 좋을까요?",
  },
  {
    id: "kimono", category: "tradition", title: "기모노와 유카타", ja: "{着物|きもの}と{浴衣|ゆかた}",
    summary: "기모노는 일본의 전통 옷입니다. 지금은 성인식·결혼식·졸업식 같은 특별한 날에 주로 입고, 여름 축제에는 가벼운 무명 옷인 유카타를 입습니다.",
    points: ["입을 때는 오른쪽 섶을 먼저 여미고 그 위에 왼쪽 섶을 덮습니다.", "허리에 帯(おび)라는 넓은 띠를 맵니다.", "여름 불꽃놀이(花火大会)나 축제에 浴衣를 입고 가는 사람이 많습니다."],
    words: words("着物/きもの/기모노|浴衣/ゆかた/유카타|帯/おび/허리띠|花火大会/はなびたいかい/불꽃놀이 대회"),
    japan: "기모노·유카타, 허리에 帯를 맴", korea: "한복, 명절·혼례에 입음, 고름을 맴",
    quiz: [{ statement: "浴衣는 주로 여름에 입는 가벼운 옷이다.", answer: true }, { statement: "기모노는 왼쪽 섶을 먼저 여미고 오른쪽 섶을 위에 덮는다.", answer: false, note: "오른쪽 섶을 먼저 여미고 왼쪽 섶을 위에 덮습니다." }],
    think: "한복과 기모노의 모양과 입는 때를 비교해 봅시다.",
  },
  {
    id: "matsuri", category: "tradition", title: "마쓰리(축제)", ja: "{祭|まつ}り",
    summary: "마쓰리는 신사나 절을 중심으로 신에게 감사하고 복을 비는 지역 축제입니다.",
    points: ["신을 모신 가마 神輿(みこし)를 여럿이 메고 거리를 돕니다.", "길가에는 먹거리와 놀이를 파는 屋台(やたい)가 늘어섭니다.", "교토의 祇園祭, 오사카의 天神祭, 도쿄의 神田祭를 흔히 일본 3대 마쓰리로 꼽습니다."],
    words: words("神輿/みこし/신을 모신 가마|屋台/やたい/노점|花火/はなび/불꽃놀이"),
    japan: "신사 중심 축제, 神輿·屋台", korea: "지역 축제(강릉 단오제 등)",
    quiz: [{ statement: "神輿는 신을 모신 가마이다.", answer: true }, { statement: "祇園祭는 오사카의 마쓰리이다.", answer: false, note: "교토의 마쓰리입니다." }],
    think: "우리 지역 축제를 일본 친구에게 소개한다면 무엇을 알려 주고 싶나요?",
  },
  {
    id: "sado", category: "tradition", title: "다도", ja: "{茶道|さどう}",
    summary: "정해진 예법에 따라 말차를 준비해 손님에게 대접하는 전통 문화입니다. 16세기에 센노 리큐(千利休)가 크게 발전시켰습니다.",
    points: ["곱게 간 녹차 가루 抹茶(まっちゃ)를 뜨거운 물에 풀고 차선으로 저어 만듭니다.", "차를 마시기 전에 달콤한 和菓子(화과자)를 먹습니다.", "손님은 찻잔을 돌려 정면을 피해서 마십니다."],
    words: words("抹茶/まっちゃ/말차|和菓子/わがし/일본 전통 과자|茶室/ちゃしつ/다실"),
    japan: "말차를 대접하는 茶道 예법", korea: "다례, 녹차와 여러 전통차",
    quiz: [{ statement: "茶道에서는 말차를 대접한다.", answer: true }, { statement: "茶道를 크게 발전시킨 사람은 센노 리큐이다.", answer: true }],
    think: "손님을 대접하는 한국의 예절에는 무엇이 있을까요?",
  },
  {
    id: "kabuki", category: "tradition", title: "가부키", ja: "{歌舞伎|かぶき}",
    summary: "노래(歌)·춤(舞)·연기(伎)가 어우러진 일본의 전통 연극으로, 에도 시대에 서민들 사이에서 크게 유행했습니다. 유네스코 인류무형문화유산입니다.",
    points: ["지금은 남성 배우만 무대에 서며, 여자 역도 남성 배우(女形)가 맡습니다.", "얼굴에 붉은색·푸른색 선을 그리는 화장 隈取(くまどり)로 인물의 성격을 나타냅니다.", "무대가 돌아가는 회전 무대 등 화려한 무대 장치가 발달했습니다."],
    words: words("歌舞伎/かぶき/가부키|女形/おんながた/여자 역을 맡는 남자 배우|隈取/くまどり/가부키 화장"),
    japan: "가부키, 남성 배우만 무대에 섬", korea: "판소리·탈춤 등 전통 공연",
    quiz: [{ statement: "가부키에서는 여자 역을 여성 배우가 맡는다.", answer: false, note: "남성 배우(女形)가 맡습니다." }, { statement: "歌舞伎라는 이름에는 노래·춤·연기를 뜻하는 글자가 들어 있다.", answer: true }],
    think: "가부키와 한국의 탈춤을 비교해 봅시다.",
  },
  {
    id: "school", category: "school", title: "일본의 학교생활", ja: "{日本|にほん}の{学校|がっこう}{生活|せいかつ}",
    summary: "일본의 새 학년은 벚꽃이 피는 4월에 시작합니다.",
    points: ["학생들이 방과 후에 운동부·문화부 같은 동아리 활동 部活(ぶかつ)에 열심히 참여합니다.", "학생들이 직접 교실과 복도를 청소하는 학교가 많습니다.", "학교 건물 안에서는 실내화(上履き)로 갈아 신습니다."],
    words: words("入学式/にゅうがくしき/입학식|部活/ぶかつ/동아리 활동|制服/せいふく/교복|上履き/うわばき/실내화"),
    japan: "4월 새 학년, 部活, 학생이 청소", korea: "3월 새 학년, 동아리·방과후 학교",
    quiz: [{ statement: "일본의 새 학년은 4월에 시작한다.", answer: true }, { statement: "部活는 방과 후 동아리 활동이다.", answer: true }],
    think: "일본 학교생활에서 해 보고 싶은 것은 무엇인가요?",
  },
  {
    id: "anime", category: "school", title: "애니메이션과 만화", ja: "アニメとマンガ",
    summary: "일본의 애니메이션과 만화는 세계 여러 나라에서 인기가 높고, 일본을 알게 되는 계기가 되기도 합니다.",
    points: ["작품의 배경이 된 장소를 찾아가는 여행을 聖地巡礼라고 부릅니다.", "일본 만화책은 보통 오른쪽에서 왼쪽으로 읽습니다.", "좋아하는 캐릭터 의상을 입는 コスプレ 문화도 있습니다."],
    words: words("アニメ/アニメ/애니메이션|マンガ/マンガ/만화|聖地巡礼/せいちじゅんれい/작품 배경지 여행|声優/せいゆう/성우"),
    japan: "애니·만화 산업, 聖地巡礼", korea: "웹툰·드라마가 세계로 퍼짐",
    quiz: [{ statement: "일본 만화책은 보통 오른쪽에서 왼쪽으로 읽는다.", answer: true }, { statement: "聖地巡礼는 작품의 배경이 된 곳을 찾아가는 여행이다.", answer: true }],
    think: "한국 웹툰과 일본 만화의 차이점은 무엇일까요?",
  },
  {
    id: "regions", category: "regions", title: "일본의 지역", ja: "{日本|にほん}の{地方|ちほう}",
    summary: "일본은 北海道·本州·四国·九州 네 개의 큰 섬과 많은 작은 섬으로 이루어져 있고, 광역 행정 구역은 47개 都道府県입니다.",
    points: ["수도는 東京입니다.", "京都는 천 년 넘게 수도였던 옛 도시로 절과 신사가 많습니다.", "大阪는 '천하의 부엌'이라 불렸을 만큼 상업과 먹거리로 이름났습니다.", "남쪽의 沖縄에는 옛 류큐 왕국의 문화가 남아 있습니다."],
    words: words("都道府県/とどうふけん/일본의 광역 행정 구역|北海道/ほっかいどう/홋카이도|本州/ほんしゅう/혼슈|沖縄/おきなわ/오키나와"),
    japan: "47개 都道府県, 수도 東京", korea: "17개 광역 시·도, 수도 서울",
    quiz: [{ statement: "일본의 광역 행정 구역은 47개이다.", answer: true }, { statement: "일본에서 가장 큰 섬은 九州이다.", answer: false, note: "가장 큰 섬은 本州입니다." }],
    think: "가 보고 싶은 일본 지역을 하나 골라 그 까닭을 써 봅시다.",
  },
];
export const cultureTopic = (id: string) => CULTURE_TOPICS.find(topic => topic.id === id);

// ── 활동지 ────────────────────────────────────────────────

export const cultureSheetTypes = {
  words: { label: "낱말 익히기", instruction: "다음 낱말의 읽는 법과 뜻을 쓰시오." },
  ox: { label: "O·X 퀴즈", instruction: "맞으면 O, 틀리면 X를 쓰시오." },
  compare: { label: "한일 비교표", instruction: "일본의 모습을 읽고, 한국은 어떤지 빈칸에 쓰시오." },
  think: { label: "생각해 보기", instruction: "다음 물음에 대한 자기 생각을 쓰시오." },
} as const;
export type CultureSheetType = keyof typeof cultureSheetTypes;
export const cultureSheetTypeKeys = Object.keys(cultureSheetTypes) as CultureSheetType[];
/** pictures는 주제마다 넣은 그림(data URL)입니다. 있으면 활동지 맨 앞에 주제 그림을 싣습니다. */
export type CultureSheetOptions = { title: string; types: CultureSheetType[]; furigana: boolean; answers: boolean; pictures?: Record<string, string> };
const isImageUrl = (url: string) => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url);

/** 고른 주제로 활동지를 만듭니다. furigana를 켜면 낱말 문항에 읽기를 달고 뜻만 묻습니다. */
export function cultureSheetHtml(topics: CultureTopic[], options: CultureSheetOptions, mode: SheetMode) {
  const types = cultureSheetTypeKeys.filter(type => options.types.includes(type));
  const border = "border:1px solid #555;padding:2mm";
  const answers: string[] = [];
  const sections = types.map((type, index) => {
    const heading = `<h2 style="margin:0 0 2mm;font-size:12pt">${romans[index]}. ${escapeHtml(type === "words" && options.furigana ? "다음 낱말의 뜻을 쓰시오." : cultureSheetTypes[type].instruction)}</h2>`;
    if (type === "words") {
      const list = topics.flatMap(topic => topic.words);
      answers.push(`<p style="margin:0 0 3mm;line-height:1.9"><b>${romans[index]}. ${cultureSheetTypes[type].label}</b><br>${list.map((word, number) => `${number + 1}) ${jaHtml(escapeHtml(word.word), mode)}(${jaHtml(escapeHtml(word.reading), mode)}) ${escapeHtml(word.meaning)}`).join(" &nbsp; ")}</p>`);
      const item = (word: CultureWord, number: number) => {
        const shown = options.furigana ? wordRubyHtml(word.word, word.reading) : escapeHtml(word.word);
        return `<b style="margin-right:2mm">${number}.</b><span style="font-size:14pt">${jaHtml(shown, mode)}</span> ${options.furigana ? "뜻: ____________" : "읽기: __________ 뜻: __________"}`;
      };
      return heading + (mode === "screen"
        ? list.map((word, number) => `<div style="display:inline-block;width:50%;margin:0 0 3.5mm;vertical-align:top">${item(word, number + 1)}</div>`).join("")
        : list.map((word, number) => `<p>${item(word, number + 1)}</p>`).join(""));
    }
    if (type === "ox") {
      const list = topics.flatMap(topic => topic.quiz);
      answers.push(`<p style="margin:0 0 3mm;line-height:1.9"><b>${romans[index]}. ${cultureSheetTypes[type].label}</b><br>${list.map((quiz, number) => `${number + 1}) ${quiz.answer ? "O" : "X"}${quiz.note ? ` (${escapeHtml(quiz.note)})` : ""}`).join("<br>")}</p>`);
      return heading + list.map((quiz, number) => `<p style="margin:0 0 2.5mm;font-size:11.5pt;line-height:1.7"><b style="margin-right:2mm">${number + 1}.</b>${escapeHtml(quiz.statement)} <span style="white-space:nowrap">( &nbsp;&nbsp;&nbsp; )</span></p>`).join("");
    }
    if (type === "compare") {
      answers.push(`<p style="margin:0 0 3mm;line-height:1.9"><b>${romans[index]}. ${cultureSheetTypes[type].label}</b> (예시 답)<br>${topics.map((topic, number) => `${number + 1}) ${escapeHtml(topic.title)}: ${escapeHtml(topic.korea)}`).join("<br>")}</p>`);
      const rows = topics.map(topic => `<tr><td style="${border};width:24%;font-weight:700">${escapeHtml(topic.title)}<br><span style="font-weight:400">${jaHtml(rubyHtml(topic.ja, options.furigana), mode)}</span></td><td style="${border};width:38%;font-size:10.5pt">${escapeHtml(topic.japan)}</td><td style="${border};height:16mm"></td></tr>`).join("");
      return heading + `<table style="width:100%;border-collapse:collapse;margin:0 0 4mm"><tr><th style="${border};background:#f2f2f2">주제</th><th style="${border};background:#f2f2f2">일본</th><th style="${border};background:#f2f2f2">한국</th></tr>${rows}</table>`;
    }
    const lines = mode === "screen" ? Array.from({ length: 3 }, () => "<div style=\"height:9mm;border-bottom:1px solid #9a9a9a\"></div>").join("") : "<p>→ ________________________________________________</p>".repeat(2);
    return heading + topics.map((topic, number) => `<div style="margin:0 0 4mm;break-inside:avoid"><p style="margin:0;font-size:11.5pt"><b style="margin-right:2mm">${number + 1}.</b>${escapeHtml(topic.think)}</p>${lines}</div>`).join("");
  });
  const pictured = topics.filter(topic => options.pictures?.[topic.id] && isImageUrl(options.pictures[topic.id]));
  const pictures = pictured.length
    ? `<section style="margin-bottom:6mm">${pictured.map(topic => `<figure style="display:inline-block;width:${pictured.length === 1 ? "100%" : "48%"};margin:0 1% 3mm;vertical-align:top;break-inside:avoid;text-align:center"><img src="${options.pictures![topic.id]}" alt="${escapeHtml(topic.title)}" style="max-width:100%;max-height:${pictured.length === 1 ? "110mm" : "62mm"};border:1px solid #ccc"><figcaption style="font-size:10pt;margin-top:1mm">${escapeHtml(topic.title)} ${jaHtml(rubyHtml(topic.ja, false), mode)}</figcaption></figure>`).join("")}</section>`
    : "";
  const body = pictures + sections.map(section => `<section style="margin-bottom:6mm">${section}</section>`).join("");
  const answerPart = options.answers && answers.length ? answerSection(answers.join(""), mode) : "";
  return clipboardWrap(sheetHead(options.title.trim() || `일본문화 활동지${topics.length === 1 ? ` · ${topics[0].title}` : ""}`) + body + answerPart, mode);
}

export function cultureSheetText(topics: CultureTopic[], options: CultureSheetOptions) {
  const blocks = textHead(options.title.trim() || "일본문화 활동지");
  const answers: string[] = [];
  cultureSheetTypeKeys.filter(type => options.types.includes(type)).forEach((type, index) => {
    const head = `${romans[index]}. ${type === "words" && options.furigana ? "다음 낱말의 뜻을 쓰시오." : cultureSheetTypes[type].instruction}`;
    if (type === "words") {
      const list = topics.flatMap(topic => topic.words);
      blocks.push([head, ...list.map((word, number) => `${number + 1}. ${options.furigana && word.reading !== word.word ? `${word.word}(${word.reading}) 뜻: ________` : `${word.word} 읽기: ______ 뜻: ______`}`)].join("\n"));
      answers.push(`${romans[index]}. ${list.map((word, number) => `${number + 1}) ${word.reading} ${word.meaning}`).join("  ")}`);
    }
    if (type === "ox") {
      const list = topics.flatMap(topic => topic.quiz);
      blocks.push([head, ...list.map((quiz, number) => `${number + 1}. ${quiz.statement} (   )`)].join("\n"));
      answers.push(`${romans[index]}. ${list.map((quiz, number) => `${number + 1}) ${quiz.answer ? "O" : "X"}`).join("  ")}`);
    }
    if (type === "compare") {
      blocks.push([head, "주제 | 일본 | 한국", ...topics.map(topic => `${topic.title} ${rubyText(topic.ja)} | ${topic.japan} | ____________`)].join("\n"));
      answers.push(`${romans[index]}. (예시) ${topics.map(topic => `${topic.title}: ${topic.korea}`).join(" / ")}`);
    }
    if (type === "think") blocks.push([head, ...topics.map((topic, number) => `${number + 1}. ${topic.think}\n   → ________________________________`)].join("\n"));
  });
  if (options.answers && answers.length) blocks.push(["[정답]", ...answers].join("\n"));
  return blocks.join("\n\n");
}
