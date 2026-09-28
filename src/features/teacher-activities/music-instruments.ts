import { z } from "zod";
import { escapeActivity as esc, question, sheetHeader } from "./content";

// 중·고등학교 음악 교과서에서 다루는 악기를 악기군별로 정리했습니다.
// file은 Wikimedia Commons 파일 이름이며 이용 조건(퍼블릭 도메인·CC)을 scripts/verify-music-instruments.ts --online으로 확인합니다.
// 음역은 실제로 울리는 소리(실음) 기준의 일반적인 연주 음역이며, 연주자와 악기에 따라 조금씩 다릅니다.

export const instrumentFamilies = ["현악기", "목관악기", "금관악기", "타악기", "건반악기", "국악기"] as const;
export type InstrumentFamily = (typeof instrumentFamilies)[number];

export const familyGuides: Record<InstrumentFamily, string> = {
  현악기: "줄의 떨림으로 소리를 냅니다. 활로 문지르는 찰현악기와 손가락으로 뜯는 발현악기가 있고, 줄이 길고 굵을수록 낮은 소리가 납니다.",
  목관악기: "관 속 공기 기둥의 떨림으로 소리를 냅니다. 리드(서) 없이 부는 플루트, 홑리드의 클라리넷·색소폰, 겹리드의 오보에·바순으로 나뉩니다. 금속으로 만든 악기도 소리 내는 방식에 따라 목관악기에 넣습니다.",
  금관악기: "입술을 마우스피스에 대고 떨어 소리를 냅니다. 입술의 긴장으로 배음을 고르고, 밸브나 슬라이드로 관의 길이를 바꾸어 음높이를 조절합니다.",
  타악기: "치거나 흔들어 소리를 냅니다. 팀파니·실로폰처럼 음높이가 정해진 악기와 작은북·심벌즈처럼 음높이가 정해지지 않은 악기가 있습니다.",
  건반악기: "건반을 눌러 줄을 치거나(피아노) 뜯거나(하프시코드), 파이프에 바람을 보내(오르간) 소리를 냅니다. 여러 음을 동시에 낼 수 있어 화음과 선율을 함께 연주합니다.",
  국악기: "우리 전통 악기입니다. 옛 문헌에서는 재료에 따라 여덟 가지(팔음)로 나누었고, 오늘날에는 소리 내는 방법에 따라 현악기·관악기·타악기로 나누어 배웁니다.",
};

export type InstrumentWork = { title: string; composer: string; note: string };
export type Instrument = {
  id: string;
  name: string;
  english: string;
  family: InstrumentFamily;
  /** 세부 분류 */
  kind: string;
  /** Wikimedia Commons 파일 이름(File:…) */
  file: string;
  summary: string;
  /** 소리 내는 방법 */
  sound: string;
  features: string[];
  /** 실음 기준 음역. 음높이가 정해지지 않은 악기는 없습니다. */
  range?: { low: string; high: string };
  rangeNote?: string;
  works: InstrumentWork[];
  /** 수업에서 살펴볼 점 */
  tip: string;
};

const peter = (role: string): InstrumentWork => ({ title: "「피터와 늑대」", composer: "프로코피예프", note: `${role}을 맡아 악기마다 등장인물을 소개합니다.` });

