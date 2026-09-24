// 중·고등학교 미술 교과서에서 자주 다루는 사조·작품·용어를 정리했습니다.
// file은 Wikimedia Commons 파일 이름이며 이용 조건(퍼블릭 도메인·CC)을 scripts/verify-art-works.ts --online으로 확인합니다.
// 작가 사후 70년이 지나지 않아 저작권이 남은 작품은 file 없이 설명만 두고 copyright를 표시합니다.

export type ArtWork = {
  id: string;
  title: string;
  original?: string;
  artist: string;
  year: string;
  place?: string;
  medium?: string;
  /** Wikimedia Commons 파일 이름(File:…) */
  file?: string;
  /** 저작권이 남아 이미지를 싣지 않는 작품 */
  copyright?: boolean;
  /** 교과서에서 이 작품을 다루는 까닭 한 줄 */
  point: string;
  /** 관련 미술 용어 id */
  terms: string[];
};

export type ArtMovement = {
  id: string;
  name: string;
  english: string;
  period: string;
  group: ArtGroup;
  summary: string;
  features: string[];
  works: ArtWork[];
};

export const artGroups = ["고대·중세", "르네상스~19세기", "근현대", "한국 미술"] as const;
export type ArtGroup = (typeof artGroups)[number];

export const termCategories = ["조형 요소", "조형 원리", "표현 기법", "재료·매체", "한국·동양화", "감상·비평", "현대 미술"] as const;
export type TermCategory = (typeof termCategories)[number];

export type ArtTerm = {
  id: string;
  term: string;
  english?: string;
  category: TermCategory;
  definition: string;
  /** 수업에서 쓰기 좋은 설명이나 활동 */
  tip?: string;
};

