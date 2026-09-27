/* 국어 문법: 표준 발음법 해설에 실린 예시어와 표준 발음입니다. 장음(ː)은 표준국어대사전을 따르며, 엔진은 장음을 계산하지 않고 이 자료로만 보여 줍니다.
   input의 표시(+ ~ * ')는 phonology.ts의 설명을 따릅니다. */

export type PhonologyGroup = "coda" | "cluster" | "h" | "palatal" | "nasal" | "lateral" | "tense" | "insert" | "liaison";
export const phonologyGroups: Record<PhonologyGroup, string> = {
  coda: "받침의 발음(끝소리 규칙)", cluster: "겹받침(자음군 단순화)", h: "ㅎ의 발음(축약·탈락)", palatal: "구개음화",
  nasal: "비음화·ㄹ의 비음화", lateral: "유음화", tense: "된소리되기", insert: "ㄴ 첨가·사잇소리", liaison: "연음",
};
export type PhonologyWord = { word: string; input: string; standard: string; allowed?: string; group: PhonologyGroup; note?: string };

const w = (group: PhonologyGroup, input: string, standard: string, extra: { allowed?: string; note?: string } = {}): PhonologyWord =>
  ({ word: input.replace(/[+~*'-]/g, ""), input, standard, group, ...extra });

export const PHONOLOGY_WORDS: PhonologyWord[] = [
  // 제9항 받침의 대표음
  w("coda", "부엌", "부억"), w("coda", "옷", "옫"), w("coda", "낮", "낟"), w("coda", "꽃", "꼳"), w("coda", "밭", "받"), w("coda", "앞", "압"),
  w("coda", "닦~다", "닥따"), w("coda", "있~다", "읻따"), w("coda", "덮~다", "덥따"),
  // 제10·11항 겹받침
  w("cluster", "넋", "넉"), w("cluster", "넋과", "넉꽈"), w("cluster", "앉~다", "안따"), w("cluster", "여덟", "여덜"), w("cluster", "넓~다", "널따"),
  w("cluster", "핥~다", "할따"), w("cluster", "값", "갑"), w("cluster", "없~다", "업ː따"), w("cluster", "밟~다", "밥ː따", { note: "밟-은 자음 앞에서 [밥]" }),
  w("cluster", "밟~는", "밤ː는"), w("cluster", "넓죽하다", "넙쭈카다", { note: "넓죽하다의 넓-은 [넙]" }), w("cluster", "닭", "닥"), w("cluster", "흙과", "흑꽈"),
  w("cluster", "맑~다", "막따"), w("cluster", "늙~지", "늑찌"), w("cluster", "삶", "삼ː"), w("cluster", "젊~다", "점ː따"), w("cluster", "읊~고", "읍꼬"),
  w("cluster", "맑~게", "말께", { note: "용언 어간 ㄺ은 ㄱ 앞에서 [ㄹ]" }), w("cluster", "묽~고", "물꼬"), w("cluster", "읽~고", "일꼬"), w("cluster", "읽~다", "익따"),
  // 제12항 ㅎ의 발음
  w("h", "놓~고", "노코"), w("h", "좋~던", "조ː턴"), w("h", "쌓~지", "싸치"), w("h", "많~고", "만ː코"), w("h", "않~던", "안턴"), w("h", "닳~지", "달치"),
  w("h", "각하", "가카"), w("h", "먹히다", "머키다"), w("h", "밝히다", "발키다"), w("h", "맏+형", "마텽"), w("h", "좁히다", "조피다"), w("h", "넓히다", "널피다"),
  w("h", "꽂히다", "꼬치다"), w("h", "앉히다", "안치다"), w("h", "옷 한 벌", "오탄벌"), w("h", "입학", "이팍"),
  w("h", "닿~소", "다ː쏘"), w("h", "많~소", "만ː쏘"), w("h", "싫~소", "실쏘"), w("h", "놓~는", "논는"), w("h", "쌓~네", "싼네"),
  w("h", "않~네", "안네"), w("h", "뚫~네", "뚤레"), w("h", "닳~는", "달른"),
  w("h", "낳~은", "나은"), w("h", "놓~아", "노아"), w("h", "쌓이다", "싸이다"), w("h", "많~아", "마ː나"), w("h", "않~은", "아는"), w("h", "싫~어도", "시러도"),
  // 제17항 구개음화
  w("palatal", "곧이듣다", "고지듣따"), w("palatal", "굳이", "구지"), w("palatal", "미닫이", "미ː다지"), w("palatal", "땀+받이", "땀바지"), w("palatal", "밭이", "바치"),
  w("palatal", "벼+훑이", "벼훌치"), w("palatal", "굳히다", "구치다"), w("palatal", "닫히다", "다치다"), w("palatal", "묻히다", "무치다"), w("palatal", "같이", "가치"),
  w("palatal", "해+돋이", "해도지"), w("palatal", "맏이", "마지"),
  // 제18·19항 비음화
  w("nasal", "먹~는", "멍는"), w("nasal", "국물", "궁물"), w("nasal", "깎~는", "깡는"), w("nasal", "흙만", "흥만"), w("nasal", "닫~는", "단는"), w("nasal", "짓~는", "진ː는"),
  w("nasal", "옷맵시", "온맵씨"), w("nasal", "있~는", "인는"), w("nasal", "맞~는", "만는"), w("nasal", "꽃망울", "꼰망울"), w("nasal", "붙~는", "분는"), w("nasal", "잡~는", "잠는"),
  w("nasal", "밥물", "밤물"), w("nasal", "앞마당", "암마당"), w("nasal", "읊~는", "음는"), w("nasal", "없~는", "엄ː는"), w("nasal", "책 넣는다", "챙넌는다"),
  w("nasal", "담력", "담ː녁"), w("nasal", "침략", "침냑"), w("nasal", "강릉", "강능"), w("nasal", "항로", "항ː노"), w("nasal", "대통령", "대ː통녕"),
  w("nasal", "막론", "망논"), w("nasal", "석류", "성뉴"), w("nasal", "협력", "혐녁"), w("nasal", "법리", "범니"), w("nasal", "백리", "뱅니"),
  // 제20항 유음화
  w("lateral", "난로", "날ː로"), w("lateral", "신라", "실라"), w("lateral", "천리", "철리"), w("lateral", "광한루", "광ː할루"), w("lateral", "대관령", "대ː괄령"),
  w("lateral", "칼날", "칼랄"), w("lateral", "물난리", "물랄리"), w("lateral", "줄넘~기", "줄럼끼"), w("lateral", "할는지", "할른지"),
  w("lateral", "의견란", "의ː견난", { note: "ㄴ + ㄹ을 [ㄴㄴ]으로 발음하는 낱말(제20항 다만)" }), w("lateral", "생산량", "생산냥"), w("lateral", "결*단력", "결딴녁"),
  w("lateral", "상견례", "상견녜"), w("lateral", "입원료", "이붠뇨"),
  // 제23~28항 된소리되기·사잇소리
  w("tense", "국밥", "국빱"), w("tense", "깎~다", "깍따"), w("tense", "넋+받이", "넉빠지"), w("tense", "닭장", "닥짱"), w("tense", "옷고름", "옫꼬름"), w("tense", "있~던", "읻떤"),
  w("tense", "꽃다발", "꼳따발"), w("tense", "낯설다", "낟썰다"), w("tense", "밭+갈이", "받까리"), w("tense", "덮개", "덥깨"), w("tense", "옆집", "엽찝"), w("tense", "값지다", "갑찌다"),
  w("tense", "신~고", "신ː꼬"), w("tense", "껴안~다", "껴안따"), w("tense", "앉~고", "안꼬"), w("tense", "삼~고", "삼ː꼬"), w("tense", "더듬~지", "더듬찌"), w("tense", "닮~고", "담ː꼬"),
  w("tense", "안기다", "안기다", { note: "피동·사동 접미사 -기- 앞은 된소리가 나지 않아요" }), w("tense", "감기다", "감기다"), w("tense", "옮기다", "옴기다"),
  w("tense", "넓~게", "널께"), w("tense", "훑~소", "훌쏘"), w("tense", "떫~지", "떨ː찌"),
  w("tense", "갈*등", "갈뜽", { note: "한자어 ㄹ 받침 뒤 ㄷ·ㅅ·ㅈ(제26항)" }), w("tense", "발*동", "발똥"), w("tense", "말*살", "말쌀"), w("tense", "일*시", "일씨"), w("tense", "물*질", "물찔"), w("tense", "발*전", "발쩐"),
  w("tense", "할 *것을", "할꺼슬", { note: "관형사형 -(으)ㄹ 뒤(제27항)" }), w("tense", "갈 *데가", "갈떼가"), w("tense", "할 *수는", "할쑤는"), w("tense", "만날 *사람", "만날싸람"),
  // 제28~30항 ㄴ 첨가·사잇소리
  w("insert", "문+*고리", "문꼬리", { note: "표기에 사이시옷이 없는 사잇소리(제28항)" }), w("insert", "눈+*동자", "눈똥자"), w("insert", "길+*가", "길까"), w("insert", "발+*바닥", "발빠닥"),
  w("insert", "술+*잔", "술짠"), w("insert", "바람+*결", "바람껼"), w("insert", "그믐+*달", "그믐딸"), w("insert", "강+*가", "강까"), w("insert", "등+*불", "등뿔"),
  w("insert", "솜+이불", "솜ː니불"), w("insert", "홑+이불", "혼니불"), w("insert", "막+일", "망닐"), w("insert", "맨+입", "맨닙"), w("insert", "꽃+잎", "꼰닙"),
  w("insert", "내복+약", "내ː봉냑"), w("insert", "한+여름", "한녀름"), w("insert", "신+여성", "신녀성"), w("insert", "색+연필", "생년필"), w("insert", "직행+열차", "지캥녈차"),
  w("insert", "늑막+염", "능망념"), w("insert", "콩+엿", "콩녇"), w("insert", "담+요", "담ː뇨"), w("insert", "눈+요기", "눈뇨기"), w("insert", "영업+용", "영엄뇽"), w("insert", "식용+유", "시굥뉴"),
  w("insert", "들+일", "들ː릴", { note: "ㄹ 받침 뒤에 덧난 ㄴ은 [ㄹ]로(제29항 붙임 1)" }), w("insert", "솔+잎", "솔립"), w("insert", "설+익다", "설릭따"), w("insert", "물+약", "물략"),
  w("insert", "서울+역", "서울력"), w("insert", "물+엿", "물렫"), w("insert", "휘발+유", "휘발류"), w("insert", "옷+입다", "온닙따"), w("insert", "할+일", "할릴"),
  w("insert", "냇'가", "내ː까", { allowed: "낻ː까", note: "사이시옷 뒤 된소리만 발음하는 것이 원칙, [ㄷ]을 발음하는 것도 허용(제30항)" }), w("insert", "콧'등", "코뜽", { allowed: "콛뜽" }),
  w("insert", "깃'발", "기빨", { allowed: "긷빨" }), w("insert", "햇'살", "해쌀", { allowed: "핻쌀" }), w("insert", "콧'날", "콘날"), w("insert", "아랫'니", "아랜니"),
  w("insert", "툇'마루", "퇸ː마루"), w("insert", "베갯'잇", "베갠닏"), w("insert", "깻'잎", "깬닙"), w("insert", "나뭇'잎", "나문닙"),
  // 제13~15항 연음
  w("liaison", "깎아", "까까"), w("liaison", "옷이", "오시"), w("liaison", "있어", "이써"), w("liaison", "꽃을", "꼬츨"), w("liaison", "밭에", "바테"), w("liaison", "앞으로", "아프로"),
  w("liaison", "넋이", "넉씨"), w("liaison", "앉아", "안자"), w("liaison", "닭을", "달글"), w("liaison", "젊어", "절머"), w("liaison", "핥아", "할타"), w("liaison", "값을", "갑쓸"),
  w("liaison", "없어", "업ː써"), w("liaison", "밭 아래", "바다래", { note: "뒤가 실질 형태소면 대표음으로 바꾼 뒤 연음(제15항)" }), w("liaison", "옷 안", "오단"),
  w("liaison", "겉+옷", "거돋"), w("liaison", "헛+웃음", "허두슴"), w("liaison", "꽃 위", "꼬뒤"), w("liaison", "넋 없다", "너겁따"), w("liaison", "닭 앞에", "다가페"),
  w("liaison", "값+어치", "가버치"), w("liaison", "맛+없다", "마덥따"),
];