export const instruments: Instrument[] = [
  // ── 현악기
  {
    id: "violin", name: "바이올린", english: "Violin", family: "현악기", kind: "찰현악기", file: "File:Violin VL100.png",
    summary: "현악기 가운데 가장 작고 높은 소리를 내며, 관현악에서 주선율을 가장 많이 맡습니다. 관현악단에서는 제1바이올린과 제2바이올린으로 나누어 연주합니다.",
    sound: "말총으로 만든 활로 네 줄(G–D–A–E)을 문질러 소리를 내고, 왼손가락으로 줄을 짚어 음높이를 바꿉니다.",
    features: ["턱과 어깨 사이에 악기를 끼워 연주합니다.", "손가락으로 줄을 뜯는 피치카토, 음을 떨어 주는 비브라토 같은 주법이 있습니다.", "활을 쓰는 방향과 속도에 따라 음색과 셈여림이 달라집니다."],
    range: { low: "G3", high: "E7" },
    works: [{ title: "「사계」 중 ‘봄’", composer: "비발디", note: "독주 바이올린이 새소리와 시냇물을 흉내 냅니다." }, { title: "바이올린 협주곡 마단조", composer: "멘델스존", note: "첫 부분부터 독주 바이올린이 서정적인 선율을 들려줍니다." }],
    tip: "비올라·첼로와 크기를 비교하며 ‘몸통이 클수록 소리가 낮다’는 원리를 찾아봅니다.",
  },
  {
    id: "viola", name: "비올라", english: "Viola", family: "현악기", kind: "찰현악기", file: "File:Bratsche.jpg",
    summary: "바이올린보다 조금 크고 완전5도 낮게 조율하는 악기로, 부드럽고 따뜻한 중음을 냅니다. 합주에서 화음의 가운데를 채우는 역할을 많이 맡습니다.",
    sound: "바이올린처럼 턱에 끼우고 활로 네 줄(C–G–D–A)을 문질러 소리를 냅니다.",
    features: ["악보는 주로 가온음자리표(알토 음자리표)로 적습니다.", "바이올린보다 몸통이 커서 소리가 조금 어둡고 굵습니다.", "현악 4중주에서 바이올린과 첼로 사이의 음역을 맡습니다."],
    range: { low: "C3", high: "E6" },
    works: [{ title: "비올라 협주곡 사장조", composer: "텔레만", note: "비올라를 독주 악기로 쓴 이른 시기의 협주곡입니다." }, { title: "「이탈리아의 해럴드」", composer: "베를리오즈", note: "독주 비올라가 주인공 해럴드를 나타냅니다." }],
    tip: "바이올린과 비올라의 같은 선율을 번갈아 들으며 음색의 차이를 말로 표현해 봅니다.",
  },
  {
    id: "cello", name: "첼로", english: "Cello", family: "현악기", kind: "찰현악기", file: "File:Cello front side.png",
    summary: "의자에 앉아 무릎 사이에 세우고 연주하는 큰 현악기입니다. 사람의 목소리와 음역이 비슷해 풍부하고 깊은 소리를 냅니다.",
    sound: "바닥을 받치는 엔드핀으로 악기를 세우고, 활로 네 줄(C–G–D–A)을 문질러 소리를 냅니다.",
    features: ["비올라보다 한 옥타브 낮게 조율합니다.", "낮은 음으로 합주를 받치기도 하고, 높은 음역에서 노래하듯 선율을 연주하기도 합니다.", "악보는 낮은음자리표를 주로 쓰고, 높은 음은 가온음·높은음자리표로 적습니다."],
    range: { low: "C2", high: "A5" },
    works: [{ title: "「동물의 사육제」 중 ‘백조’", composer: "생상스", note: "첼로가 물 위를 떠가는 백조처럼 우아한 선율을 연주합니다." }, { title: "무반주 첼로 모음곡 제1번 ‘전주곡’", composer: "바흐", note: "첼로 한 대로 선율과 화음을 함께 들려줍니다." }],
    tip: "‘백조’의 첼로 선율을 들으며 사람 목소리와 닮은 점을 찾아봅니다.",
  },
  {
    id: "double-bass", name: "더블베이스", english: "Double bass", family: "현악기", kind: "찰현악기", file: "File:AGK bass1 full.jpg",
    summary: "현악기 가운데 가장 크고 낮은 소리를 내며, 서서 또는 높은 의자에 앉아 연주합니다. 관현악의 가장 아래 음을 받쳐 음악의 기초를 만듭니다.",
    sound: "활로 줄을 문지르거나 손가락으로 뜯어 소리를 냅니다. 재즈에서는 손가락으로 뜯는 주법을 많이 씁니다.",
    features: ["다른 현악기와 달리 네 줄(E–A–D–G)을 완전4도 간격으로 조율합니다.", "악보에 적힌 음보다 한 옥타브 낮게 소리가 납니다.", "콘트라베이스라고도 부릅니다."],
    range: { low: "E1", high: "G4" },
    works: [{ title: "「동물의 사육제」 중 ‘코끼리’", composer: "생상스", note: "더블베이스가 무거운 코끼리의 춤을 익살스럽게 그립니다." }, { title: "피아노 5중주 「송어」", composer: "슈베르트", note: "현악 4중주에 더블베이스를 더해 낮은 음을 든든하게 받칩니다." }],
    tip: "‘코끼리’를 들으며 낮은 음역과 느린 빠르기가 어떤 느낌을 주는지 이야기해 봅니다.",
  },
  {
    id: "harp", name: "하프", english: "Harp", family: "현악기", kind: "발현악기", file: "File:Harp.png",
    summary: "세모꼴 틀에 47줄 안팎을 매단 큰 발현악기입니다. 맑고 투명한 소리로 관현악에 화려한 색채를 더합니다.",
    sound: "양손 손가락으로 줄을 뜯어 소리를 내고, 발로 7개의 페달을 밟아 음을 반음씩 올리거나 내립니다.",
    features: ["줄을 쓸어내리는 글리산도로 물결치는 듯한 소리를 냅니다.", "빨간 줄은 도(C), 검은 줄이나 파란 줄은 파(F)로 표시해 음을 찾습니다.", "화음을 한 음씩 펼쳐 치는 아르페지오를 많이 씁니다."],
    range: { low: "C1", high: "G7" },
    works: [{ title: "「호두까기 인형」 중 ‘꽃의 왈츠’", composer: "차이콥스키", note: "도입부의 긴 하프 독주가 유명합니다." }, { title: "하프 협주곡 내림나장조", composer: "헨델", note: "하프를 독주 악기로 쓴 바로크 협주곡입니다." }],
    tip: "‘꽃의 왈츠’ 도입부에서 글리산도와 아르페지오를 찾아 손동작으로 따라 해 봅니다.",
  },
  {
    id: "guitar", name: "기타", english: "Classical guitar", family: "현악기", kind: "발현악기", file: "File:Classical Guitar two views2.png",
    summary: "여섯 줄을 손가락이나 피크로 뜯어 연주하는 발현악기입니다. 화음 반주와 선율을 함께 연주할 수 있어 대중음악에서도 널리 씁니다.",
    sound: "오른손으로 줄을 뜯거나 긁고(스트로크), 왼손으로 지판의 프렛 사이를 눌러 음높이를 바꿉니다.",
    features: ["클래식 기타는 나일론 줄, 통기타(어쿠스틱 기타)는 쇠줄을 씁니다.", "여섯 줄을 E–A–D–G–B–E로 조율합니다.", "악보에 적힌 음보다 한 옥타브 낮게 소리가 나고, 코드 이름이나 타브 악보로도 연주합니다."],
    range: { low: "E2", high: "B5" },
    works: [{ title: "「알람브라 궁전의 추억」", composer: "타레가", note: "같은 음을 빠르게 되풀이하는 트레몰로 주법이 돋보입니다." }, { title: "「아란후에스 협주곡」 2악장", composer: "로드리고", note: "기타와 관현악이 함께하는 협주곡입니다." }],
    tip: "간단한 코드(C·G·Am·F) 반주에 맞춰 노래를 불러 보며 화음 반주의 역할을 경험합니다.",
  },
  // ── 목관악기
  {
    id: "flute", name: "플루트", english: "Flute", family: "목관악기", kind: "무리드 · 가로로 부는 악기", file: "File:Flûte traversière.png",
    summary: "악기를 옆으로 들고 부는 목관악기로, 맑고 밝은 소리를 냅니다. 대부분 금속으로 만들지만 소리 내는 방식 때문에 목관악기에 속합니다.",
    sound: "취구(입김을 넣는 구멍) 가장자리에 입김을 불어 넣어 관 속 공기를 떨게 하고, 키를 눌러 음높이를 바꿉니다.",
    features: ["리드 없이 입김만으로 소리를 냅니다.", "빠른 꾸밈음과 트릴을 가볍게 연주합니다.", "더 작고 높은 소리를 내는 피콜로가 같은 가족입니다."],
    range: { low: "C4", high: "C7" },
    works: [peter("새"), { title: "「목신의 오후에의 전주곡」", composer: "드뷔시", note: "플루트 독주의 나른한 선율로 시작합니다." }],
    tip: "빈 병 입구를 불어 소리를 내 보며 플루트의 소리 내는 원리를 체험합니다.",
  },
  {
    id: "oboe", name: "오보에", english: "Oboe", family: "목관악기", kind: "겹리드", file: "File:Oboe Patricola Artista PT1.jpg",
    summary: "두 장의 얇은 갈대 조각(겹리드)을 떨어 소리를 내는 악기로, 콧소리가 섞인 듯 선명하고 애수 어린 음색이 특징입니다.",
    sound: "입술로 겹리드를 물고 숨을 불어 넣어 두 리드가 서로 부딪히며 떨리게 합니다.",
    features: ["음정이 안정적이어서 관현악단이 조율할 때 오보에가 A(라) 음을 냅니다.", "연주자가 리드를 직접 깎아 다듬기도 합니다.", "더 낮은 소리를 내는 잉글리시 호른이 같은 가족입니다."],
    range: { low: "Bb3", high: "A6" },
    works: [peter("오리"), { title: "「백조의 호수」 중 ‘정경’", composer: "차이콥스키", note: "오보에가 쓸쓸하고 아름다운 주제 선율을 연주합니다." }],
    tip: "공연 시작 전 조율 장면 영상을 보며 오보에가 먼저 음을 내는 까닭을 이야기해 봅니다.",
  },
  {
    id: "clarinet", name: "클라리넷", english: "Clarinet", family: "목관악기", kind: "홑리드", file: "File:Leitner+Kraus 410 320.png",
    summary: "한 장의 리드(홑리드)를 마우스피스에 붙여 부는 악기로, 음역이 넓고 낮은 음은 어둡고 높은 음은 밝게 빛납니다.",
    sound: "마우스피스에 붙인 리드가 숨에 따라 떨리며 소리를 내고, 구멍과 키를 막아 음높이를 바꿉니다.",
    features: ["주로 내림나(B♭) 조의 악기를 써서 악보보다 장2도 낮은 소리가 납니다.", "여리게부터 세게까지 셈여림 폭이 넓습니다.", "관현악, 취주악, 재즈에서 두루 씁니다."],
    range: { low: "D3", high: "Bb6" },
    works: [peter("고양이"), { title: "「랩소디 인 블루」", composer: "거슈윈", note: "클라리넷이 낮은 음에서 높은 음으로 미끄러져 오르며 곡을 엽니다." }],
    tip: "리코더와 클라리넷의 소리를 비교하며 리드가 있고 없음에 따른 음색 차이를 찾아봅니다.",
  },
  {
    id: "bassoon", name: "바순", english: "Bassoon", family: "목관악기", kind: "겹리드", file: "File:Bassoon (AM 1998.60.267-1).jpg",
    summary: "긴 관을 반으로 접은 모양의 낮은 목관악기입니다. 익살스럽고 부드러운 소리로 목관악기군의 낮은 음을 맡습니다.",
    sound: "구부러진 금속관(보컬) 끝에 끼운 겹리드를 불어 소리를 냅니다.",
    features: ["펼치면 관의 길이가 2.5미터쯤 됩니다.", "파고토라고도 부르며, 더 낮은 소리를 내는 콘트라바순이 있습니다.", "스타카토로 연주하면 우스꽝스러운 느낌을 잘 살립니다."],
    range: { low: "Bb1", high: "E5" },
    works: [peter("할아버지"), { title: "「마법사의 제자」", composer: "뒤카", note: "바순이 쉴 새 없이 물을 나르는 빗자루의 주제를 연주합니다." }],
    tip: "같은 겹리드 악기인 오보에와 음역·음색을 비교해 봅니다.",
  },
  {
    id: "saxophone", name: "색소폰", english: "Saxophone", family: "목관악기", kind: "홑리드", file: "File:Eight saxophone sizes smaller.png",
    summary: "19세기에 아돌프 삭스가 만든 악기로, 금속관이지만 클라리넷처럼 홑리드로 소리를 내 목관악기에 속합니다. 재즈와 대중음악에서 특히 사랑받습니다.",
    sound: "마우스피스의 홑리드를 떨어 소리를 내고, 몸통의 키를 눌러 음높이를 바꿉니다.",
    features: ["소프라노·알토·테너·바리톤 등 크기가 다른 여러 종류가 있습니다.", "금관악기처럼 힘찬 소리와 목관악기처럼 부드러운 소리를 함께 냅니다.", "아래 음역은 가장 많이 쓰는 알토 색소폰 기준입니다."],
    range: { low: "Db3", high: "Ab5" },
    rangeNote: "알토 색소폰 기준",
    works: [{ title: "「전람회의 그림」 중 ‘옛 성’", composer: "무소륵스키 곡, 라벨 편곡", note: "알토 색소폰이 쓸쓸한 음유 시인의 노래를 연주합니다." }, { title: "「아를의 여인」 모음곡 제1번 ‘전주곡’", composer: "비제", note: "관현악곡에 색소폰을 쓴 이른 예입니다." }],
    tip: "여러 크기의 색소폰 사진을 보며 크기와 음높이의 관계를 예상해 봅니다.",
  },
  {
    id: "recorder", name: "리코더", english: "Recorder", family: "목관악기", kind: "무리드 · 세로로 부는 악기", file: "File:VariousRecorderFlutes.jpg",
    summary: "부리 모양의 취구에 숨을 불어 넣는 세로 피리로, 학교에서 가장 먼저 배우는 관악기입니다. 바로크 시대에 널리 연주했습니다.",
    sound: "취구로 불어 넣은 숨이 날카로운 가장자리(에지)에 부딪혀 소리가 나고, 손가락으로 구멍을 막아 음높이를 바꿉니다.",
    features: ["소프라노·알토·테너·베이스 리코더가 있습니다.", "학교에서 쓰는 소프라노 리코더는 악보보다 한 옥타브 높게 소리가 납니다.", "뒷구멍을 조금 열어(서밍) 높은 음을 냅니다."],
    range: { low: "C5", high: "D7" },
    rangeNote: "소프라노 리코더 기준",
    works: [{ title: "리코더 소나타 바장조", composer: "헨델", note: "리코더와 통주저음을 위한 바로크 소나타입니다." }, { title: "플라우티노 협주곡 다장조", composer: "비발디", note: "작은 리코더가 빠르고 화려한 선율을 연주합니다." }],
    tip: "바로크 음악의 리코더 연주를 듣고 학교 리코더와 음색을 비교해 봅니다.",
  },
  // ── 금관악기
  {
    id: "trumpet", name: "트럼펫", english: "Trumpet", family: "금관악기", kind: "밸브 금관악기", file: "File:Yamaha Trumpet YTR-8335LA crop.jpg",
    summary: "금관악기 가운데 가장 높은 소리를 내며, 밝고 힘찬 음색으로 팡파르와 축제 분위기를 만듭니다.",
    sound: "입술을 마우스피스에 대고 떨어 소리를 내고, 세 개의 밸브를 눌러 관의 길이를 바꿉니다.",
    features: ["입술의 긴장만으로도 여러 음(배음)을 낼 수 있습니다.", "약음기(뮤트)를 끼워 음색을 바꿉니다.", "주로 내림나(B♭) 조 악기를 쓰며 재즈에서도 많이 씁니다."],
    range: { low: "E3", high: "Bb5" },
    works: [{ title: "트럼펫 협주곡 내림마장조", composer: "하이든", note: "밸브가 없던 시절에 새로 만든 키 트럼펫을 위해 쓴 곡입니다." }, { title: "「트럼펫 볼런터리」", composer: "클라크", note: "결혼식 입장곡으로 자주 쓰이는 밝은 곡입니다." }],
    tip: "입술을 떨어 ‘부르르’ 소리를 내 보며 금관악기의 소리 내는 원리를 체험합니다.",
  },
  {
    id: "horn", name: "호른", english: "French horn", family: "금관악기", kind: "밸브 금관악기", file: "File:French horn front.png",
    summary: "둥글게 감긴 긴 관과 넓은 나팔을 가진 악기로, 부드럽고 둥근 소리를 냅니다. 금관악기와 목관악기 모두와 잘 어울립니다.",
    sound: "입술을 떨어 소리를 내고, 왼손으로 밸브를 누르며 오른손은 나팔 속에 넣어 음색과 음정을 다듬습니다.",
    features: ["사냥 신호용 뿔피리에서 발전했습니다.", "나팔이 뒤쪽을 향해 소리가 부드럽게 퍼집니다.", "목관 5중주에도 들어가는 금관악기입니다."],
    range: { low: "B1", high: "F5" },
    works: [peter("늑대"), { title: "호른 협주곡 제4번", composer: "모차르트", note: "3악장은 사냥 음악 같은 경쾌한 선율로 유명합니다." }],
    tip: "호른이 사냥 신호에서 비롯된 까닭을 ‘늑대’ 장면과 연결해 이야기해 봅니다.",
  },
  {
    id: "trombone", name: "트롬본", english: "Trombone", family: "금관악기", kind: "슬라이드 금관악기", file: "File:Yamaha Tenor trombone YSL-891Z (re-crop).jpg",
    summary: "밸브 대신 U자 모양의 슬라이드를 밀고 당겨 음높이를 바꾸는 금관악기입니다. 웅장하고 장엄한 소리를 냅니다.",
    sound: "입술을 떨어 소리를 내고, 슬라이드를 일곱 자리로 움직여 관의 길이를 바꿉니다.",
    features: ["슬라이드를 움직이며 음을 미끄러지듯 잇는 글리산도를 낼 수 있습니다.", "테너 트롬본과 베이스 트롬본을 주로 씁니다.", "재즈 빅밴드에서도 중요한 악기입니다."],
    range: { low: "E2", high: "F5" },
    works: [{ title: "「볼레로」", composer: "라벨", note: "같은 선율을 악기를 바꿔 가며 되풀이하다가 트롬본 독주가 나옵니다." }, { title: "「레퀴엠」 중 ‘투바 미룸’", composer: "모차르트", note: "트롬본 독주가 최후의 심판을 알리는 나팔 소리를 나타냅니다." }],
    tip: "슬라이드 위치와 음높이를 연결해 ‘관이 길수록 소리가 낮다’는 원리를 확인합니다.",
  },
  {
    id: "tuba", name: "튜바", english: "Tuba", family: "금관악기", kind: "밸브 금관악기", file: "File:Tuba.png",
    summary: "금관악기 가운데 가장 크고 낮은 소리를 내는 악기로, 관현악과 취주악의 낮은 음을 든든하게 받칩니다.",
    sound: "커다란 마우스피스에 입술을 떨어 소리를 내고, 3~5개의 밸브로 음높이를 바꿉니다.",
    features: ["가장 큰 튜바는 관을 펼치면 5미터가 넘습니다.", "행진할 때는 몸에 두르는 수자폰을 쓰기도 합니다.", "크지만 부드럽고 따뜻한 소리를 냅니다."],
    range: { low: "D1", high: "F4" },
    works: [{ title: "「전람회의 그림」 중 ‘비들로’", composer: "무소륵스키 곡, 라벨 편곡", note: "튜바 독주가 무거운 소달구지를 그립니다." }, { title: "튜바 협주곡 바단조", composer: "본 윌리엄스", note: "튜바를 독주 악기로 쓴 대표적인 협주곡입니다." }],
    tip: "금관악기 네 가지를 크기 순으로 세우고 음역 비교 막대와 맞춰 봅니다.",
  },
  // ── 타악기
  {
    id: "timpani", name: "팀파니", english: "Timpani", family: "타악기", kind: "음높이가 있는 막울림 악기", file: "File:USAFE Band timpanist.jpg",
    summary: "구리로 만든 큰 솥 모양의 몸통에 가죽을 씌운 북입니다. 음높이를 조절할 수 있어 관현악에서 가장 중요한 타악기로 꼽힙니다.",
    sound: "펠트를 씌운 채로 가죽을 쳐서 소리를 내고, 페달로 가죽의 조임을 바꾸어 음높이를 맞춥니다.",
    features: ["크기가 다른 여러 대를 함께 놓고 연주합니다.", "빠르게 굴려 치는 롤로 긴장감을 만듭니다.", "주로 으뜸음과 딸림음을 맡아 화음을 받칩니다."],
    range: { low: "D2", high: "C4" },
    rangeNote: "크기가 다른 네 대를 함께 쓸 때",
    works: [{ title: "교향곡 제94번 「놀람」 2악장", composer: "하이든", note: "조용한 선율 뒤 팀파니와 관현악이 갑자기 크게 울려 듣는 사람을 놀라게 합니다." }, { title: "「차라투스트라는 이렇게 말했다」 도입부", composer: "R. 슈트라우스", note: "팀파니가 두 음을 번갈아 강렬하게 칩니다." }],
    tip: "‘놀람’ 교향곡을 들으며 셈여림의 급격한 변화가 주는 효과를 이야기해 봅니다.",
  },
  {
    id: "snare-drum", name: "작은북", english: "Snare drum", family: "타악기", kind: "음높이가 없는 막울림 악기", file: "File:2006-07-06 snare 14.jpg",
    summary: "아래 가죽에 쇠줄(스네어)을 댄 북으로, 짧고 날카로운 ‘차르르’ 소리가 납니다. 행진곡과 드럼 세트의 중심 악기입니다.",
    sound: "두 개의 나무 채로 윗가죽을 치면 아래 가죽에 닿은 쇠줄이 함께 떨려 독특한 소리를 냅니다.",
    features: ["쇠줄을 떼면 ‘통통’ 하는 톰톰과 비슷한 소리가 납니다.", "빠르게 번갈아 치는 롤과 꾸밈 타법이 있습니다.", "리듬을 이끌어 합주의 박을 맞춥니다."],
    works: [{ title: "「볼레로」", composer: "라벨", note: "작은북이 곡 전체에서 같은 리듬을 끝까지 되풀이합니다." }, { title: "「라데츠키 행진곡」", composer: "요한 슈트라우스 1세", note: "작은북의 리듬이 행진곡의 활기를 만듭니다." }],
    tip: "「볼레로」의 작은북 리듬을 손뼉이나 몸 타악기로 따라 쳐 봅니다.",
  },
  {
    id: "bass-drum", name: "큰북", english: "Bass drum", family: "타악기", kind: "음높이가 없는 막울림 악기", file: "File:Gran cassa.jpg",
    summary: "관현악에서 가장 큰 북으로, 낮고 묵직한 울림을 냅니다. 천둥이나 대포 소리를 흉내 내거나 음악의 절정을 강조합니다.",
    sound: "부드러운 털이나 펠트를 씌운 큰 채로 가죽을 쳐서 소리를 냅니다.",
    features: ["세워 놓고 옆에서 칩니다.", "손으로 가죽을 눌러 울림을 멈춥니다(뮤트).", "드럼 세트에서는 발로 페달을 밟아 칩니다."],
    works: [{ title: "「레퀴엠」 중 ‘진노의 날’", composer: "베르디", note: "큰북이 엇박으로 힘차게 울리며 공포를 표현합니다." }, peter("사냥꾼의 총소리")],
    tip: "큰북과 작은북 소리를 비교하며 크기와 음높이의 관계를 이야기해 봅니다.",
  },
  {
    id: "cymbals", name: "심벌즈", english: "Cymbals", family: "타악기", kind: "몸울림 악기", file: "File:ZildjianCustomRide.jpg",
    summary: "구리 합금으로 만든 둥근 금속판으로, 화려하게 번쩍이는 소리로 음악의 절정을 알립니다.",
    sound: "두 장을 맞부딪치거나(크래시), 한 장을 매달아 채로 쳐서 소리를 냅니다.",
    features: ["부딪친 뒤 몸에 대면 소리가 곧 멈춥니다.", "매단 심벌즈를 부드러운 채로 굴려 치면 점점 커지는 소리를 냅니다.", "드럼 세트에는 하이햇·라이드·크래시 심벌즈가 있습니다."],
    works: [{ title: "교향곡 제9번 「신세계로부터」 4악장", composer: "드보르자크", note: "곡 전체에서 심벌즈가 단 한 번 울리는 것으로 유명합니다." }, { title: "「1812년 서곡」", composer: "차이콥스키", note: "끝부분에서 심벌즈와 큰북, 종이 함께 승리를 표현합니다." }],
    tip: "‘신세계로부터’ 4악장에서 심벌즈가 울리는 순간을 찾아 손을 들어 봅니다.",
  },
  {
    id: "triangle", name: "트라이앵글", english: "Triangle", family: "타악기", kind: "몸울림 악기", file: "File:Triangle 001.jpg",
    summary: "쇠막대를 세모꼴로 구부린 작은 타악기로, 맑고 높은 소리가 관현악 전체를 뚫고 들립니다.",
    sound: "줄에 매달아 쇠막대로 쳐서 소리를 냅니다. 모서리 안쪽을 빠르게 오가며 치면 떨리는 소리(트레몰로)가 납니다.",
    features: ["한쪽 모서리가 열려 있어 울림이 오래 갑니다.", "손으로 잡으면 소리가 바로 멈춥니다.", "작지만 밝은 음색으로 곡에 반짝임을 더합니다."],
    works: [{ title: "피아노 협주곡 제1번 3악장", composer: "리스트", note: "트라이앵글이 두드러져 ‘트라이앵글 협주곡’이라는 별명이 붙었습니다." }, { title: "교향곡 제4번 3악장", composer: "브람스", note: "트라이앵글이 축제 같은 분위기를 더합니다." }],
    tip: "트라이앵글을 잡고 칠 때와 매달고 칠 때의 소리를 비교해 봅니다.",
  },
  {
    id: "xylophone", name: "실로폰", english: "Xylophone", family: "타악기", kind: "음높이가 있는 몸울림 악기", file: "File:Xylophone (PSF).svg",
    summary: "나무 막대를 피아노 건반처럼 늘어놓은 악기로, 딱딱하고 또렷한 소리를 냅니다.",
    sound: "단단한 채로 나무 막대를 쳐서 소리를 냅니다. 막대가 짧을수록 높은 소리가 납니다.",
    features: ["악보보다 한 옥타브 높게 소리가 납니다.", "울림이 짧아 빠른 음표를 또렷하게 들려줍니다.", "쇠막대로 만든 글로켄슈필과 헷갈리지 않게 구분합니다."],
    range: { low: "F4", high: "C8" },
    works: [{ title: "「죽음의 무도」", composer: "생상스", note: "실로폰이 해골의 뼈가 부딪히는 소리를 흉내 냅니다." }, { title: "「동물의 사육제」 중 ‘화석’", composer: "생상스", note: "‘죽음의 무도’ 선율을 실로폰으로 다시 인용합니다." }],
    tip: "막대의 길이와 음높이의 관계를 직접 쳐 보며 확인합니다.",
  },
  {
    id: "glockenspiel", name: "글로켄슈필", english: "Glockenspiel", family: "타악기", kind: "음높이가 있는 몸울림 악기", file: "File:Glockenspiel-malletech.jpg",
    summary: "쇠막대를 건반처럼 늘어놓은 악기로, 작은 종처럼 맑고 반짝이는 소리를 냅니다. 학교에서 쓰는 철금과 같은 종류입니다.",
    sound: "단단한 채로 쇠막대를 쳐서 소리를 냅니다. 울림이 길게 남습니다.",
    features: ["악보보다 두 옥타브 높게 소리가 납니다.", "독일어로 ‘종의 놀이’라는 뜻입니다.", "관현악에서 선율을 반짝이게 꾸며 줍니다."],
    range: { low: "G5", high: "C8" },
    works: [{ title: "「마술피리」 중 파파게노의 아리아 ‘Ein Mädchen oder Weibchen’", composer: "모차르트", note: "파파게노의 마법 종소리를 건반 글로켄슈필로 연주합니다." }, { title: "「마법사의 제자」", composer: "뒤카", note: "글로켄슈필이 마법의 반짝임을 더합니다." }],
    tip: "실로폰과 글로켄슈필로 같은 선율을 쳐서 재료에 따른 음색 차이를 비교합니다.",
  },
  {
    id: "marimba", name: "마림바", english: "Marimba", family: "타악기", kind: "음높이가 있는 몸울림 악기", file: "File:Marimba One 4000 Series.jpg",
    summary: "나무 막대 아래에 공명관을 달아 실로폰보다 낮고 부드럽고 풍성한 소리를 냅니다.",
    sound: "부드러운 털실 채로 나무 막대를 치면 아래 공명관이 소리를 키워 줍니다.",
    features: ["채를 두 손에 두 개씩, 모두 네 개 쥐고 화음을 연주하기도 합니다.", "아프리카와 중남미의 전통 악기에서 발전했습니다.", "실로폰보다 음역이 넓고 낮습니다."],
    range: { low: "C2", high: "C7" },
    rangeNote: "5옥타브 마림바 기준",
    works: [{ title: "마림바 협주곡 제1번", composer: "네이 호사우루", note: "마림바를 독주 악기로 쓴 대표적인 현대 협주곡입니다." }],
    tip: "실로폰과 마림바 소리를 들려주고 공명관의 역할을 추리해 봅니다.",
  },
  // ── 건반악기
  {
    id: "piano", name: "피아노", english: "Piano", family: "건반악기", kind: "현을 치는 건반악기", file: "File:Steinway Vienna 002.JPG",
    summary: "88개의 건반으로 넓은 음역을 연주하는 악기입니다. 여리게(피아노)와 세게(포르테)를 모두 낼 수 있어 처음에는 ‘피아노포르테’라고 불렀습니다.",
    sound: "건반을 누르면 펠트를 씌운 해머가 줄을 쳐서 소리를 냅니다. 그래서 현악기이자 타악기의 성질을 함께 지닙니다.",
    features: ["건반을 누르는 세기로 셈여림을 조절합니다.", "오른쪽 페달(댐퍼 페달)을 밟으면 소리가 길게 이어집니다.", "그랜드 피아노와 업라이트 피아노가 있습니다."],
    range: { low: "A0", high: "C8" },
    works: [{ title: "「엘리제를 위하여」", composer: "베토벤", note: "짧고 친숙한 선율이 되풀이되는 피아노 소품입니다." }, { title: "왈츠 내림라장조 「강아지 왈츠」", composer: "쇼팽", note: "제 꼬리를 쫓아 빙글빙글 도는 강아지처럼 빠르게 움직입니다." }],
    tip: "음역 비교 막대의 기준이 피아노 건반인 점을 알려 주고, 다른 악기의 음역을 건반에서 찾아봅니다.",
  },
  {
    id: "organ", name: "파이프 오르간", english: "Pipe organ", family: "건반악기", kind: "바람으로 소리 내는 건반악기", file: "File:Neunkirchen am Brand Kirche Orgel-20210411-RM-155230.jpg",
    summary: "수백에서 수천 개의 파이프에 바람을 보내 소리를 내는 거대한 악기로, ‘악기의 왕’이라고 불립니다. 주로 성당·교회와 공연장에 설치합니다.",
    sound: "건반을 누르면 해당 파이프로 바람이 들어가 소리가 납니다. 음전(스톱)을 골라 여러 음색을 섞습니다.",
    features: ["손으로 치는 건반(매뉴얼) 여러 단과 발로 치는 페달 건반이 있습니다.", "건반을 누르고 있는 동안 소리가 줄지 않고 이어집니다.", "건물에 맞춰 설계하므로 오르간마다 크기와 구성이 다릅니다."],
    range: { low: "C1", high: "C8" },
    rangeNote: "음전에 따라 더 넓어짐",
    works: [{ title: "「토카타와 푸가」 라단조", composer: "바흐", note: "오르간의 웅장한 소리를 보여 주는 대표곡입니다." }, { title: "교향곡 제3번 「오르간」", composer: "생상스", note: "관현악과 파이프 오르간이 함께 울립니다." }],
    tip: "피아노와 달리 소리가 줄지 않는 까닭을 소리 내는 방법에서 찾아봅니다.",
  },
  {
    id: "harpsichord", name: "하프시코드", english: "Harpsichord", family: "건반악기", kind: "현을 뜯는 건반악기", file: "File:ClavecinRuckers&Taskin.JPG",
    summary: "피아노가 나오기 전 바로크 시대에 가장 널리 쓰인 건반악기입니다. 쳄발로라고도 부르며, 찰랑거리는 금속성 소리가 납니다.",
    sound: "건반을 누르면 작은 갈고리(플렉트럼)가 줄을 뜯어 소리를 냅니다.",
    features: ["건반을 누르는 세기로 셈여림을 바꾸기 어렵습니다.", "건반을 두 단으로 만들어 음색을 바꾸기도 합니다.", "바로크 합주에서 통주저음을 맡았습니다."],
    range: { low: "F1", high: "F6" },
    works: [{ title: "「이탈리아 협주곡」", composer: "바흐", note: "두 단 건반으로 독주와 합주가 주고받는 느낌을 냅니다." }, { title: "「골드베르크 변주곡」", composer: "바흐", note: "하프시코드를 위해 쓴 변주곡으로 오늘날 피아노로도 많이 연주합니다." }],
    tip: "같은 곡을 하프시코드와 피아노로 들어 보고 셈여림 표현의 차이를 비교합니다.",
  },
  // ── 국악기
  {
    id: "gayageum", name: "가야금", english: "Gayageum", family: "국악기", kind: "현악기 · 줄을 뜯는 악기", file: "File:Gayageum 12 string.jpg",
    summary: "가야의 가실왕이 만들고 우륵이 곡을 지었다고 전하는 악기로, 오동나무 울림통에 명주실 열두 줄을 걸었습니다. 맑고 부드러운 소리가 납니다.",
    sound: "오른손으로 줄을 뜯거나 튕기고, 왼손으로 안족 왼쪽의 줄을 눌러 음을 떨거나 꺾습니다.",
    features: ["줄마다 기러기발 모양의 안족을 받쳐 음높이를 조율합니다.", "정악가야금(풍류가야금)과 크기가 작은 산조가야금이 있습니다.", "오늘날에는 줄을 늘린 25현 개량 가야금도 씁니다."],
    rangeNote: "국악기는 서양 음이름보다 율명으로 음높이를 나타내므로 음역 막대를 싣지 않았습니다.",
    works: [{ title: "「가야금 산조」", composer: "민속악", note: "느린 진양조에서 빠른 휘모리로 장단이 점점 빨라집니다." }, { title: "「침향무」", composer: "황병기", note: "창작 국악의 대표곡으로 가야금의 새로운 소리를 들려줍니다." }],
    tip: "왼손으로 줄을 눌러 음을 떨고 꺾는 ‘농현’을 서양의 비브라토와 비교해 봅니다.",
  },
  {
    id: "geomungo", name: "거문고", english: "Geomungo", family: "국악기", kind: "현악기 · 술대로 치는 악기", file: "File:Geomungo 11 string.jpg",
    summary: "고구려의 왕산악이 만들었다고 전하는 여섯 줄 악기로, 낮고 굵은 소리가 웅장합니다. 옛 선비들이 마음을 닦는 악기로 아꼈습니다.",
    sound: "오른손에 쥔 대나무 술대로 줄을 내려치거나 뜯고, 왼손으로 괘를 짚어 음높이를 바꿉니다.",
    features: ["16개의 괘 위에 세 줄을 걸고, 나머지 줄은 안족으로 받칩니다.", "술대가 울림통을 칠 때 나는 ‘딱’ 소리도 음악의 일부입니다.", "‘백악지장(모든 악기의 으뜸)’이라 불렀습니다."],
    rangeNote: "국악기는 서양 음이름보다 율명으로 음높이를 나타내므로 음역 막대를 싣지 않았습니다.",
    works: [{ title: "「거문고 산조」", composer: "민속악", note: "술대로 치는 힘찬 소리와 여린 소리가 어우러집니다." }, { title: "「영산회상」", composer: "정악", note: "현악 합주에서 거문고가 음악을 이끕니다." }],
    tip: "가야금과 거문고를 비교하며 줄의 수, 연주 도구, 음색의 차이를 표로 정리해 봅니다.",
  },
  {
    id: "haegeum", name: "해금", english: "Haegeum", family: "국악기", kind: "현악기 · 활로 켜는 악기", file: "File:Haegeum.jpg",
    summary: "두 줄을 활로 켜서 소리를 내는 악기로, 사람의 목소리처럼 애절하면서도 익살스러운 소리를 냅니다. 흔히 ‘깡깡이’라고도 불렀습니다.",
    sound: "두 줄 사이에 끼운 말총 활을 밀고 당겨 소리를 내고, 왼손으로 줄을 감아쥐는 힘을 달리해 음높이를 바꿉니다.",
    features: ["지판이 없어 손의 힘으로 음높이를 정합니다.", "여덟 가지 재료(팔음)를 모두 써서 만든 악기로 알려져 있습니다.", "궁중 음악부터 민속 음악, 대중음악까지 두루 연주합니다."],
    rangeNote: "국악기는 서양 음이름보다 율명으로 음높이를 나타내므로 음역 막대를 싣지 않았습니다.",
    works: [{ title: "「해금 산조」", composer: "민속악", note: "음을 밀어 올리고 꺾는 해금의 표현력을 들을 수 있습니다." }, { title: "「수제천」", composer: "정악", note: "피리·대금 등과 함께 느리고 장엄한 선율을 이어 갑니다." }],
    tip: "해금과 바이올린을 비교하며 활의 위치와 음높이를 바꾸는 방법의 차이를 찾아봅니다.",
  },
  {
    id: "ajaeng", name: "아쟁", english: "Ajaeng", family: "국악기", kind: "현악기 · 활로 켜는 악기", file: "File:Ajaeng.jpg",
    summary: "국악 현악기 가운데 가장 낮은 소리를 내는 악기로, 거칠면서도 깊고 슬픈 음색이 특징입니다.",
    sound: "송진을 칠한 개나리 나무 활대나 말총 활로 줄을 문질러 소리를 냅니다.",
    features: ["정악아쟁은 일곱 줄, 산조아쟁은 여덟 줄 안팎입니다.", "가야금처럼 안족을 받쳐 조율합니다.", "관현악 합주에서 낮은 음을 이어 줍니다."],
    rangeNote: "국악기는 서양 음이름보다 율명으로 음높이를 나타내므로 음역 막대를 싣지 않았습니다.",
    works: [{ title: "「아쟁 산조」", composer: "민속악", note: "낮고 흐느끼는 듯한 소리로 깊은 슬픔을 표현합니다." }, { title: "「시나위」", composer: "민속악", note: "여러 악기가 즉흥적으로 어우러지는 가운데 아쟁이 낮은 음을 맡습니다." }],
    tip: "첼로·더블베이스와 아쟁을 비교하며 낮은 음을 맡는 악기의 공통점을 찾아봅니다.",
  },
  {
    id: "daegeum", name: "대금", english: "Daegeum", family: "국악기", kind: "관악기 · 가로로 부는 악기", file: "File:Daegeum player.jpg",
    summary: "굵은 대나무로 만든 가로 피리로, 신라의 만파식적 설화와 이어지는 악기입니다. 맑으면서도 떨리는 독특한 소리를 냅니다.",
    sound: "취구에 입김을 불어 넣어 소리를 내고, 여섯 개의 지공을 막고 열어 음높이를 바꿉니다.",
    features: ["갈대 속의 얇은 막(청)을 붙인 청공이 있어 소리가 ‘떨리며’ 울립니다.", "합주에서 다른 악기가 음을 맞추는 기준 악기입니다.", "정악대금과 크기가 작은 산조대금이 있습니다."],
    rangeNote: "국악기는 서양 음이름보다 율명으로 음높이를 나타내므로 음역 막대를 싣지 않았습니다.",
    works: [{ title: "「청성곡」", composer: "정악", note: "높은 음역에서 길게 뻗는 대금 독주곡입니다." }, { title: "「대금 산조」", composer: "민속악", note: "장단이 점점 빨라지며 대금의 다양한 표현을 들려줍니다." }],
    tip: "플루트와 대금의 소리를 비교하며 청공이 만드는 떨림을 찾아 들어 봅니다.",
  },
  {
    id: "piri", name: "피리", english: "Piri", family: "국악기", kind: "관악기 · 세로로 부는 겹서 악기", file: "File:Se-piri.jpg",
    summary: "짧은 대나무 관에 겹으로 된 서(리드)를 꽂아 부는 악기로, 크고 힘찬 소리로 합주의 주선율을 이끕니다.",
    sound: "서를 입술에 물고 숨을 불어 넣어 두 겹의 서를 떨게 하고, 여덟 개의 지공(앞 일곱, 뒤 하나)으로 음높이를 바꿉니다.",
    features: ["향피리·세피리·당피리가 있습니다.", "서를 무는 깊이와 입김으로 음을 밀어 올리거나 떨 수 있습니다.", "오보에처럼 겹리드로 소리를 냅니다."],
    rangeNote: "국악기는 서양 음이름보다 율명으로 음높이를 나타내므로 음역 막대를 싣지 않았습니다.",
    works: [{ title: "「수제천」", composer: "정악", note: "피리가 느리고 장엄한 주선율을 이끕니다." }, { title: "「관악영산회상」", composer: "정악", note: "피리를 중심으로 한 관악 합주입니다." }],
    tip: "오보에와 피리를 비교하며 겹리드 악기의 공통점과 음색의 차이를 찾아봅니다.",
  },
  {
    id: "danso", name: "단소", english: "Danso", family: "국악기", kind: "관악기 · 세로로 부는 악기", file: "File:Danso.jpg",
    summary: "짧은 대나무 관을 세로로 부는 악기로, 맑고 청아한 소리를 냅니다. 학교 국악 수업에서 많이 배웁니다.",
    sound: "관 윗부분의 취구 가장자리에 입김을 불어 소리를 내고, 다섯 개의 지공(앞 넷, 뒤 하나)으로 음높이를 바꿉니다.",
    features: ["리드 없이 입김으로 소리를 냅니다.", "‘황·태·중·임·남’ 같은 율명으로 운지를 익힙니다.", "생황과 함께 연주하는 병주로도 유명합니다."],
    rangeNote: "국악기는 서양 음이름보다 율명으로 음높이를 나타내므로 음역 막대를 싣지 않았습니다.",
    works: [{ title: "「청성곡」", composer: "정악", note: "대금뿐 아니라 단소 독주로도 자주 연주합니다." }, { title: "생소병주 「수룡음」", composer: "정악", note: "생황과 단소가 함께 연주하는 이중주입니다." }],
    tip: "리코더와 단소를 비교하며 취구의 생김새와 소리 내는 방법의 차이를 체험합니다.",
  },
  {
    id: "taepyeongso", name: "태평소", english: "Taepyeongso", family: "국악기", kind: "관악기 · 겹서 악기", file: "File:Korea-Taepyeongso-01.jpg",
    summary: "나팔 모양의 금속 통(동팔랑)이 달린 겹서 악기로, 국악기 가운데 가장 크고 화려한 소리를 냅니다. 호적·날라리라고도 부릅니다.",
    sound: "작은 서를 물고 세게 불어 소리를 내고, 여덟 개의 지공으로 음높이를 바꿉니다.",
    features: ["소리가 커서 야외 행진과 풍물놀이에 씁니다.", "임금의 행차에 쓰인 대취타에서 선율을 맡습니다.", "종묘제례악에서도 연주합니다."],
    rangeNote: "국악기는 서양 음이름보다 율명으로 음높이를 나타내므로 음역 막대를 싣지 않았습니다.",
    works: [{ title: "「대취타」", composer: "궁중 행진 음악", note: "‘명금일하 대취타’ 호령으로 시작하는 행진 음악입니다." }, { title: "「종묘제례악」 중 ‘정대업’", composer: "궁중 음악", note: "무공을 기리는 음악에서 태평소가 힘차게 울립니다." }],
    tip: "「대취타」를 들으며 행진 음악에 큰 소리의 악기를 쓰는 까닭을 이야기해 봅니다.",
  },
  {
    id: "janggu", name: "장구", english: "Janggu", family: "국악기", kind: "타악기 · 막울림 악기", file: "File:Janggu.jpg",
    summary: "허리가 잘록한 통의 양쪽에 가죽을 씌운 북으로, 국악의 장단을 이끄는 가장 중요한 타악기입니다.",
    sound: "왼쪽 북편은 궁채나 손바닥으로, 오른쪽 채편은 가는 열채로 쳐서 소리를 냅니다.",
    features: ["북편은 낮고 둥근 소리, 채편은 높고 날카로운 소리가 납니다.", "조임줄의 가죽 고리(조이개)를 움직여 소리를 조절합니다.", "사물놀이에서는 ‘비’를 나타낸다고 이야기합니다."],
    works: [{ title: "사물놀이 「삼도 설장구가락」", composer: "사물놀이", note: "여러 지역의 장구 가락을 모아 화려하게 연주합니다." }, { title: "민요 「아리랑」 반주", composer: "민요", note: "세마치장단으로 노래를 받칩니다." }],
    tip: "‘국악 장단’ 탭에서 장구 장단을 들으며 덩·쿵·덕을 직접 쳐 봅니다.",
  },
  {
    id: "buk", name: "북", english: "Buk", family: "국악기", kind: "타악기 · 막울림 악기", file: "File:Korea-Buk-01.jpg",
    summary: "나무통 양쪽에 가죽을 씌운 북으로, 쓰임에 따라 판소리의 소리북, 풍물놀이의 풍물북 등 여러 가지가 있습니다.",
    sound: "북채로 가죽이나 나무 테(통)를 쳐서 소리를 냅니다.",
    features: ["판소리에서는 고수가 소리북으로 장단을 치며 ‘얼씨구’ 같은 추임새를 넣습니다.", "‘일고수 이명창’이라는 말이 있을 만큼 고수의 역할이 중요합니다.", "사물놀이에서는 ‘구름’을 나타낸다고 이야기합니다."],
    works: [{ title: "판소리 「춘향가」 중 ‘사랑가’", composer: "판소리", note: "고수의 북 장단과 추임새가 소리꾼을 받칩니다." }, { title: "사물놀이 「삼도 농악가락」", composer: "사물놀이", note: "북이 묵직한 소리로 박을 받칩니다." }],
    tip: "판소리 영상을 보며 고수의 추임새를 찾아 따라 해 봅니다.",
  },
  {
    id: "kkwaenggwari", name: "꽹과리", english: "Kkwaenggwari", family: "국악기", kind: "타악기 · 몸울림 악기", file: "File:Korea-Ggaenggwari-01.jpg",
    summary: "놋쇠로 만든 작은 징 모양의 악기로, 날카롭고 높은 소리로 풍물놀이와 사물놀이를 이끕니다.",
    sound: "왼손에 쥐고 오른손의 채로 쳐서 소리를 내고, 왼손가락으로 안쪽을 막거나 떼어 울림을 조절합니다.",
    features: ["꽹과리를 치며 전체를 이끄는 사람을 ‘상쇠’라고 합니다.", "소리가 크고 날카로워 신호를 보내는 역할을 합니다.", "사물놀이에서는 ‘천둥’이나 ‘번개’를 나타낸다고 이야기합니다."],
    works: [{ title: "사물놀이 「웃다리 풍물」", composer: "사물놀이", note: "꽹과리가 가락을 바꾸는 신호를 보내며 연주를 이끕니다." }],
    tip: "꽹과리 소리를 막을 때와 열 때를 비교하며 음색 변화를 들어 봅니다.",
  },
  {
    id: "jing", name: "징", english: "Jing", family: "국악기", kind: "타악기 · 몸울림 악기", file: "File:Jing.jpg",
    summary: "놋쇠로 만든 큰 대야 모양의 악기로, 낮고 긴 여운이 가락 전체를 감싸 줍니다.",
    sound: "헝겊을 감은 채로 가운데를 쳐서 소리를 내며, 울림이 오래 이어집니다.",
    features: ["장단의 첫 박 같은 중요한 자리에서 칩니다.", "대취타와 풍물놀이, 무속 음악에서 두루 씁니다.", "사물놀이에서는 ‘바람’을 나타낸다고 이야기합니다."],
    works: [{ title: "「대취타」", composer: "궁중 행진 음악", note: "징이 묵직하게 울리며 행진의 위엄을 더합니다." }, { title: "사물놀이 「삼도 농악가락」", composer: "사물놀이", note: "장단의 큰 마디마다 징이 울립니다." }],
    tip: "사물놀이 네 악기가 자연(천둥·비·구름·바람)에 빗대어지는 까닭을 음색과 연결해 봅니다.",
  },
  {
    id: "pyeonjong", name: "편종", english: "Pyeonjong", family: "국악기", kind: "타악기 · 음높이가 있는 몸울림 악기", file: "File:편종 (1).JPG",
    summary: "크기는 같고 두께가 다른 16개의 종을 틀에 두 단으로 매단 악기로, 궁중 제례 음악에 씁니다.",
    sound: "쇠뿔로 만든 각퇴로 종 아랫부분을 쳐서 소리를 냅니다. 종이 두꺼울수록 높은 소리가 납니다.",
    features: ["고려 때 중국에서 들어왔고, 조선 세종 때 우리 손으로 만들기 시작했습니다.", "돌로 만든 편경과 짝을 이룹니다.", "종묘제례악과 문묘제례악에서 연주합니다."],
    rangeNote: "국악기는 서양 음이름보다 율명으로 음높이를 나타내므로 음역 막대를 싣지 않았습니다.",
    works: [{ title: "「종묘제례악」", composer: "궁중 음악", note: "조선 왕실의 제사 음악으로 유네스코 인류무형문화유산입니다." }, { title: "「문묘제례악」", composer: "궁중 음악", note: "공자를 모시는 제사 음악에서 편종과 편경이 함께 울립니다." }],
    tip: "‘두꺼울수록 높은 소리’가 나는 편종과 ‘클수록 낮은 소리’가 나는 서양 악기를 비교해 봅니다.",
  },
];