export const artMovements: ArtMovement[] = [
  {
    id: "prehistoric", name: "선사 미술", english: "Prehistoric Art", period: "약 4만~1만 년 전", group: "고대·중세",
    summary: "문자가 없던 시대에 사냥의 성공, 풍요와 다산을 바라며 동굴 벽과 돌, 뼈에 그리고 새긴 미술입니다.",
    features: ["주술적·실용적 목적", "관찰에 바탕을 둔 생동감 있는 동물 표현", "흙·숯·광물 안료 같은 자연 재료"],
    works: [
      { id: "lascaux", title: "라스코 동굴 벽화", artist: "작자 미상", year: "약 기원전 17,000년경", place: "프랑스 몽티냐크", medium: "동굴 벽에 광물 안료", file: "File:Lascaux painting.jpg", point: "움직이는 듯한 동물을 겹쳐 그린 구석기 미술의 대표작입니다.", terms: ["line", "form"] },
      { id: "willendorf", title: "빌렌도르프의 비너스", artist: "작자 미상", year: "약 기원전 25,000년경", place: "빈 자연사 박물관", medium: "석회암 조각", file: "File:Venus von Willendorf 01.jpg", point: "풍만한 몸을 과장해 다산과 풍요를 빈 것으로 풀이되는 조각입니다.", terms: ["mass", "exaggeration"] },
    ],
  },
  {
    id: "egypt", name: "이집트 미술", english: "Ancient Egyptian Art", period: "약 기원전 3100~30년", group: "고대·중세",
    summary: "사후 세계와 영원한 삶을 믿어 무덤과 신전, 파라오의 모습을 오래도록 변하지 않는 규칙에 따라 만들었습니다.",
    features: ["정면성의 원리(얼굴은 옆, 눈과 어깨는 정면)", "신분이 높을수록 크게 그리는 위계적 크기", "영원성을 위한 단단한 재료와 좌우 대칭"],
    works: [
      { id: "tutankhamun", title: "투탕카멘의 황금 가면", artist: "작자 미상", year: "기원전 1323년경", place: "이집트 카이로", medium: "금, 청금석, 유리", file: "File:CairoEgMuseumTaaMaskMostlyPhotographed.jpg", point: "파라오의 영원한 삶을 바라며 만든 장례용 가면으로, 좌우 대칭과 화려한 재료가 돋보입니다.", terms: ["symmetry", "frontality"] },
      { id: "nefertiti", title: "네페르티티 흉상", artist: "투트모세(추정)", year: "기원전 1345년경", place: "베를린 신 박물관", medium: "석회암에 채색", file: "File:Nofretete Neues Museum.jpg", point: "엄격한 규칙 속에서도 자연스러운 아름다움을 보여 주는 아마르나 시대 조각입니다.", terms: ["proportion", "symmetry"] },
    ],
  },
  {
    id: "greek-roman", name: "그리스·로마 미술", english: "Greek and Roman Art", period: "기원전 8세기~기원후 5세기", group: "고대·중세",
    summary: "인간의 몸을 가장 아름다운 비례로 표현하려 했고, 뒤에는 격정적인 감정과 움직임까지 담았습니다. 서양 미술의 '고전'이 되었습니다.",
    features: ["이상적인 비례와 조화(카논)", "콘트라포스토로 자연스러운 자세", "헬레니즘 시대의 극적인 감정 표현"],
    works: [
      { id: "parthenon", title: "파르테논 신전", artist: "익티노스·칼리크라테스(건축), 페이디아스(조각)", year: "기원전 447~432년", place: "그리스 아테네", medium: "대리석 건축", file: "File:The Parthenon in Athens.jpg", point: "도리스식 기둥과 정교한 비례로 고전 건축의 기준이 된 신전입니다.", terms: ["proportion", "balance", "golden-ratio"] },
      { id: "discobolus", title: "원반 던지는 사람", artist: "미론(원작)", year: "원작 기원전 450년경, 로마 시대 복제", place: "뮌헨 글립토테크(사진 속 청동 복제품)", medium: "청동 복제", file: "File:Roman bronze copy of Myron’s Discobolos, 2nd century CE (Glyptothek Munich).jpg", point: "움직임이 가장 긴장된 한순간을 붙잡아 균형 잡힌 몸으로 표현했습니다.", terms: ["movement", "balance"] },
      { id: "venus-de-milo", title: "밀로의 비너스", artist: "작자 미상(알렉산드로스로 추정)", year: "기원전 150~100년경", place: "파리 루브르 박물관", medium: "대리석", file: "File:Front views of the Venus de Milo.jpg", point: "몸의 무게를 한쪽 다리에 싣는 콘트라포스토 자세를 잘 보여 줍니다.", terms: ["contrapposto", "proportion"] },
      { id: "nike", title: "사모트라케의 니케", artist: "작자 미상", year: "기원전 190년경", place: "파리 루브르 박물관", medium: "대리석", file: "File:Victoire de Samothrace - Musee du Louvre - 20190812.jpg", point: "바람에 날리는 옷자락으로 힘찬 움직임을 표현한 헬레니즘 조각입니다.", terms: ["movement", "texture"] },
      { id: "laocoon", title: "라오콘 군상", artist: "아게산드로스 외 로도스섬의 조각가들", year: "기원전 1세기~기원후 1세기경", place: "바티칸 박물관", medium: "대리석", file: "File:Laocoön and his sons group.jpg", point: "고통에 몸부림치는 인물을 통해 헬레니즘 미술의 격정적인 감정 표현을 보여 줍니다.", terms: ["movement", "emphasis"] },
    ],
  },
  {
    id: "medieval", name: "중세 미술", english: "Medieval Art", period: "5~14세기", group: "고대·중세",
    summary: "크리스트교가 중심이 되어 성당을 짓고 성경 이야기를 전하는 모자이크, 스테인드글라스, 벽화가 발달했습니다.",
    features: ["종교적 의미를 전하는 상징적·평면적 표현", "비잔틴 모자이크와 황금빛 배경", "고딕 성당의 뾰족한 아치와 스테인드글라스"],
    works: [
      { id: "justinian", title: "유스티니아누스 황제와 수행원들", artist: "작자 미상", year: "547년경", place: "이탈리아 라벤나 산 비탈레 성당", medium: "모자이크", file: "File:Mosaic of Justinianus I - Basilica San Vitale (Ravenna).jpg", point: "금빛 배경과 정면을 바라보는 인물로 황제의 권위와 신성함을 표현한 비잔틴 모자이크입니다.", terms: ["mosaic", "frontality"] },
      { id: "chartres", title: "샤르트르 대성당", artist: "작자 미상", year: "1194~1220년경 재건", place: "프랑스 샤르트르", medium: "고딕 건축, 스테인드글라스", file: "File:Notre Dame de Chartres.jpg", point: "하늘로 솟은 첨탑과 스테인드글라스로 빛을 신의 존재처럼 느끼게 한 고딕 건축입니다.", terms: ["stained-glass", "rhythm"] },
      { id: "giotto-lamentation", title: "그리스도의 죽음을 애도함", artist: "조토 디 본도네", year: "1305년경", place: "이탈리아 파도바 스크로베니 예배당", medium: "프레스코", file: "File:Compianto sul Cristo morto.jpg", point: "인물의 슬픔과 입체감을 살려 르네상스로 가는 길을 연 벽화입니다.", terms: ["fresco", "mass"] },
    ],
  },
  {
    id: "renaissance", name: "르네상스", english: "Renaissance", period: "14~16세기", group: "르네상스~19세기",
    summary: "'다시 태어남'이라는 뜻으로, 그리스·로마 문화를 되살려 인간을 중심에 두고 과학적인 눈으로 세상을 그렸습니다.",
    features: ["선 원근법으로 깊이 있는 공간 표현", "해부학에 바탕을 둔 사실적인 인체", "안정된 삼각형 구도와 조화", "유화와 스푸마토 기법"],
    works: [
      { id: "arnolfini", title: "아르놀피니 부부의 초상", original: "Arnolfini Portrait", artist: "얀 반 에이크", year: "1434년", place: "런던 내셔널 갤러리", medium: "패널에 유채", file: "File:The Arnolfini portrait (1434).jpg", point: "유화 물감으로 금속·털·유리의 질감을 세밀하게 그린 북유럽 르네상스의 대표작입니다.", terms: ["oil-painting", "texture"] },
      { id: "birth-of-venus", title: "비너스의 탄생", original: "La nascita di Venere", artist: "산드로 보티첼리", year: "1484~1486년경", place: "피렌체 우피치 미술관", medium: "캔버스에 템페라", file: "File:Sandro Botticelli - La nascita di Venere - Google Art Project - edited.jpg", point: "그리스 신화를 우아한 선으로 되살려 르네상스 인문주의를 보여 줍니다.", terms: ["tempera", "line"] },
      { id: "last-supper", title: "최후의 만찬", original: "L'Ultima Cena", artist: "레오나르도 다빈치", year: "1495~1498년", place: "밀라노 산타 마리아 델레 그라치에 성당", medium: "벽에 템페라와 유채", file: "File:The Last Supper - Leonardo Da Vinci - High Resolution 32x16.jpg", point: "모든 선이 예수의 머리로 모이는 선 원근법 구도의 대표 예입니다.", terms: ["linear-perspective", "vanishing-point", "emphasis"] },
      { id: "mona-lisa", title: "모나리자", original: "Mona Lisa", artist: "레오나르도 다빈치", year: "1503~1519년경", place: "파리 루브르 박물관", medium: "패널에 유채", file: "File:Mona Lisa.jpg", point: "윤곽을 안개처럼 부드럽게 흐리는 스푸마토와 대기 원근법을 보여 줍니다.", terms: ["sfumato", "atmospheric-perspective", "composition"] },
      { id: "david", title: "다비드", original: "David", artist: "미켈란젤로 부오나로티", year: "1501~1504년", place: "피렌체 아카데미아 미술관", medium: "대리석", file: "File:'David' by Michelangelo Fir JBU004.jpg", point: "싸움 직전의 긴장된 순간을 콘트라포스토 자세와 정확한 해부학으로 표현했습니다.", terms: ["contrapposto", "proportion"] },
      { id: "creation-of-adam", title: "아담의 창조", original: "Creazione di Adamo", artist: "미켈란젤로 부오나로티", year: "1511~1512년경", place: "바티칸 시스티나 예배당 천장", medium: "프레스코", file: "File:Michelangelo - Creation of Adam (cropped).jpg", point: "닿을 듯 말 듯한 두 손가락에 시선을 모아 극적인 순간을 강조했습니다.", terms: ["fresco", "emphasis"] },
      { id: "school-of-athens", title: "아테네 학당", original: "Scuola di Atene", artist: "라파엘로 산치오", year: "1509~1511년", place: "바티칸 서명의 방", medium: "프레스코", file: "File:\"The School of Athens\" by Raffaello Sanzio da Urbino.jpg", point: "고대 철학자들을 선 원근법의 웅장한 건축 공간 속에 균형 있게 배치했습니다.", terms: ["linear-perspective", "balance", "symmetry"] },
    ],
  },
  {
    id: "baroque", name: "바로크", english: "Baroque", period: "17세기", group: "르네상스~19세기",
    summary: "'찌그러진 진주'라는 말에서 온 이름처럼, 르네상스의 안정감 대신 극적인 빛과 움직임으로 보는 사람의 감정을 흔들었습니다.",
    features: ["강한 빛과 어둠의 대비(키아로스쿠로)", "대각선을 쓴 역동적인 구도", "연극의 한 장면 같은 순간 포착"],
    works: [
      { id: "calling-of-matthew", title: "성 마태오의 소명", artist: "카라바조", year: "1599~1600년", place: "로마 산 루이지 데이 프란체시 성당", medium: "캔버스에 유채", file: "File:Caravaggio — The Calling of Saint Matthew.jpg", point: "어둠 속을 가르는 한 줄기 빛으로 극적인 순간을 강조한 테네브리즘의 대표작입니다.", terms: ["chiaroscuro", "contrast", "emphasis"] },
      { id: "night-watch", title: "야경", original: "De Nachtwacht", artist: "렘브란트 판 레인", year: "1642년", place: "암스테르담 국립미술관", medium: "캔버스에 유채", file: "File:La ronda de noche, por Rembrandt van Rijn.jpg", point: "단체 초상화를 빛과 움직임이 살아 있는 이야기 장면으로 바꾸었습니다.", terms: ["chiaroscuro", "movement"] },
      { id: "las-meninas", title: "시녀들", original: "Las Meninas", artist: "디에고 벨라스케스", year: "1656년", place: "마드리드 프라도 미술관", medium: "캔버스에 유채", file: "File:Las Meninas, by Diego Velázquez, from Prado in Google Earth.jpg", point: "화가 자신과 거울 속 왕 부부까지 담아 '누가 누구를 보는가'를 묻는 복잡한 구성입니다.", terms: ["composition", "space"] },
      { id: "pearl-earring", title: "진주 귀고리를 한 소녀", artist: "요하네스 페르메이르", year: "1665년경", place: "헤이그 마우리츠하위스 미술관", medium: "캔버스에 유채", file: "File:1665 Girl with a Pearl Earring.jpg", point: "어두운 배경 속 빛을 받은 얼굴과 진주가 돋보이는 트로니(인물 습작)입니다.", terms: ["contrast", "chiaroscuro"] },
    ],
  },
  {
    id: "rococo", name: "로코코", english: "Rococo", period: "18세기 전반", group: "르네상스~19세기",
    summary: "프랑스 귀족 사회의 취향을 따라 무겁고 장엄한 바로크 대신 가볍고 우아하며 장식적인 분위기를 즐겼습니다.",
    features: ["밝은 파스텔 색조", "섬세한 곡선 장식", "귀족들의 사랑과 여가를 다룬 주제"],
    works: [
      { id: "cythera", title: "키테라섬의 순례", artist: "장 앙투안 와토", year: "1717년", place: "파리 루브르 박물관", medium: "캔버스에 유채", file: "File:L'Embarquement pour Cythère, by Antoine Watteau, from C2RMF retouched.jpg", point: "사랑의 섬으로 떠나는 연인들을 꿈결 같은 색으로 그린 '페트 갈랑트(우아한 연회)' 그림입니다.", terms: ["hue", "rhythm"] },
      { id: "swing", title: "그네", original: "Les Hasards heureux de l'escarpolette", artist: "장 오노레 프라고나르", year: "1767년경", place: "런던 월리스 컬렉션", medium: "캔버스에 유채", file: "File:The Swing (P430).jpg", point: "밝은 색과 흔들리는 곡선으로 로코코의 경쾌한 분위기를 잘 보여 줍니다.", terms: ["movement", "hue"] },
    ],
  },
  {
    id: "neoclassicism", name: "신고전주의", english: "Neoclassicism", period: "18세기 후반~19세기 초", group: "르네상스~19세기",
    summary: "로코코의 가벼움에 반대해 그리스·로마의 엄격한 형식과 도덕적 가치를 되살렸습니다. 프랑스 혁명과 나폴레옹 시대에 크게 유행했습니다.",
    features: ["색보다 선과 형태를 중시", "또렷한 윤곽과 매끈한 붓 자국", "애국·희생 같은 교훈적인 주제"],
    works: [
      { id: "horatii", title: "호라티우스 형제의 맹세", artist: "자크 루이 다비드", year: "1784년", place: "파리 루브르 박물관", medium: "캔버스에 유채", file: "File:Le Serment des Horaces - Jacques-Louis David - Musée du Louvre Peintures INV 3692 ; MR 1432.jpg", point: "나라를 위한 희생을 단호한 직선과 안정된 구도로 표현한 신고전주의의 선언 같은 작품입니다.", terms: ["line", "balance", "composition"] },
      { id: "death-of-marat", title: "마라의 죽음", artist: "자크 루이 다비드", year: "1793년", place: "브뤼셀 벨기에 왕립미술관", medium: "캔버스에 유채", file: "File:Death of Marat by David.jpg", point: "혁명가의 죽음을 고요하고 숭고한 순교 장면처럼 그려 정치적 메시지를 담았습니다.", terms: ["contrast", "space"] },
    ],
  },
  {
    id: "romanticism", name: "낭만주의", english: "Romanticism", period: "19세기 전반", group: "르네상스~19세기",
    summary: "이성과 규칙을 앞세운 신고전주의에 맞서 개인의 감정과 상상력, 거대한 자연 앞의 경외감, 그 시대의 사건을 뜨겁게 표현했습니다.",
    features: ["선보다 색채와 붓질 중시", "역동적인 대각선 구도", "숭고한 자연과 동시대 사건"],
    works: [
      { id: "third-of-may", title: "1808년 5월 3일", original: "El tres de mayo de 1808", artist: "프란시스코 고야", year: "1814년", place: "마드리드 프라도 미술관", medium: "캔버스에 유채", file: "File:El Tres de Mayo, by Francisco de Goya, from Prado thin black margin.jpg", point: "전쟁의 폭력을 고발한 그림으로, 빛을 받은 흰 옷의 남자에게 시선이 모입니다.", terms: ["contrast", "emphasis"] },
      { id: "raft-of-medusa", title: "메두사호의 뗏목", artist: "테오도르 제리코", year: "1818~1819년", place: "파리 루브르 박물관", medium: "캔버스에 유채", file: "File:JEAN LOUIS THÉODORE GÉRICAULT - La Balsa de la Medusa (Museo del Louvre, 1818-19).jpg", point: "실제 난파 사건을 피라미드 구도로 쌓아 절망과 희망을 극적으로 그렸습니다.", terms: ["composition", "movement"] },
      { id: "liberty", title: "민중을 이끄는 자유의 여신", artist: "외젠 들라크루아", year: "1830년", place: "파리 루브르 박물관", medium: "캔버스에 유채", file: "File:La Liberté guidant le peuple - Eugène Delacroix - Musée du Louvre Peintures RF 129 - après restauration 2024.jpg", point: "1830년 7월 혁명을 강렬한 색과 삼각형 구도로 표현한 낭만주의 대표작입니다.", terms: ["hue", "composition", "emphasis"] },
      { id: "wanderer", title: "안개 바다 위의 방랑자", artist: "카스파르 다비트 프리드리히", year: "1818년경", place: "함부르크 미술관", medium: "캔버스에 유채", file: "File:Caspar David Friedrich - Wanderer above the Sea of Fog.jpeg", point: "뒷모습의 인물로 거대한 자연 앞에서 느끼는 숭고함을 함께 느끼게 합니다.", terms: ["atmospheric-perspective", "space"] },
      { id: "temeraire", title: "전함 테메레르", original: "The Fighting Temeraire", artist: "윌리엄 터너", year: "1839년", place: "런던 내셔널 갤러리", medium: "캔버스에 유채", file: "File:The Fighting Temeraire, JMW Turner, National Gallery.jpg", point: "해 질 녘 빛과 대기를 색으로 녹여 인상주의에 영향을 준 작품입니다.", terms: ["hue", "atmospheric-perspective"] },
    ],
  },
  {
    id: "realism", name: "사실주의", english: "Realism", period: "19세기 중엽", group: "르네상스~19세기",
    summary: "신화나 영웅 대신 눈앞의 현실, 특히 노동하는 평범한 사람들의 삶을 있는 그대로 그렸습니다.",
    features: ["동시대 현실과 서민의 생활", "꾸미지 않은 객관적인 표현", "\"천사를 보여 주면 천사를 그리겠다\"(쿠르베)"],
    works: [
      { id: "stone-breakers", title: "돌 깨는 사람들", artist: "귀스타브 쿠르베", year: "1849년", place: "제2차 세계 대전 중 소실", medium: "캔버스에 유채", file: "File:Gustave Courbet - The Stonebreakers - WGA05457.jpg", point: "고된 노동을 하는 사람들을 영웅처럼 꾸미지 않고 큰 화면에 그려 논란이 되었습니다.", terms: ["texture", "composition"] },
      { id: "gleaners", title: "이삭 줍는 사람들", original: "Des glaneuses", artist: "장 프랑수아 밀레", year: "1857년", place: "파리 오르세 미술관", medium: "캔버스에 유채", file: "File:Jean-François Millet - Gleaners - Google Art Project 2.jpg", point: "가난한 농민 여성을 묵직한 형태와 따뜻한 빛으로 존엄하게 그렸습니다.", terms: ["mass", "rhythm"] },
      { id: "angelus", title: "만종", original: "L'Angélus", artist: "장 프랑수아 밀레", year: "1857~1859년", place: "파리 오르세 미술관", medium: "캔버스에 유채", file: "File:JEAN-FRANÇOIS MILLET - El Ángelus (Museo de Orsay, 1857-1859. Óleo sobre lienzo, 55.5 x 66 cm).jpg", point: "저녁 종소리에 기도하는 농부 부부를 통해 노동과 신앙의 경건함을 담았습니다.", terms: ["atmospheric-perspective", "balance"] },
    ],
  },
  {
    id: "impressionism", name: "인상주의", english: "Impressionism", period: "1860~1880년대", group: "근현대",
    summary: "빛에 따라 시시각각 변하는 색을 순간의 '인상'으로 붙잡으려고 야외로 나가 빠른 붓질로 그렸습니다. 모네의 〈인상, 해돋이〉에서 이름이 나왔습니다.",
    features: ["빛과 대기에 따라 변하는 색 관찰", "물감을 섞지 않고 나란히 칠하는 짧은 붓질", "야외 사생과 도시·여가 같은 일상 주제", "사진과 일본 우키요에의 영향"],
    works: [
      { id: "fifer", title: "피리 부는 소년", original: "Le Fifre", artist: "에두아르 마네", year: "1866년", place: "파리 오르세 미술관", medium: "캔버스에 유채", file: "File:Manet, Edouard - Young Flautist, or The Fifer, 1866 (2).jpg", point: "배경을 없애고 평평한 색면으로 그려 인상주의 화가들에게 큰 영향을 주었습니다.", terms: ["plane", "hue"] },
      { id: "impression-sunrise", title: "인상, 해돋이", original: "Impression, soleil levant", artist: "클로드 모네", year: "1872년", place: "파리 마르모탕 모네 미술관", medium: "캔버스에 유채", file: "File:Monet - Impression, Sunrise.jpg", point: "'인상주의'라는 이름이 나온 작품으로, 안개 낀 항구의 순간을 빠른 붓질로 그렸습니다.", terms: ["complementary", "brushstroke"] },
      { id: "poppies", title: "개양귀비 들판", original: "Les Coquelicots", artist: "클로드 모네", year: "1873년", place: "파리 오르세 미술관", medium: "캔버스에 유채", file: "File:Claude Monet - Poppy Field - Google Art Project.jpg", point: "초록 들판 속 붉은 점들로 보색 대비와 야외의 밝은 빛을 보여 줍니다.", terms: ["complementary", "point"] },
      { id: "rouen", title: "루앙 대성당 연작", original: "La cathédrale de Rouen", artist: "클로드 모네", year: "1892~1894년(사진은 1893년 작)", medium: "캔버스에 유채", file: "File:RouenCathedral Monet 1894.jpg", point: "같은 성당을 시간과 날씨를 바꿔 30점 넘게 그려 빛에 따라 색이 달라짐을 보여 주었습니다.", terms: ["value", "series"] },
      { id: "water-lilies", title: "수련 연작", original: "Nymphéas", artist: "클로드 모네", year: "1897~1926년(사진은 1922년 작)", medium: "캔버스에 유채", file: "File:Claude Monet - Water Lilies - Google Art Project.jpg", point: "지베르니 정원의 연못을 수없이 그리며 형태보다 빛과 색 자체에 다가갔습니다.", terms: ["series", "brushstroke"] },
      { id: "moulin", title: "물랭 드 라 갈레트의 무도회", artist: "피에르 오귀스트 르누아르", year: "1876년", place: "파리 오르세 미술관", medium: "캔버스에 유채", file: "File:Renoir, Pierre-Auguste - Dance at Le Moulin de la Galette, 1876.jpg", point: "나뭇잎 사이로 떨어지는 햇빛 얼룩으로 즐거운 도시의 여가를 그렸습니다.", terms: ["value", "rhythm"] },
      { id: "boating-party", title: "뱃놀이 일행의 점심", artist: "피에르 오귀스트 르누아르", year: "1880~1881년", place: "워싱턴 필립스 컬렉션", medium: "캔버스에 유채", file: "File:Pierre-Auguste Renoir - Luncheon of the Boating Party - Google Art Project.jpg", point: "밝은 빛 속에서 어울리는 사람들을 대각선 구도로 생기 있게 배치했습니다.", terms: ["composition", "hue"] },
      { id: "ballet-class", title: "발레 수업", original: "La Classe de danse", artist: "에드가 드가", year: "1871~1874년", place: "파리 오르세 미술관", medium: "캔버스에 유채", file: "File:Edgar Degas - The Ballet Class - Google Art Project.jpg", point: "사진처럼 잘린 구도와 높은 시점으로 연습실의 한순간을 포착했습니다.", terms: ["composition", "space"] },
      { id: "great-wave", title: "가나가와 앞바다의 높은 파도", original: "神奈川沖浪裏", artist: "가쓰시카 호쿠사이", year: "1831년경", medium: "목판화(우키요에)", file: "File:Tsunami by hokusai 19th century.jpg", point: "유럽에 건너가 '자포니슴' 열풍을 일으키며 인상주의 화가들의 구도와 평면적 색에 영향을 주었습니다.", terms: ["woodcut", "japonisme", "contrast"] },
    ],
  },
  {
    id: "post-impressionism", name: "신인상주의·후기 인상주의", english: "Neo- & Post-Impressionism", period: "1880~1900년대", group: "근현대",
    summary: "인상주의의 밝은 색을 이어받으면서 쇠라는 과학적인 점묘로, 세잔은 단단한 구조로, 고흐와 고갱은 강렬한 감정과 상징으로 저마다의 길을 열었습니다.",
    features: ["쇠라: 색점을 찍어 눈에서 섞이게 하는 점묘법", "세잔: 자연을 원통·구·원뿔로 보는 구조", "고흐: 소용돌이치는 붓질과 감정의 색", "고갱: 평면적인 색면과 상징"],
    works: [
      { id: "grande-jatte", title: "그랑드 자트섬의 일요일 오후", artist: "조르주 쇠라", year: "1884~1886년", place: "시카고 미술관", medium: "캔버스에 유채", file: "File:A Sunday on La Grande Jatte, Georges Seurat, 1884.jpg", point: "수많은 색점을 찍어 멀리서 보면 섞여 보이게 한 점묘법의 대표작입니다.", terms: ["pointillism", "point", "complementary"] },
      { id: "sainte-victoire", title: "생트빅투아르산", artist: "폴 세잔", year: "1890년경", medium: "캔버스에 유채", file: "File:Paul Cézanne - Montagne Saint-victoire - Google Art Project.jpg", point: "고향의 산을 수십 번 그리며 자연을 단순한 형태와 색면으로 쌓아 입체주의의 길을 열었습니다.", terms: ["form", "plane"] },
      { id: "card-players", title: "카드놀이 하는 사람들", artist: "폴 세잔", year: "1894~1895년", place: "파리 오르세 미술관", medium: "캔버스에 유채", file: "File:Les Joueurs de cartes, par Paul Cézanne.jpg", point: "두 인물을 좌우로 마주 놓아 단단하고 안정된 구조를 만들었습니다.", terms: ["balance", "symmetry"] },
      { id: "starry-night", title: "별이 빛나는 밤", original: "De sterrennacht", artist: "빈센트 반 고흐", year: "1889년", place: "뉴욕 현대미술관", medium: "캔버스에 유채", file: "File:Van Gogh - Starry Night - Google Art Project.jpg", point: "소용돌이치는 붓질과 강렬한 색으로 눈에 보이는 풍경보다 마음속 감정을 표현했습니다.", terms: ["brushstroke", "impasto", "rhythm"] },
      { id: "sunflowers", title: "해바라기", original: "Zonnebloemen", artist: "빈센트 반 고흐", year: "1888년", place: "런던 내셔널 갤러리", medium: "캔버스에 유채", file: "File:Vincent Willem van Gogh 127.jpg", point: "노랑의 여러 단계만으로 화면을 채워 색의 힘을 보여 준 정물화입니다.", terms: ["hue", "impasto"] },
      { id: "cafe-terrace", title: "밤의 카페 테라스", artist: "빈센트 반 고흐", year: "1888년", place: "오테를로 크뢸러뮐러 미술관", medium: "캔버스에 유채", file: "File:Van Gogh - Terrace of a Café at Night (Place du Forum) 1888.jpg", point: "검은색 없이 파랑과 노랑의 보색 대비로 밤 풍경을 그렸습니다.", terms: ["complementary", "linear-perspective"] },
      { id: "bedroom", title: "아를의 침실", artist: "빈센트 반 고흐", year: "1888년", place: "암스테르담 반 고흐 미술관", medium: "캔버스에 유채", file: "File:Vincent van Gogh - De slaapkamer - Google Art Project.jpg", point: "일부러 기울인 원근과 평평한 색으로 '휴식'의 느낌을 표현하려 했습니다.", terms: ["linear-perspective", "plane"] },
      { id: "gauguin-where", title: "우리는 어디서 왔는가? 우리는 무엇인가? 우리는 어디로 가는가?", artist: "폴 고갱", year: "1897~1898년", place: "보스턴 미술관", medium: "캔버스에 유채", file: "File:Gauguin - Where Do We Come From? What Are We? Where Are We Going? (1897-98).jpg", point: "오른쪽에서 왼쪽으로 삶의 탄생부터 죽음까지를 평면적인 색과 상징으로 풀어냈습니다.", terms: ["symbol", "plane"] },
    ],
  },
  {
    id: "expressionism", name: "표현주의와 세기말 미술", english: "Expressionism", period: "1890~1920년대", group: "근현대",
    summary: "눈에 보이는 모습을 그대로 옮기기보다 불안, 고독, 사랑 같은 내면의 감정을 왜곡된 형태와 강렬한 색으로 드러냈습니다.",
    features: ["감정을 드러내려는 형태 왜곡과 과장", "현실과 다른 강렬하고 거친 색", "도시 문명과 인간 소외에 대한 불안"],
    works: [
      { id: "scream", title: "절규", original: "Skrik", artist: "에드바르 뭉크", year: "1893년", place: "오슬로 국립미술관", medium: "판지에 유채·템페라·파스텔", file: "File:Edvard Munch, 1893, The Scream, oil, tempera and pastel on cardboard, 91 x 73 cm, National Gallery of Norway.jpg", point: "일렁이는 선과 핏빛 하늘로 인간의 불안을 표현해 표현주의의 출발점이 되었습니다.", terms: ["line", "exaggeration"] },
      { id: "kiss", title: "키스", original: "Der Kuss", artist: "구스타프 클림트", year: "1907~1908년", place: "빈 벨베데레 미술관", medium: "캔버스에 유채, 금박", file: "File:The Kiss - Gustav Klimt - Google Cultural Institute.jpg", point: "금박과 장식 무늬로 사랑을 표현한 빈 분리파의 대표작입니다.", terms: ["pattern", "contrast"] },
      { id: "kirchner-berlin", title: "베를린 거리 풍경", artist: "에른스트 루트비히 키르히너", year: "1913년", place: "뉴욕 노이에 갤러리", medium: "캔버스에 유채", file: "File:Kirchner Berlin Street Scene 1913.jpg", point: "뾰족하게 늘어난 인물과 날카로운 붓질로 대도시의 긴장감을 표현했습니다.", terms: ["exaggeration", "brushstroke"] },
    ],
  },
  {
    id: "fauvism", name: "야수주의", english: "Fauvism", period: "1905~1908년경", group: "근현대",
    summary: "\"야수들 같다\"는 비평에서 이름이 나왔습니다. 대상의 실제 색과 상관없이 순수하고 강렬한 원색으로 화가의 감정을 표현했습니다.",
    features: ["대상 고유의 색에서 벗어난 자유로운 색", "튜브에서 짠 듯한 순수하고 강한 원색", "단순한 형태와 거친 붓질"],
    works: [
      { id: "woman-with-hat", title: "모자를 쓴 여인", original: "La Femme au chapeau", artist: "앙리 마티스", year: "1905년", place: "샌프란시스코 현대미술관", medium: "캔버스에 유채", file: "File:Matisse-Woman-with-a-Hat.jpg", point: "얼굴에 초록과 보라를 칠해 '야수주의'라는 이름이 붙게 한 문제작입니다.", terms: ["hue", "saturation"] },
      { id: "dance", title: "춤 II", original: "La Danse", artist: "앙리 마티스", year: "1910년", place: "상트페테르부르크 에르미타주 미술관", medium: "캔버스에 유채", file: "File:Matissedance.jpg", point: "빨강·파랑·초록 세 색과 둥글게 이어진 몸으로 춤의 리듬을 단순하게 표현했습니다.", terms: ["rhythm", "movement", "simplification"] },
      { id: "charing-cross", title: "채링 크로스 다리", artist: "앙드레 드랭", year: "1906년", medium: "캔버스에 유채", file: "File:Derain CharingCrossBridge.png", point: "런던의 회색 풍경을 원색의 색면과 짧은 붓질로 바꾸어 그렸습니다.", terms: ["saturation", "complementary"] },
    ],
  },
  {
    id: "cubism", name: "입체주의", english: "Cubism", period: "1907~1920년대", group: "근현대",
    summary: "하나의 시점에서 보이는 모습 대신 여러 방향에서 본 대상을 한 화면에 쪼개고 다시 짜 맞추어 그렸습니다. 세잔의 영향을 받아 피카소와 브라크가 시작했습니다.",
    features: ["여러 시점을 한 화면에 동시에 표현", "기하학적인 면으로 대상을 분해", "분석적 입체주의 → 종합적 입체주의(콜라주·파피에 콜레)"],
    works: [
      { id: "demoiselles", title: "아비뇽의 여인들", original: "Les Demoiselles d'Avignon", artist: "파블로 피카소", year: "1907년", place: "뉴욕 현대미술관", medium: "캔버스에 유채", copyright: true, point: "아프리카 조각의 영향을 받아 인체를 날카로운 면으로 쪼갠, 입체주의의 출발점이 된 작품입니다.", terms: ["multiple-viewpoints", "plane"] },
      { id: "guernica", title: "게르니카", artist: "파블로 피카소", year: "1937년", place: "마드리드 레이나 소피아 미술관", medium: "캔버스에 유채", copyright: true, point: "스페인 내전의 폭격을 흑백과 쪼개진 형태로 고발한 반전 미술의 대표작입니다.", terms: ["multiple-viewpoints", "value"] },
      { id: "gris-picasso", title: "피카소의 초상", artist: "후안 그리스", year: "1912년", place: "시카고 미술관", medium: "캔버스에 유채", file: "File:Juan Gris - Portrait of Pablo Picasso - Google Art Project.jpg", point: "인물을 격자 모양의 면으로 나누어 입체주의의 원리를 또렷하게 보여 줍니다.", terms: ["multiple-viewpoints", "plane"] },
    ],
  },
  {
    id: "abstract", name: "추상 미술", english: "Abstract Art", period: "1910년대~", group: "근현대",
    summary: "눈에 보이는 대상을 재현하지 않고 점, 선, 면, 색만으로 감정이나 질서를 표현합니다. 감정을 담은 '뜨거운 추상'과 기하학적 질서의 '차가운 추상'으로 나누어 보기도 합니다.",
    features: ["대상 재현에서 벗어난 순수한 조형 요소", "뜨거운 추상(칸딘스키, 서정적)과 차가운 추상(몬드리안, 기하학적)", "추상 표현주의·색면 추상으로 이어짐"],
    works: [
      { id: "composition-vii", title: "구성 VII", artist: "바실리 칸딘스키", year: "1913년", place: "모스크바 트레티야코프 미술관", medium: "캔버스에 유채", file: "File:Composition VII - Wassily Kandinsky, GAC.jpg", point: "음악처럼 색과 선을 울리게 하려 한, 뜨거운 추상의 대표작입니다.", terms: ["hot-abstraction", "rhythm", "hue"] },
      { id: "yellow-red-blue", title: "노랑-빨강-파랑", artist: "바실리 칸딘스키", year: "1925년", place: "파리 퐁피두 센터", medium: "캔버스에 유채", file: "File:Kandinsky - Gelb-Rot-Blau, 1925.jpg", point: "기하학적 도형과 자유로운 선을 함께 써서 색과 형태의 대비를 탐구했습니다.", terms: ["point", "line", "contrast"] },
      { id: "mondrian", title: "빨강, 파랑, 노랑의 구성 II", artist: "피트 몬드리안", year: "1930년", place: "취리히 미술관", medium: "캔버스에 유채", file: "File:Piet Mondriaan, 1930 - Mondrian Composition II in Red, Blue, and Yellow.jpg", point: "수직·수평선과 삼원색만으로 균형을 찾은 차가운 추상(신조형주의)의 대표작입니다.", terms: ["cold-abstraction", "balance", "primary-colors"] },
      { id: "black-square", title: "검은 사각형", artist: "카지미르 말레비치", year: "1915년", place: "모스크바 트레티야코프 미술관", medium: "캔버스에 유채", file: "File:Kazimir Malevich, 1915, Black Suprematic Square, oil on linen canvas, 79.5 x 79.5 cm, Tretyakov Gallery, Moscow.jpg", point: "흰 바탕에 검은 사각형 하나만 그려 '절대주의'를 선언한 극단적 추상입니다.", terms: ["plane", "simplification"] },
      { id: "pollock", title: "가을의 리듬(넘버 30)", artist: "잭슨 폴록", year: "1950년", place: "뉴욕 메트로폴리탄 미술관", medium: "캔버스에 에나멜", copyright: true, point: "캔버스를 바닥에 놓고 물감을 흘리고 뿌린 액션 페인팅(추상 표현주의)의 대표작입니다.", terms: ["dripping", "action-painting"] },
      { id: "kim-whanki", title: "우주 05-IV-71 #200", artist: "김환기", year: "1971년", medium: "코튼에 유채", copyright: true, point: "수많은 푸른 점을 찍어 우주와 그리움을 표현한 한국 추상 미술의 대표작입니다.", terms: ["point", "rhythm", "hot-abstraction"] },
    ],
  },
  {
    id: "dada-surrealism", name: "다다·초현실주의", english: "Dada & Surrealism", period: "1910~1940년대", group: "근현대",
    summary: "제1차 세계 대전의 충격 속에서 다다는 기존 예술의 권위를 비웃었고, 초현실주의는 프로이트의 영향을 받아 꿈과 무의식의 세계를 그렸습니다.",
    features: ["기성품을 작품으로 내놓는 레디메이드", "낯선 조합으로 충격을 주는 데페이즈망", "우연·자동 기술법(프로타주, 데칼코마니)"],
    works: [
      { id: "fountain", title: "샘", original: "Fountain", artist: "마르셀 뒤샹", year: "1917년(사진: 앨프리드 스티글리츠)", medium: "기성품 소변기(원작 분실)", file: "File:Marcel Duchamp, 1917, Fountain, photograph by Alfred Stieglitz.jpg", point: "공장에서 만든 물건에 서명만 해 전시에 내놓아 '무엇이 예술인가'를 물었습니다.", terms: ["readymade", "concept-art"] },
      { id: "persistence", title: "기억의 지속", artist: "살바도르 달리", year: "1931년", place: "뉴욕 현대미술관", medium: "캔버스에 유채", copyright: true, point: "녹아내리는 시계로 꿈속처럼 뒤틀린 시간을 표현한 초현실주의의 대표작입니다.", terms: ["depaysement", "symbol"] },
      { id: "treachery", title: "이미지의 배반(이것은 파이프가 아니다)", artist: "르네 마그리트", year: "1929년", place: "로스앤젤레스 카운티 미술관", medium: "캔버스에 유채", copyright: true, point: "그림과 글을 어긋나게 놓아 이미지와 실제 사물의 관계를 생각하게 합니다.", terms: ["depaysement", "concept-art"] },
    ],
  },
  {
    id: "contemporary", name: "팝 아트와 현대 미술", english: "Pop Art & Contemporary Art", period: "1950년대~", group: "근현대",
    summary: "대중문화와 광고, 대량 생산된 이미지를 미술로 끌어들인 팝 아트 이후, 비디오·설치·퍼포먼스처럼 재료와 형식의 경계가 사라졌습니다.",
    features: ["광고·만화·유명인 같은 대중문화 이미지", "실크스크린으로 반복 생산", "비디오 아트, 설치 미술, 개념 미술로 확장"],
    works: [
      { id: "marilyn", title: "마릴린 두 폭", original: "Marilyn Diptych", artist: "앤디 워홀", year: "1962년", place: "런던 테이트 모던", medium: "캔버스에 아크릴, 실크스크린", copyright: true, point: "같은 얼굴을 실크스크린으로 반복해 대량 소비 사회와 스타의 이미지를 보여 줍니다.", terms: ["silkscreen", "pop-art", "repetition"] },
      { id: "lichtenstein", title: "행복한 눈물", original: "Happy Tears", artist: "로이 리히텐슈타인", year: "1964년", medium: "캔버스에 유채·마그나", copyright: true, point: "만화의 망점(벤데이 점)과 말풍선 느낌을 크게 확대해 대중문화를 미술로 끌어왔습니다.", terms: ["pop-art", "point"] },
      { id: "dadaikseon", title: "다다익선", artist: "백남준", year: "1988년", place: "국립현대미술관 과천관", medium: "텔레비전 모니터 1,003대로 만든 비디오 탑", copyright: true, point: "텔레비전을 쌓아 올린 비디오 아트로, 기술과 예술의 만남을 보여 줍니다.", terms: ["video-art", "installation"] },
    ],
  },
  {
    id: "korean-ancient", name: "선사·삼국·고려의 미술", english: "Korean Art to Goryeo", period: "선사~14세기", group: "한국 미술",
    summary: "바위에 새긴 선사 시대 그림부터 고구려 고분 벽화, 불교 조각, 세계적으로 이름난 고려청자까지 우리 미술의 뿌리를 볼 수 있습니다.",
    features: ["바위그림과 고분 벽화에 담긴 생활과 믿음", "불교와 함께 발달한 불상·탑·공예", "고려청자의 비색과 상감 기법"],
    works: [
      { id: "bangudae", title: "울주 대곡리 반구대 암각화", artist: "작자 미상", year: "신석기~청동기 시대", place: "울산 울주", medium: "바위에 새김", file: "File:Bangudae Petroglyphs.jpg", point: "고래와 사냥 장면을 새긴 선사 시대의 바위그림으로, 2025년 유네스코 세계유산에 올랐습니다.", terms: ["line", "form"] },
      { id: "muyongchong", title: "무용총 수렵도", artist: "작자 미상", year: "5세기경 고구려", place: "중국 지린성 지안", medium: "고분 벽화", file: "File:Goguryeo tomb mural.jpg", point: "말을 달리며 활을 쏘는 모습으로 고구려 사람들의 힘찬 기상을 보여 줍니다.", terms: ["movement", "line"] },
      { id: "pensive-bodhisattva", title: "금동 반가사유상", artist: "작자 미상", year: "6세기 후반 삼국 시대", place: "국립중앙박물관", medium: "금동", file: "File:Gilt Bronze \"Pensive Bodhisattva,\" Three Kingdoms Period, Late 6th Century 1a.jpg", point: "한쪽 다리를 올리고 생각에 잠긴 자세와 은은한 미소로 깊은 사유를 표현했습니다.", terms: ["balance", "mass"] },
      { id: "incense-burner", title: "백제 금동대향로", artist: "작자 미상", year: "6~7세기 백제", place: "국립부여박물관", medium: "금동", file: "File:Incense Burner of Baekje in National Museum of Korea.jpg", point: "봉황과 산, 신선 세계를 섬세하게 새겨 백제 공예의 뛰어난 솜씨를 보여 줍니다.", terms: ["form", "pattern"] },
      { id: "seokguram", title: "석굴암 본존불", artist: "김대성 발원(전함)", year: "8세기 중엽 통일 신라", place: "경주 토함산", medium: "화강암", file: "File:Seokguram Grotto 01.jpg", point: "완벽한 비례와 균형으로 통일 신라 불교 조각의 절정을 보여 줍니다.", terms: ["proportion", "symmetry"] },
      { id: "celadon-maebyeong", title: "청자 상감 구름 학 무늬 매병", artist: "작자 미상", year: "12~13세기 고려", place: "뉴욕 메트로폴리탄 미술관(사진 속 소장품)", medium: "상감 청자", file: "File:청자 상감 구름 학 무늬 매병 고려-靑磁象嵌雲鶴文梅甁 高麗-Maebyeong decorated with cranes and clouds MET DT4857.jpg", point: "무늬를 파고 다른 흙을 메우는 상감 기법으로 구름과 학을 표현한 고려청자입니다.", terms: ["inlay", "pattern"] },
    ],
  },
  {
    id: "joseon", name: "조선의 미술", english: "Joseon Art", period: "15~19세기", group: "한국 미술",
    summary: "선비의 정신을 담은 문인화, 우리 산천을 직접 보고 그린 진경산수화, 서민의 삶을 담은 풍속화와 민화, 소박한 백자가 발달했습니다.",
    features: ["여백을 살린 구성과 먹의 농담", "정선의 진경산수화", "김홍도·신윤복의 풍속화", "생활 속 소망을 담은 민화와 백자"],
    works: [
      { id: "mongyu", title: "몽유도원도", artist: "안견", year: "1447년", place: "일본 덴리대학 중앙도서관", medium: "비단에 수묵 담채", file: "File:Ahn Gyeon-Mongyu dowondo.jpg", point: "안평 대군의 꿈을 현실 세계에서 꿈속 도원으로 이어지는 흐름으로 그린 조선 전기 산수화입니다.", terms: ["yeobaek", "three-distances"] },
      { id: "geumgang", title: "금강전도", artist: "정선", year: "1734년", place: "리움미술관", medium: "종이에 수묵 담채", file: "File:Jeong Seon-Geumgangjeondo.jpg", point: "금강산 일만 이천 봉을 한눈에 담아 둥근 구도로 표현한 진경산수화입니다.", terms: ["jingyeong", "cun"] },
      { id: "inwang", title: "인왕제색도", artist: "정선", year: "1751년", place: "국립중앙박물관", medium: "종이에 수묵", file: "File:Inwangjesaekdo.jpg", point: "비 갠 뒤 인왕산의 바위를 짙은 먹으로 쓸어내려 힘차게 표현했습니다.", terms: ["jingyeong", "ink-wash"] },
      { id: "ssireum", title: "씨름", artist: "김홍도", year: "18세기 후반", place: "국립중앙박물관(단원 풍속도첩)", medium: "종이에 수묵 담채", file: "File:Danwon Ssireum.jpg", point: "둥글게 둘러앉은 구경꾼과 가운데 씨름꾼으로 시선을 모은 풍속화입니다.", terms: ["genre-painting", "composition", "emphasis"] },
      { id: "seodang", title: "서당", artist: "김홍도", year: "18세기 후반", place: "국립중앙박물관(단원 풍속도첩)", medium: "종이에 수묵 담채", file: "File:Danwon Seodang.jpg", point: "혼나는 아이와 웃는 친구들의 표정으로 서당의 한 장면을 재치 있게 담았습니다.", terms: ["genre-painting", "yeobaek"] },
      { id: "dano", title: "단오풍정", artist: "신윤복", year: "18세기 후반~19세기 초", place: "간송미술관(혜원전신첩)", medium: "종이에 채색", file: "File:Hyewon-Danopungjeong.jpg", point: "고운 색과 섬세한 선으로 단옷날 여인들의 모습을 그린 풍속화입니다.", terms: ["genre-painting", "hue"] },
      { id: "sehando", title: "세한도", artist: "김정희", year: "1844년", place: "국립중앙박물관", medium: "종이에 수묵", file: "File:Sehando.jpg", point: "유배지에서 변치 않는 제자의 마음을 소나무·잣나무에 빗댄 문인화입니다.", terms: ["literati-painting", "yeobaek"] },
      { id: "moon-jar", title: "백자 달항아리", artist: "작자 미상", year: "18세기 조선", place: "뉴욕 메트로폴리탄 미술관(사진 속 소장품)", medium: "백자", file: "File:백자 달항아리 조선-白磁壺 朝鮮-Moon Jar MET DP231897.jpg", point: "위아래를 따로 빚어 붙여 살짝 비대칭인 둥근 형태가 넉넉한 아름다움을 줍니다.", terms: ["form", "asymmetry"] },
      { id: "chaekgeori", title: "책거리", artist: "작자 미상", year: "19세기 조선", medium: "종이에 채색(병풍)", file: "File:Chaekgeori (Scholar's Accoutrements), late 1800s, Korea.jpg", point: "책과 문방구를 쌓아 학문에 대한 바람을 담은 민화로, 역원근법이 쓰였습니다.", terms: ["minhwa", "reverse-perspective"] },
    ],
  },
];

