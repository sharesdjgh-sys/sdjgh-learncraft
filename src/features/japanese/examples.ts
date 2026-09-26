import type { JapaneseSentence } from "./text";

/* 처음 쓰는 선생님이 완성된 모습을 볼 수 있도록 직접 작성한 예시입니다. 검토 완료 상태로 열립니다. */

export type JapaneseExample = { id: string; title: string; text: string; summary: string; sentences: JapaneseSentence[] };

export const JAPANESE_EXAMPLES: JapaneseExample[] = [
  {
    id: "self-introduction",
    title: "[예시] 자기소개",
    text: "はじめまして。私はキム・ミナです。韓国のソウルから来ました。高校二年生です。趣味は音楽を聞くことです。どうぞよろしくお願いします。",
    summary: "한국 고등학생 김민아가 처음 만난 사람에게 이름, 사는 곳, 학년, 취미를 소개하는 글입니다. 자기소개에 쓰는 인사말과 〜は〜です 문형이 나옵니다.",
    sentences: [
      { ruby: "はじめまして。", translation: "처음 뵙겠습니다.", grammar: [], words: [{ word: "はじめまして", reading: "はじめまして", meaning: "처음 뵙겠습니다(첫인사)", pos: "표현" }] },
      {
        ruby: "{私|わたし}は/キム・ミナです。", translation: "저는 김민아입니다.",
        grammar: [{ pattern: "〜は", surface: "は", meaning: "~은/는(주제). 조사일 때는 wa로 읽음" }, { pattern: "〜です", surface: "です", meaning: "~입니다(정중한 단정)" }],
        words: [{ word: "私", reading: "わたし", meaning: "저, 나", pos: "명사" }],
      },
      {
        ruby: "{韓国|かんこく}の/ソウルから/{来|き}ました。", translation: "한국의 서울에서 왔습니다.",
        grammar: [{ pattern: "〜から", surface: "から", meaning: "~에서, ~부터(출발점)" }, { pattern: "〜ました", surface: "ました", meaning: "~했습니다(정중한 과거)" }],
        words: [{ word: "韓国", reading: "かんこく", meaning: "한국", pos: "명사" }, { word: "来る", reading: "くる", meaning: "오다", pos: "동사" }],
      },
      {
        ruby: "{高校|こうこう}/{二年生|にねんせい}です。", translation: "고등학교 2학년입니다.", grammar: [],
        words: [{ word: "高校", reading: "こうこう", meaning: "고등학교", pos: "명사" }, { word: "二年生", reading: "にねんせい", meaning: "2학년(학생)", pos: "명사" }],
      },
      {
        ruby: "{趣味|しゅみ}は/{音楽|おんがく}を/{聞|き}く/ことです。", translation: "취미는 음악을 듣는 것입니다.",
        grammar: [{ pattern: "〜を", surface: "を", meaning: "~을/를(목적). o로 읽음" }, { pattern: "〜ことです", surface: "ことです", meaning: "~하는 것입니다" }],
        words: [{ word: "趣味", reading: "しゅみ", meaning: "취미", pos: "명사" }, { word: "音楽", reading: "おんがく", meaning: "음악", pos: "명사" }, { word: "聞く", reading: "きく", meaning: "듣다", pos: "동사" }],
      },
      {
        ruby: "どうぞ/よろしく/お{願|ねが}いします。", translation: "잘 부탁드립니다.",
        grammar: [{ pattern: "お〜します", surface: "お願いします", meaning: "겸양 표현. 상대에게 부탁할 때 씀" }],
        words: [{ word: "よろしくお願いします", reading: "よろしくおねがいします", meaning: "잘 부탁드립니다", pos: "표현" }],
      },
    ],
  },
  {
    id: "my-day",
    title: "[예시] 나의 하루",
    text: "私は毎朝七時に起きます。朝ご飯を食べてから、学校へ行きます。学校で友達と日本語を勉強しています。放課後は図書館で本を読みます。夜は十一時ごろ寝ます。",
    summary: "글쓴이가 아침에 일어나서 밤에 잘 때까지의 하루 일과를 소개하는 글입니다. 시간·장소·방향을 나타내는 조사와 ます형, 〜てから, 〜ています가 나옵니다.",
    sentences: [
      {
        ruby: "{私|わたし}は/{毎朝|まいあさ}/{七時|しちじ}に/{起|お}きます。", translation: "저는 매일 아침 7시에 일어납니다.",
        grammar: [{ pattern: "〜に", surface: "に", meaning: "~에(시각)" }],
        words: [{ word: "毎朝", reading: "まいあさ", meaning: "매일 아침", pos: "명사" }, { word: "七時", reading: "しちじ", meaning: "7시", pos: "명사" }, { word: "起きる", reading: "おきる", meaning: "일어나다", pos: "동사" }],
      },
      {
        ruby: "{朝|あさ}ご{飯|はん}を/{食|た}べてから、/{学校|がっこう}へ/{行|い}きます。", translation: "아침밥을 먹고 나서 학교에 갑니다.",
        grammar: [{ pattern: "〜てから", surface: "てから", meaning: "~하고 나서(순서)" }, { pattern: "〜へ", surface: "へ", meaning: "~(으)로, ~에(방향). e로 읽음" }],
        words: [{ word: "朝ご飯", reading: "あさごはん", meaning: "아침밥", pos: "명사" }, { word: "食べる", reading: "たべる", meaning: "먹다", pos: "동사" }, { word: "学校", reading: "がっこう", meaning: "학교", pos: "명사" }, { word: "行く", reading: "いく", meaning: "가다", pos: "동사" }],
      },
      {
        ruby: "{学校|がっこう}で/{友達|ともだち}と/{日本語|にほんご}を/{勉強|べんきょう}して/います。", translation: "학교에서 친구와 일본어를 공부하고 있습니다.",
        grammar: [{ pattern: "〜で", surface: "で", meaning: "~에서(장소)" }, { pattern: "〜と", surface: "と", meaning: "~와/과(함께)" }, { pattern: "〜ています", surface: "ています", meaning: "~하고 있습니다(진행)" }],
        words: [{ word: "友達", reading: "ともだち", meaning: "친구", pos: "명사" }, { word: "日本語", reading: "にほんご", meaning: "일본어", pos: "명사" }, { word: "勉強する", reading: "べんきょうする", meaning: "공부하다", pos: "동사" }],
      },
      {
        ruby: "{放課後|ほうかご}は/{図書館|としょかん}で/{本|ほん}を/{読|よ}みます。", translation: "방과 후에는 도서관에서 책을 읽습니다.",
        grammar: [{ pattern: "〜で", surface: "で", meaning: "~에서(장소)" }, { pattern: "〜を", surface: "を", meaning: "~을/를(목적)" }],
        words: [{ word: "放課後", reading: "ほうかご", meaning: "방과 후", pos: "명사" }, { word: "図書館", reading: "としょかん", meaning: "도서관", pos: "명사" }, { word: "読む", reading: "よむ", meaning: "읽다", pos: "동사" }],
      },
      {
        ruby: "{夜|よる}は/{十一時|じゅういちじ}ごろ/{寝|ね}ます。", translation: "밤에는 11시쯤 잡니다.",
        grammar: [{ pattern: "〜ごろ", surface: "ごろ", meaning: "~쯤(대략의 시각)" }],
        words: [{ word: "夜", reading: "よる", meaning: "밤", pos: "명사" }, { word: "寝る", reading: "ねる", meaning: "자다", pos: "동사" }],
      },
    ],
  },
];