export const findInstrument = (id: string) => instruments.find(item => item.id === id);

// ── 맞히기 모드: 설명 속 핵심 낱말을 초성 빈칸으로 바꾸고, 이름은 보기 넷 가운데 고릅니다.
const initials = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const isSyllable = (char: string | undefined) => Boolean(char) && char! >= "가" && char! <= "힣";
/** 바이올린 → ㅂㅇㅇㄹ. 한글이 아닌 글자는 그대로 둡니다. */
export function initialConsonants(word: string) {
  return [...word].map(char => isSyllable(char) ? initials[Math.floor((char.charCodeAt(0) - 0xac00) / 588)] : char).join("");
}

/** 소리 내는 방법과 생김새를 떠올리게 하는 낱말입니다. 긴 낱말부터 찾습니다. */
export const quizKeywords = [
  "가온음자리표", "낮은음자리표", "아르페지오", "마우스피스", "플렉트럼", "피치카토", "비브라토", "글리산도", "트레몰로", "슬라이드", "스타카토",
  "엔드핀", "겹리드", "홑리드", "약음기", "공명관", "쇠막대", "금속판", "명주실", "오동나무", "조임줄", "동팔랑", "추임새",
  "말총", "활대", "페달", "프렛", "지판", "옥타브", "취구", "리드", "입술", "입김", "밸브", "배음", "나팔", "가죽", "쇠줄", "펠트", "해머", "건반", "파이프", "음전",
  "안족", "농현", "술대", "청공", "지공", "겹서", "북편", "채편", "궁채", "열채", "각퇴", "놋쇠", "구리", "상쇠", "고수", "장단", "대나무", "갈대",
  "높은", "낮은", "활", "줄", "채", "괘", "키",
].sort((a, b) => b.length - a.length);
const particles = "을를이가은는의과와도에로만으처나";
export type QuizPiece = { text: string } | { answer: string; hint: string } | { name: true };