export const artTerms: ArtTerm[] = [
  // 조형 요소
  { id: "point", term: "점", english: "Point", category: "조형 요소", definition: "조형의 가장 작은 단위로, 위치를 나타내고 모이거나 흩어지며 선·면·명암을 만듭니다.", tip: "점의 크기와 간격만 바꿔 가까움·멂, 밝음·어두움을 표현해 보게 하세요." },
  { id: "line", term: "선", english: "Line", category: "조형 요소", definition: "점이 움직인 자리입니다. 굵기·방향·속도에 따라 수평선은 안정, 수직선은 상승, 사선은 움직임, 곡선은 부드러움을 느끼게 합니다." },
  { id: "plane", term: "면", english: "Plane", category: "조형 요소", definition: "선으로 둘러싸이거나 색으로 채워진 평평한 영역입니다. 면을 겹치고 나누어 공간과 구조를 만듭니다." },
  { id: "form", term: "형·형태", english: "Shape / Form", category: "조형 요소", definition: "형(shape)은 평면에 나타난 윤곽이고, 형태(form)는 부피를 가진 입체의 모양입니다. 기하학적 형태와 유기적 형태로 나눕니다." },
  { id: "hue", term: "색상", english: "Hue", category: "조형 요소", definition: "빨강, 노랑, 파랑처럼 다른 색과 구별되는 색의 이름입니다. 색상환에서 가까운 색은 유사색, 마주 보는 색은 보색입니다." },
  { id: "value", term: "명도", english: "Value", category: "조형 요소", definition: "색의 밝고 어두운 정도입니다. 흰색에 가까울수록 명도가 높고, 명도 차이로 입체감과 빛을 표현합니다." },
  { id: "saturation", term: "채도", english: "Saturation", category: "조형 요소", definition: "색의 맑고 탁한 정도(순도)입니다. 다른 색이 섞이지 않은 순색일수록 채도가 높습니다." },
  { id: "texture", term: "질감", english: "Texture", category: "조형 요소", definition: "물체 표면이 주는 느낌입니다. 실제로 만져지는 촉각적 질감과 눈으로 느끼는 시각적 질감이 있습니다." },
  { id: "mass", term: "양감", english: "Mass / Volume", category: "조형 요소", definition: "대상이 지닌 부피감과 무게감입니다. 조각에서는 실제 부피로, 회화에서는 명암으로 표현합니다." },
  { id: "space", term: "공간", english: "Space", category: "조형 요소", definition: "대상이 차지하거나 둘러싼 자리입니다. 평면에서는 겹치기, 크기 변화, 원근법으로 깊이를 만듭니다." },
  { id: "primary-colors", term: "삼원색", english: "Primary Colors", category: "조형 요소", definition: "섞어서 만들 수 없는 기본색입니다. 색료(물감)는 빨강(마젠타)·노랑·파랑(사이안), 빛은 빨강·초록·파랑입니다." },
  { id: "complementary", term: "보색·보색 대비", english: "Complementary Colors", category: "조형 요소", definition: "색상환에서 마주 보는 두 색(빨강-초록, 노랑-남색 등)입니다. 나란히 놓으면 서로를 더 선명하게 보이게 합니다.", tip: "모네·고흐 작품에서 보색 짝을 찾아보는 활동이 좋습니다." },
  // 조형 원리
  { id: "balance", term: "균형", english: "Balance", category: "조형 원리", definition: "화면의 시각적 무게가 한쪽으로 치우치지 않고 안정된 상태입니다. 대칭 균형과 비대칭 균형이 있습니다." },
  { id: "symmetry", term: "대칭", english: "Symmetry", category: "조형 원리", definition: "중심선을 기준으로 양쪽이 같은 모양으로 마주하는 것입니다. 엄숙하고 안정된 느낌을 줍니다." },
  { id: "asymmetry", term: "비대칭", english: "Asymmetry", category: "조형 원리", definition: "양쪽 모양이 다르지만 시각적 무게를 맞춰 균형을 이루는 것입니다. 자연스럽고 변화 있는 느낌을 줍니다." },
  { id: "proportion", term: "비례", english: "Proportion", category: "조형 원리", definition: "부분과 부분, 부분과 전체 사이의 크기 관계입니다. 그리스 조각은 머리와 몸의 이상적 비례(카논)를 정했습니다." },
  { id: "golden-ratio", term: "황금비", english: "Golden Ratio", category: "조형 원리", definition: "약 1:1.618의 비율로, 예로부터 가장 아름다운 비례라고 여겨 건축과 미술에 쓰였다고 전해집니다.", tip: "모든 명작이 황금비로 만들어졌다는 말은 과장이므로 비판적으로 살펴보게 하세요." },
  { id: "emphasis", term: "강조", english: "Emphasis", category: "조형 원리", definition: "색·크기·위치·빛으로 특정 부분을 눈에 띄게 해 시선을 모으는 것입니다." },
  { id: "contrast", term: "대비", english: "Contrast", category: "조형 원리", definition: "밝음과 어둠, 큼과 작음, 따뜻한 색과 차가운 색처럼 성질이 반대인 요소를 함께 놓아 서로를 돋보이게 하는 것입니다." },
  { id: "rhythm", term: "율동(리듬)", english: "Rhythm", category: "조형 원리", definition: "같거나 비슷한 요소가 규칙적으로 되풀이되거나 점점 변하며 생기는 움직임의 느낌입니다." },
  { id: "repetition", term: "반복", english: "Repetition", category: "조형 원리", definition: "같은 형태나 색을 되풀이하는 것으로, 통일감과 리듬을 만듭니다." },
  { id: "movement", term: "동세", english: "Movement", category: "조형 원리", definition: "그림이나 조각에서 느껴지는 움직임의 방향과 기세입니다. 사선, 곡선, 옷자락 등으로 표현합니다." },
  { id: "composition", term: "구도", english: "Composition", category: "조형 원리", definition: "화면 안에 대상을 배치하는 짜임새입니다. 삼각형 구도는 안정, 대각선 구도는 역동, 원형 구도는 집중을 느끼게 합니다." },
  { id: "exaggeration", term: "과장·왜곡", english: "Exaggeration / Distortion", category: "조형 원리", definition: "대상의 특징이나 감정을 강하게 전하려고 크기·형태·색을 실제와 다르게 바꾸는 것입니다." },
  { id: "simplification", term: "단순화", english: "Simplification", category: "조형 원리", definition: "대상의 세부를 줄이고 핵심 형태와 색만 남겨 표현하는 것입니다." },
  { id: "pattern", term: "무늬·패턴", english: "Pattern", category: "조형 원리", definition: "같은 모양을 규칙적으로 배열해 만든 장식적인 짜임입니다." },
  { id: "frontality", term: "정면성의 원리", english: "Frontality", category: "조형 원리", definition: "이집트 미술처럼 얼굴과 다리는 옆모습, 눈과 어깨는 정면으로 그려 가장 특징적인 모습을 한 몸에 담는 규칙입니다." },
  { id: "contrapposto", term: "콘트라포스토", english: "Contrapposto", category: "조형 원리", definition: "몸무게를 한쪽 다리에 싣고 어깨와 골반을 반대로 기울여 자연스럽게 서 있는 자세입니다. 그리스 조각에서 시작되었습니다.", tip: "학생에게 직접 짝다리 자세를 취해 보게 하면 쉽게 이해합니다." },
  // 표현 기법
  { id: "linear-perspective", term: "선 원근법", english: "Linear Perspective", category: "표현 기법", definition: "멀어질수록 대상이 작아지고 평행선이 한 점(소실점)으로 모이게 그려 평면에 깊이를 만드는 방법입니다. 르네상스 때 체계화되었습니다." },
  { id: "vanishing-point", term: "소실점", english: "Vanishing Point", category: "표현 기법", definition: "선 원근법에서 평행한 선들이 멀리서 모이는 점입니다. 한 점·두 점·세 점 투시가 있습니다.", tip: "〈최후의 만찬〉 이미지 위에 선을 그어 소실점을 찾아보게 하세요." },
  { id: "atmospheric-perspective", term: "대기 원근법", english: "Atmospheric Perspective", category: "표현 기법", definition: "멀리 있는 것일수록 흐리고 푸르스름하며 채도가 낮게 그려 거리감을 나타내는 방법입니다." },
  { id: "reverse-perspective", term: "역원근법", english: "Reverse Perspective", category: "표현 기법", definition: "멀리 있는 부분을 오히려 크게 그리는 방법입니다. 책거리 같은 민화에서 보는 사람 쪽으로 펼쳐지는 느낌을 줍니다." },
  { id: "multiple-viewpoints", term: "다시점", english: "Multiple Viewpoints", category: "표현 기법", definition: "여러 방향에서 본 모습을 한 화면에 함께 그리는 방법으로, 입체주의의 핵심입니다. 우리 옛 그림에도 쓰였습니다." },
  { id: "chiaroscuro", term: "명암법(키아로스쿠로)", english: "Chiaroscuro", category: "표현 기법", definition: "빛과 그림자의 강한 대비로 입체감과 극적인 분위기를 만드는 방법입니다. 어둠을 특히 강하게 쓰면 테네브리즘이라고 합니다." },
  { id: "sfumato", term: "스푸마토", english: "Sfumato", category: "표현 기법", definition: "'연기처럼'이라는 뜻으로, 윤곽선을 그리지 않고 색을 안개처럼 부드럽게 번지게 하는 기법입니다. 레오나르도 다빈치가 즐겨 썼습니다." },
  { id: "brushstroke", term: "붓 터치", english: "Brushstroke", category: "표현 기법", definition: "붓이 지나간 자국입니다. 짧고 빠른 터치, 소용돌이치는 터치처럼 화가의 감정과 개성이 드러납니다." },
  { id: "impasto", term: "임파스토", english: "Impasto", category: "표현 기법", definition: "물감을 두껍게 덧발라 표면에 붓 자국과 입체감을 살리는 기법입니다." },
  { id: "pointillism", term: "점묘법", english: "Pointillism", category: "표현 기법", definition: "섞지 않은 순색의 작은 점을 나란히 찍어 멀리서 보면 눈에서 색이 섞여 보이게(병치 혼합) 하는 기법입니다." },
  { id: "collage", term: "콜라주", english: "Collage", category: "표현 기법", definition: "종이, 천, 사진 같은 여러 재료를 화면에 붙여 표현하는 기법입니다. 입체주의의 파피에 콜레에서 발전했습니다." },
  { id: "frottage", term: "프로타주", english: "Frottage", category: "표현 기법", definition: "나뭇결, 동전처럼 요철이 있는 물건 위에 종이를 대고 연필 등으로 문질러 무늬를 옮기는 기법입니다. 막스 에른스트가 시작했습니다." },
  { id: "decalcomanie", term: "데칼코마니", english: "Décalcomanie", category: "표현 기법", definition: "종이에 물감을 칠하고 반으로 접거나 다른 종이를 눌렀다 떼어 우연한 대칭 무늬를 얻는 기법입니다." },
  { id: "marbling", term: "마블링", english: "Marbling", category: "표현 기법", definition: "물 위에 기름 성분의 물감을 떨어뜨려 생긴 무늬를 종이에 옮기는 기법입니다." },
  { id: "dripping", term: "드리핑", english: "Dripping", category: "표현 기법", definition: "물감을 붓으로 칠하지 않고 흘리거나 뿌려 표현하는 기법입니다. 잭슨 폴록이 대표적입니다." },
  { id: "scratch", term: "스크래치", english: "Scratch", category: "표현 기법", definition: "크레파스 등을 여러 겹 칠한 뒤 뾰족한 도구로 긁어 아래 색이 드러나게 하는 기법입니다." },
  // 재료·매체
  { id: "fresco", term: "프레스코", english: "Fresco", category: "재료·매체", definition: "덜 마른 회반죽 벽에 물에 갠 안료로 그려 벽과 함께 굳게 하는 벽화 기법입니다." },
  { id: "tempera", term: "템페라", english: "Tempera", category: "재료·매체", definition: "안료를 달걀노른자 같은 접착제에 섞어 쓰는 물감입니다. 빨리 마르고 맑은 색을 냅니다." },
  { id: "oil-painting", term: "유화", english: "Oil Painting", category: "재료·매체", definition: "안료를 기름에 개어 그리는 그림입니다. 천천히 말라 덧칠과 섬세한 표현이 쉽고 색이 깊습니다. 15세기 플랑드르에서 널리 퍼졌습니다." },
  { id: "mosaic", term: "모자이크", english: "Mosaic", category: "재료·매체", definition: "돌, 유리, 타일 조각을 붙여 무늬나 그림을 만드는 기법입니다. 비잔틴 성당 장식에서 크게 발달했습니다." },
  { id: "stained-glass", term: "스테인드글라스", english: "Stained Glass", category: "재료·매체", definition: "색유리 조각을 납으로 이어 창을 만든 것입니다. 고딕 성당에서 빛으로 성경 이야기를 전했습니다." },
  { id: "woodcut", term: "목판화", english: "Woodcut", category: "재료·매체", definition: "나무판을 새기고 튀어나온 부분에 잉크를 묻혀 찍는 볼록 판화입니다. 일본의 우키요에가 대표적입니다." },
  { id: "silkscreen", term: "실크스크린", english: "Silkscreen", category: "재료·매체", definition: "망사 틀의 뚫린 부분으로 잉크를 밀어 찍는 공판화입니다. 같은 이미지를 여러 장 찍을 수 있어 팝 아트에서 즐겨 썼습니다." },
  { id: "inlay", term: "상감", english: "Inlay (Sanggam)", category: "재료·매체", definition: "그릇 표면에 무늬를 파고 그 자리에 다른 색의 흙을 메워 구워 내는 기법입니다. 고려청자의 대표 기법입니다." },
  // 한국·동양화
  { id: "yeobaek", term: "여백", english: "Void / Empty Space", category: "한국·동양화", definition: "일부러 비워 둔 화면입니다. 그리지 않은 부분이 하늘·물·안개가 되고 보는 사람의 상상을 불러옵니다." },
  { id: "ink-wash", term: "수묵화·먹의 농담", english: "Ink Wash", category: "한국·동양화", definition: "먹의 짙고 옅음(농담)과 번짐만으로 대상을 표현하는 그림입니다. 옅은 색을 더하면 수묵 담채화라고 합니다." },
  { id: "cun", term: "준법", english: "Texture Strokes (Cun)", category: "한국·동양화", definition: "산과 바위의 주름과 질감을 나타내는 붓질 방법입니다. 피마준, 부벽준 등이 있고 정선은 수직준을 즐겨 썼습니다." },
  { id: "three-distances", term: "삼원법", english: "Three Distances", category: "한국·동양화", definition: "동양화에서 공간을 나타내는 세 가지 시점입니다. 올려다보는 고원, 내려다보는 심원, 멀리 수평으로 보는 평원이 있습니다." },
  { id: "jingyeong", term: "진경산수화", english: "True-view Landscape", category: "한국·동양화", definition: "중국의 이상적인 산수가 아니라 우리 산천을 직접 보고 그 느낌을 살려 그린 산수화입니다. 겸재 정선이 완성했습니다." },
  { id: "genre-painting", term: "풍속화", english: "Genre Painting", category: "한국·동양화", definition: "사람들의 일상생활과 풍습을 그린 그림입니다. 조선 후기 김홍도와 신윤복이 대표 화가입니다." },
  { id: "literati-painting", term: "문인화", english: "Literati Painting", category: "한국·동양화", definition: "직업 화가가 아닌 선비가 그림과 글씨로 자신의 뜻과 정신을 표현한 그림입니다. 사군자가 대표적입니다." },
  { id: "minhwa", term: "민화", english: "Folk Painting", category: "한국·동양화", definition: "행복, 장수, 출세 같은 서민의 바람을 담아 생활 공간을 꾸민 실용적인 그림입니다. 작가를 알 수 없는 경우가 많습니다." },
  // 감상·비평
  { id: "feldman", term: "펠드먼의 비평 단계", english: "Feldman's Method", category: "감상·비평", definition: "작품을 서술(보이는 것 말하기) → 분석(조형 요소·원리 살피기) → 해석(의미 생각하기) → 판단(가치 평가하기) 순서로 감상하는 방법입니다.", tip: "학생이 바로 '좋다/싫다'로 판단하지 않도록 서술부터 차례로 질문하세요." },
  { id: "symbol", term: "상징", english: "Symbol", category: "감상·비평", definition: "눈에 보이는 사물로 보이지 않는 생각이나 가치를 나타내는 것입니다. 예: 소나무는 변치 않는 절개." },
  { id: "series", term: "연작", english: "Series", category: "감상·비평", definition: "같은 주제나 대상을 여러 점으로 이어서 그린 작품 묶음입니다." },
  { id: "japonisme", term: "자포니슴", english: "Japonisme", category: "감상·비평", definition: "19세기 후반 유럽에 일본 미술, 특히 우키요에가 유행해 인상주의 화가들의 구도와 색에 영향을 준 현상입니다." },
  // 현대 미술
  { id: "hot-abstraction", term: "뜨거운 추상", english: "Lyrical Abstraction", category: "현대 미술", definition: "칸딘스키처럼 자유로운 선과 색으로 감정과 내면을 표현하는 서정적인 추상입니다." },
  { id: "cold-abstraction", term: "차가운 추상", english: "Geometric Abstraction", category: "현대 미술", definition: "몬드리안처럼 수직·수평선과 기하학적 도형으로 질서와 균형을 표현하는 추상입니다." },
  { id: "action-painting", term: "액션 페인팅", english: "Action Painting", category: "현대 미술", definition: "그림을 그리는 몸의 움직임과 과정 자체를 중요하게 여긴 추상 표현주의의 한 흐름입니다." },
  { id: "readymade", term: "레디메이드", english: "Readymade", category: "현대 미술", definition: "이미 만들어진 기성품을 골라 작품으로 제시하는 것입니다. 뒤샹이 〈샘〉으로 처음 선보였습니다." },
  { id: "depaysement", term: "데페이즈망", english: "Dépaysement", category: "현대 미술", definition: "익숙한 사물을 전혀 엉뚱한 곳에 놓거나 크기를 바꿔 낯섦과 충격을 주는 초현실주의 기법입니다." },
  { id: "concept-art", term: "개념 미술", english: "Conceptual Art", category: "현대 미술", definition: "완성된 결과물보다 작가의 아이디어와 생각 자체를 작품으로 여기는 미술입니다." },
  { id: "pop-art", term: "팝 아트", english: "Pop Art", category: "현대 미술", definition: "광고, 만화, 상품 같은 대중문화 이미지를 미술의 소재와 방법으로 삼은 미술입니다. 1950~60년대 영국과 미국에서 시작되었습니다." },
  { id: "installation", term: "설치 미술", english: "Installation Art", category: "현대 미술", definition: "여러 사물과 공간 전체를 작품으로 구성해 관람자가 그 안에서 경험하게 하는 미술입니다." },
  { id: "video-art", term: "비디오 아트", english: "Video Art", category: "현대 미술", definition: "텔레비전과 영상 기술을 표현 매체로 쓰는 미술입니다. 백남준이 개척했습니다." },
];

export const artWorks = artMovements.flatMap(movement => movement.works.map(work => ({ ...work, movementId: movement.id })));
export type CatalogWork = (typeof artWorks)[number];
export const findWork = (id: string) => artWorks.find(work => work.id === id);
export const findMovement = (id: string) => artMovements.find(movement => movement.id === id);
export const findTerm = (id: string) => artTerms.find(term => term.id === id);
/** 용어를 쓰는 대표 작품들 */
export const worksForTerm = (termId: string) => artWorks.filter(work => work.terms.includes(termId));