/** 글을 조각으로 나눕니다. 악기 이름은 가리고, 핵심 낱말은 limit 가지까지 빈칸으로 만듭니다. */
export function quizPieces(text: string, item: Pick<Instrument, "name">, limit = 3): QuizPiece[] {
  const pieces: QuizPiece[] = [];
  const used = new Set<string>();
  let plain = "";
  const flush = () => { if (plain) pieces.push({ text: plain }); plain = ""; };
  for (let index = 0; index < text.length;) {
    if (text.startsWith(item.name, index)) { flush(); pieces.push({ name: true }); index += item.name.length; continue; }
    const before = text[index - 1];
    const word = isSyllable(before) ? undefined : quizKeywords.find(keyword => {
      if (!text.startsWith(keyword, index)) return false;
      const after = text[index + keyword.length];
      return (!isSyllable(after) || particles.includes(after)) && (used.has(keyword) || used.size < limit);
    });
    if (word) { used.add(word); flush(); pieces.push({ answer: word, hint: initialConsonants(word) }); index += word.length; continue; }
    plain += text[index];
    index += 1;
  }
  flush();
  return pieces;
}

/** 이름 보기 넷: 정답과 같은 악기군의 악기를 먼저 섞어 넣습니다. 같은 악기는 늘 같은 순서로 나옵니다. */
export function nameChoices(item: Instrument, count = 4) {
  let seed = [...item.id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  const random = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 2 ** 32; };
  const shuffle = <T,>(list: T[]) => list.map(value => [random(), value] as const).sort((a, b) => a[0] - b[0]).map(([, value]) => value);
  const others = [...shuffle(instruments.filter(other => other.family === item.family && other.id !== item.id)), ...shuffle(instruments.filter(other => other.family !== item.family))];
  return shuffle([item, ...others.slice(0, count - 1)]);
}

// ── 음역: 피아노 건반(A0~C8)을 기준으로 막대를 그립니다.
const letters: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteToMidi(note: string) {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!match) return NaN;
  return (Number(match[3]) + 1) * 12 + letters[match[1]] + (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0);
}
export const PIANO_LOW = noteToMidi("A0");
export const PIANO_HIGH = noteToMidi("C8");
/** 화면에 보일 음이름: Bb3 → B♭3 */
export const noteLabel = (note: string) => note.replace("b", "♭").replace("#", "♯");
export function rangePercent(range: { low: string; high: string }) {
  const span = PIANO_HIGH - PIANO_LOW;
  const left = (noteToMidi(range.low) - PIANO_LOW) / span;
  const right = (noteToMidi(range.high) - PIANO_LOW) / span;
  return { left: left * 100, width: (right - left) * 100 };
}

// ── 활동지
export const instrumentSheetSchema = z.object({
  title: z.string().max(100),
  mode: z.enum(["card", "explore"]),
  selected: z.array(z.string().max(40)).max(12),
  images: z.boolean(),
});
export type InstrumentSheet = z.infer<typeof instrumentSheetSchema>;
export const defaultInstrumentSheet: InstrumentSheet = { title: "악기를 알아봅시다", mode: "card", selected: ["violin", "flute", "trumpet", "gayageum"], images: true };

/** 인쇄용 사진 정보. 이용 조건에 따라 출처를 함께 적습니다. */
export type SheetImage = { url: string; credit: string };

export function instrumentSheetHtml(sheet: InstrumentSheet, image: (item: Instrument) => SheetImage | null) {
  const items = sheet.selected.map(findInstrument).filter((item): item is Instrument => Boolean(item));
  const picture = (item: Instrument) => {
    const found = sheet.images ? image(item) : null;
    return found ? `<figure style="margin:0;width:42mm;flex:none;text-align:center"><img src="${esc(found.url)}" alt="${esc(item.name)}" style="max-width:42mm;max-height:42mm;object-fit:contain"><figcaption style="font-size:7pt;color:#555;line-height:1.3;margin-top:1mm">${esc(found.credit)}</figcaption></figure>` : "";
  };
  const box = (body: string) => `<section style="break-inside:avoid;border:1px solid #999;border-radius:3mm;padding:4mm;margin:0 0 5mm;display:flex;gap:4mm;align-items:flex-start">${body}</section>`;
  const head = (item: Instrument) => `<h2 style="font-size:14pt;margin:0 0 1mm">${esc(item.name)} <span style="font-size:10pt;font-weight:normal;color:#555">${esc(item.english)} · ${esc(item.family)} · ${esc(item.kind)}</span></h2>`;
  const range = (item: Instrument) => item.range ? `<p style="margin:1mm 0"><b>음역</b> ${esc(noteLabel(item.range.low))} ~ ${esc(noteLabel(item.range.high))}${item.rangeNote ? ` (${esc(item.rangeNote)})` : ""}</p>` : "";
  const blank = (label: string, lines = 1) => `<p style="margin:2mm 0"><b>${esc(label)}</b></p>${"<p style=\"border-bottom:1px solid #888;height:7mm;margin:0\"></p>".repeat(lines)}`;
  const body = items.map(item => sheet.mode === "card"
    ? box(`${picture(item)}<div style="flex:1;min-width:0">${head(item)}<p style="margin:1mm 0">${esc(item.summary)}</p><p style="margin:1mm 0"><b>소리 내는 방법</b> ${esc(item.sound)}</p>${range(item)}<ul style="margin:1mm 0;padding-left:5mm;list-style:disc">${item.features.map(feature => `<li>${esc(feature)}</li>`).join("")}</ul><p style="margin:1mm 0"><b>감상곡</b> ${item.works.map(work => `${esc(work.composer)} ${esc(work.title)}`).join(" · ")}</p></div>`)
    : box(`${picture(item)}<div style="flex:1;min-width:0">${head(item)}${blank("소리 내는 방법")}${blank("음색을 표현하는 말 (예: 맑다, 묵직하다)")}${blank(`감상곡: ${item.works[0].composer} ${item.works[0].title} — 들은 느낌`, 2)}</div>`)).join("");
  const closing = sheet.mode === "explore" ? question("정리하기 · 가장 마음에 드는 악기와 그 까닭을 써 봅시다.", "", 3) : "";
  return sheetHeader(sheet.title || "악기를 알아봅시다") + body + closing;
}
