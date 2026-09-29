/* 영어: Language in Use·Language Focus 문법 학습지입니다. 문법 항목마다 규칙 요약과 직접 쓴 예문 문제(고르기·빈칸·틀린 곳 고치기·바꿔 쓰기)를 둡니다.
   예문은 정답이 하나로 정해지는 문장만 골랐습니다. 빈칸 문제는 괄호 속 원형이나 첫 글자로 답을 좁힙니다. */
import { blankLine, escapeHtml, problem, seededRandom, shuffled, type SheetProblem, type SheetSection } from "./sheet";

/** 고르기: 문장 안의 ( A / B ) 가운데 answer가 정답 */
export type ChooseItem = { text: string; answer: string; note?: string };
/** 빈칸: 문장 안의 ____ 자리에 answer */
export type FillItem = { text: string; answer: string; note?: string };
/** 고치기: 문장 안의 wrong(한 번만 나옴)을 right로 */
export type FixItem = { text: string; wrong: string; right: string; note?: string };
/** 바꿔 쓰기: 지시에 따라 text를 바꾼 예시 답 */
export type RewriteItem = { direction: string; text: string; answer: string };
export type GrammarTopic = { key: string; name: string; rule: string[]; choose: ChooseItem[]; fill: FillItem[]; fix: FixItem[]; rewrite: RewriteItem[] };

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    key: "perfect", name: "현재완료와 과거",
    rule: ["현재완료(have/has + p.p.)는 과거의 일이 지금과 이어질 때 써요(경험·계속·완료·결과).", "yesterday, last ~, ~ ago, in 2020, when ~처럼 분명한 과거 시점과는 과거 시제를 써요.", "since + 시작 시점, for + 기간"],
    choose: [
      { text: "I (have lived / lived) in Daejeon since 2018.", answer: "have lived", note: "since 2018부터 지금까지 계속" },
      { text: "She (has visited / visited) Jeju Island last summer.", answer: "visited", note: "last summer는 분명한 과거 시점" },
      { text: "We have known each other (for / since) ten years.", answer: "for", note: "for + 기간" },
      { text: "He has worked at the bank (for / since) he graduated.", answer: "since", note: "since + 시작 시점(절)" },
      { text: "When (have you finished / did you finish) the report?", answer: "did you finish", note: "When으로 묻는 의문문에는 현재완료를 쓰지 않아요." },
      { text: "Tom (has lost / lost) his wallet two days ago.", answer: "lost", note: "~ ago는 과거 시제" },
      { text: "They (have been / were) friends since they were children.", answer: "have been", note: "어릴 때부터 지금까지 계속" },
      { text: "I (have just finished / just finish) my homework, so I can go out now.", answer: "have just finished", note: "완료(just)" },
    ],
    fill: [
      { text: "My brother ____ (break) his leg last week.", answer: "broke" },
      { text: "I ____ (read) this book three times so far.", answer: "have read", note: "경험(so far)" },
      { text: "The movie ____ (start) ten minutes ago.", answer: "started" },
      { text: "She ____ (be) to London twice.", answer: "has been", note: "have been to: ~에 가 본 적이 있다" },
    ],
    fix: [
      { text: "I have seen him yesterday.", wrong: "have seen", right: "saw", note: "yesterday는 과거 시제" },
      { text: "She has lived here since three years.", wrong: "since", right: "for", note: "기간 앞에는 for" },
      { text: "He has finished the work two hours ago.", wrong: "has finished", right: "finished", note: "~ ago는 과거 시제" },
    ],
    rewrite: [
      { direction: "현재완료를 써서 한 문장으로 바꾸시오.", text: "I started learning the guitar two years ago. I am still learning it.", answer: "I have learned[have been learning] the guitar for two years." },
      { direction: "현재완료를 써서 한 문장으로 바꾸시오.", text: "He lost his phone. He doesn't have it now.", answer: "He has lost his phone." },
    ],
  },
  {
    key: "infinitive", name: "to부정사와 동명사",
    rule: ["동명사만 목적어로: enjoy, finish, mind, avoid, give up, keep, practice, consider, quit", "to부정사만 목적어로: want, hope, wish, decide, plan, promise, expect, agree, refuse", "뜻이 달라지는 동사: remember·forget + to부정사(앞으로 할 일) / + -ing(이미 한 일), stop + -ing(하던 것을 멈추다) / + to부정사(~하려고 멈추다), try + to부정사(애쓰다) / + -ing(시험 삼아 해 보다)"],
    choose: [
      { text: "Would you mind (opening / to open) the window?", answer: "opening", note: "mind + -ing" },
      { text: "She decided (studying / to study) abroad.", answer: "to study", note: "decide + to부정사" },
      { text: "They finished (cleaning / to clean) the classroom.", answer: "cleaning", note: "finish + -ing" },
      { text: "I hope (seeing / to see) you again soon.", answer: "to see", note: "hope + to부정사" },
      { text: "He gave up (smoking / to smoke) last year.", answer: "smoking", note: "give up + -ing" },
      { text: "Remember (turning / to turn) off the lights when you leave.", answer: "to turn", note: "앞으로 할 일" },
      { text: "I remember (meeting / to meet) her at the party last year.", answer: "meeting", note: "이미 한 일" },
      { text: "He stopped (to buy / buying) some water because he was thirsty.", answer: "to buy", note: "물을 사려고 멈추었다(목적)" },
    ],
    fill: [
      { text: "My sister enjoys ____ (draw) cartoons.", answer: "drawing" },
      { text: "They promised ____ (help) us with the project.", answer: "to help" },
      { text: "Avoid ____ (use) your phone while walking.", answer: "using" },
      { text: "I forgot ____ (lock) the door, so it was open when I came back.", answer: "to lock", note: "잠가야 할 일을 잊었다" },
    ],
    fix: [
      { text: "I enjoy to play badminton with my friends.", wrong: "to play", right: "playing", note: "enjoy + -ing" },
      { text: "She wants traveling around the world.", wrong: "traveling", right: "to travel", note: "want + to부정사" },
      { text: "Don't forget calling your mom tonight.", wrong: "calling", right: "to call", note: "앞으로 할 일" },
    ],
    rewrite: [
      { direction: "동명사 주어로 바꾸시오.", text: "To exercise regularly is good for your health.", answer: "Exercising regularly is good for your health." },
      { direction: "가주어 It을 써서 바꾸시오.", text: "To learn a foreign language is not easy.", answer: "It is not easy to learn a foreign language." },
    ],
  },
  {
    key: "participle", name: "분사와 분사구문",
    rule: ["현재분사(-ing)는 능동·진행(~하는), 과거분사(p.p.)는 수동·완료(~된)", "감정을 일으키면 -ing(exciting), 감정을 느끼면 p.p.(excited)", "분사구문: 접속사와 (주절과 같은) 주어를 빼고 동사를 -ing로 바꿔요. 수동이면 (Being) p.p."],
    choose: [
      { text: "The movie was very (boring / bored).", answer: "boring", note: "영화가 지루함을 일으킴" },
      { text: "I was (surprising / surprised) at the news.", answer: "surprised", note: "내가 놀람을 느낌" },
      { text: "Look at the (sleeping / slept) baby.", answer: "sleeping", note: "자고 있는(능동·진행)" },
      { text: "This is a book (writing / written) in simple English.", answer: "written", note: "쓰인(수동)" },
      { text: "The girl (singing / sung) on the stage is my cousin.", answer: "singing", note: "노래하고 있는" },
      { text: "(Feeling / Felt) tired, I went to bed early.", answer: "Feeling", note: "내가 피곤함을 느끼다(능동)" },
      { text: "(Seeing / Seen) from the sky, the island looks like a heart.", answer: "Seen", note: "섬이 보이는 것(수동)" },
      { text: "The (broken / breaking) window was fixed yesterday.", answer: "broken", note: "깨진(수동·완료)" },
    ],
    fill: [
      { text: "The students were ____ (excite) about the field trip.", answer: "excited" },
      { text: "The ground was covered with ____ (fall) leaves that had dropped overnight.", answer: "fallen", note: "밤새 떨어진 잎(완료·수동의 과거분사)" },
      { text: "The news was ____ (shock) to everyone.", answer: "shocking", note: "충격을 주는" },
      { text: "____ (leave) home early, she caught the first bus.", answer: "Leaving" },
    ],
    fix: [
      { text: "The game was so excited that we cheered loudly.", wrong: "excited", right: "exciting", note: "경기가 흥분을 일으킴" },
      { text: "The letter writing by my grandfather is very old.", wrong: "writing", right: "written", note: "쓰인 편지(수동)" },
      { text: "Walked down the street, I met an old friend.", wrong: "Walked", right: "Walking", note: "내가 걷다(능동)" },
    ],
    rewrite: [
      { direction: "분사구문으로 바꾸시오.", text: "When he heard the news, he started to cry.", answer: "Hearing the news, he started to cry." },
      { direction: "분사구문으로 바꾸시오.", text: "Because I was sick, I stayed at home.", answer: "(Being) Sick, I stayed at home." },
    ],
  },
  {
    key: "relative", name: "관계대명사와 관계부사",
    rule: ["who(사람), which(사물·동물), that(사람·사물), whose(소유), what(= the thing(s) which, 앞에 선행사 없음)", "관계부사: where(장소), when(시간), why(이유), how(방법, the way와 함께 쓰지 않음)", "콤마 뒤(계속적 용법)와 전치사 바로 뒤에는 that을 쓰지 않아요."],
    choose: [
      { text: "I have a friend (who / which) lives in Canada.", answer: "who", note: "선행사가 사람" },
      { text: "This is the bag (who / which) I bought yesterday.", answer: "which", note: "선행사가 사물" },
      { text: "I met a girl (whose / who) father is a famous chef.", answer: "whose", note: "그 소녀의 아버지(소유)" },
      { text: "(What / That) I need now is a good rest.", answer: "What", note: "선행사가 없음(= The thing which)" },
      { text: "This is the house (where / which) my grandmother was born.", answer: "where", note: "장소 + 완전한 문장" },
      { text: "I remember the day (when / where) we first met.", answer: "when", note: "시간" },
      { text: "Tell me the reason (why / how) you were late.", answer: "why", note: "이유" },
      { text: "Jisu, (who / that) is my best friend, lives next door.", answer: "who", note: "콤마 뒤에는 that을 쓰지 않아요." },
    ],
    fill: [
      { text: "The boy ____ bike was stolen called the police. (소유격)", answer: "whose" },
      { text: "Busan is the city ____ I spent my childhood. (관계부사)", answer: "where" },
      { text: "I can't believe ____ you just said. (선행사 없음)", answer: "what" },
      { text: "That was the moment ____ I decided to become a teacher. (관계부사)", answer: "when" },
    ],
    fix: [
      { text: "This is the smartphone who I bought last week.", wrong: "who", right: "which(또는 that)", note: "선행사가 사물" },
      { text: "The thing what I want most is a new laptop.", wrong: "what", right: "that(또는 which)", note: "선행사(The thing)가 있으면 what을 쓰지 않아요." },
      { text: "This is the way how he solved the problem.", wrong: "the way how", right: "the way(또는 how)", note: "the way와 how는 함께 쓰지 않아요." },
    ],
    rewrite: [
      { direction: "관계대명사를 써서 한 문장으로 쓰시오.", text: "I know a woman. She speaks five languages.", answer: "I know a woman who[that] speaks five languages." },
      { direction: "관계부사를 써서 한 문장으로 쓰시오.", text: "This is the park. We played soccer there.", answer: "This is the park where we played soccer." },
    ],
  },
  {
    key: "passive", name: "수동태",
    rule: ["be + p.p. (+ by 행위자). 시제는 be동사로 나타내요: is·was·will be·has been·is being + p.p.", "조동사가 있으면 조동사 + be + p.p.", "happen, appear, disappear, arrive처럼 목적어가 없는 동사는 수동태로 쓰지 않아요.", "be interested in, be made of(재료가 그대로) / be made from(재료가 변함)"],
    choose: [
      { text: "The Mona Lisa (painted / was painted) by Leonardo da Vinci.", answer: "was painted" },
      { text: "English (speaks / is spoken) in many countries.", answer: "is spoken" },
      { text: "The accident (happened / was happened) last night.", answer: "happened", note: "happen은 수동태로 쓰지 않아요." },
      { text: "The new bridge will (build / be built) next year.", answer: "be built", note: "조동사 + be + p.p." },
      { text: "I am interested (in / at) history.", answer: "in" },
      { text: "The room is (cleaning / being cleaned) right now.", answer: "being cleaned", note: "진행형 수동태" },
      { text: "Cheese is made (from / of) milk.", answer: "from", note: "재료(우유)가 변함" },
      { text: "This desk is made (of / from) wood.", answer: "of", note: "재료(나무)가 그대로 보임" },
    ],
    fill: [
      { text: "The letter ____ (send) yesterday.", answer: "was sent" },
      { text: "The problem can ____ (solve) easily.", answer: "be solved" },
      { text: "Hangeul ____ (create) by King Sejong.", answer: "was created" },
      { text: "The results ____ (announce) next Monday.", answer: "will be announced" },
    ],
    fix: [
      { text: "The book was wrote by a famous author.", wrong: "wrote", right: "written", note: "be + p.p." },
      { text: "A strange thing was happened at school.", wrong: "was happened", right: "happened", note: "happen은 수동태로 쓰지 않아요." },
      { text: "The song loves by many young people.", wrong: "loves", right: "is loved", note: "노래가 사랑받다(수동)" },
    ],
    rewrite: [
      { direction: "수동태로 바꾸시오.", text: "Many tourists visit this museum.", answer: "This museum is visited by many tourists." },
      { direction: "수동태로 바꾸시오.", text: "Somebody stole my bike last night.", answer: "My bike was stolen last night." },
    ],
  },
  {
    key: "subjunctive", name: "가정법",
    rule: ["가정법 과거(현재 사실과 반대): If + 주어 + 과거형(be는 were), 주어 + would/could/might + 동사원형", "가정법 과거완료(과거 사실과 반대): If + 주어 + had p.p., 주어 + would/could/might + have p.p.", "I wish + 과거형(지금 이루기 어려운 바람) / + had p.p.(지난 일에 대한 아쉬움)", "as if + 과거형(마치 ~인 것처럼) / + had p.p.(마치 ~였던 것처럼)"],
    choose: [
      { text: "If I (were / am) you, I would apologize to her.", answer: "were" },
      { text: "If I had enough money, I (will / would) buy a new laptop.", answer: "would" },
      { text: "If she had studied harder, she (would pass / would have passed) the exam.", answer: "would have passed", note: "가정법 과거완료" },
      { text: "I wish I (can / could) speak French.", answer: "could" },
      { text: "I wish I (had gone / went) to the concert last night.", answer: "had gone", note: "지난 일(last night)에 대한 아쉬움" },
      { text: "If it (had not rained / did not rain) yesterday, we would have gone hiking.", answer: "had not rained" },
      { text: "If I (knew / had known) her phone number now, I would call her.", answer: "knew", note: "지금(now) 사실과 반대" },
    ],
    fill: [
      { text: "If I ____ (have) a car, I could drive you home.", answer: "had" },
      { text: "If you had left earlier, you ____ (not miss) the bus.", answer: "would not have missed" },
      { text: "I wish it ____ (be) sunny today.", answer: "were[was]", note: "가정법 과거는 were가 원칙, 구어에서는 was도 씀" },
      { text: "She looked as if she ____ (see) a ghost.", answer: "had seen", note: "본 것이 먼저 일어난 일" },
    ],
    fix: [
      { text: "If I am a bird, I could fly to you.", wrong: "am", right: "were", note: "가정법 과거" },
      { text: "If he had come, he would enjoy the party.", wrong: "would enjoy", right: "would have enjoyed", note: "가정법 과거완료" },
      { text: "I wish I have a younger sister.", wrong: "have", right: "had", note: "I wish + 과거형" },
    ],
    rewrite: [
      { direction: "가정법 문장으로 바꾸시오.", text: "As I don't have time, I can't help you.", answer: "If I had time, I could help you." },
      { direction: "I wish로 시작하는 문장으로 바꾸시오.", text: "I'm sorry that I didn't bring my umbrella.", answer: "I wish I had brought my umbrella." },
    ],
  },
  {
    key: "comparison", name: "비교 구문",
    rule: ["as + 원급 + as(~만큼 …한), not as[so] + 원급 + as(~만큼 …하지 않은)", "비교급 + than. 비교급 강조: much, even, still, far, a lot (very는 쓰지 않아요)", "the + 비교급 ~, the + 비교급 …(~할수록 더 …하다)", "the + 최상급 (+ in/of ~), 비교급 + than any other + 단수 명사"],
    choose: [
      { text: "This box is (heavy / heavier) than that one.", answer: "heavier" },
      { text: "My room is as (large / larger) as yours.", answer: "large", note: "as + 원급 + as" },
      { text: "The (more / most) you practice, the better you get.", answer: "more", note: "the + 비교급, the + 비교급" },
      { text: "This is (much / very) better than the old one.", answer: "much", note: "비교급은 much로 강조" },
      { text: "Seoul is bigger than any other (city / cities) in Korea.", answer: "city", note: "any other + 단수 명사" },
      { text: "She is the (smarter / smartest) student in our class.", answer: "smartest" },
      { text: "The weather today is (worse / worst) than it was yesterday.", answer: "worse", note: "bad - worse - worst" },
    ],
    fill: [
      { text: "Health is ____ (important) than money.", answer: "more important" },
      { text: "The ____ (hot) it gets, the more water we drink.", answer: "hotter" },
      { text: "Mt. Everest is the ____ (high) mountain in the world.", answer: "highest" },
      { text: "This question is not as ____ (easy) as it looks.", answer: "easy" },
    ],
    fix: [
      { text: "This book is more interesting as that one.", wrong: "as", right: "than", note: "비교급 + than" },
      { text: "He runs very faster than his brother.", wrong: "very", right: "much(또는 even, far, a lot)", note: "very는 비교급을 강조하지 않아요." },
      { text: "She is the most tallest girl in the class.", wrong: "most tallest", right: "tallest", note: "최상급을 겹쳐 쓰지 않아요." },
    ],
    rewrite: [
      { direction: "not as ~ as를 써서 같은 뜻으로 바꾸시오.", text: "Tom is taller than Jake.", answer: "Jake is not as[so] tall as Tom." },
      { direction: "‘the + 비교급, the + 비교급’으로 바꾸시오.", text: "If you read more books, you will know more.", answer: "The more books you read, the more you will know." },
    ],
  },
  {
    key: "modalPerfect", name: "조동사 + have p.p.",
    rule: ["must have p.p.: ~했음에 틀림없다", "can't[cannot] have p.p.: ~했을 리가 없다", "may[might] have p.p.: ~했을지도 모른다", "should have p.p.: ~했어야 했는데(하지 않았다) / shouldn't have p.p.: ~하지 말았어야 했는데", "could have p.p.: ~할 수도 있었는데(하지 않았다)"],
    choose: [
      { text: "The ground is wet. It (must have rained / should have rained) last night.", answer: "must have rained", note: "강한 추측" },
      { text: "She (can't have seen / must have seen) me. I was in another city then.", answer: "can't have seen", note: "그때 다른 도시에 있었으니 봤을 리 없다" },
      { text: "I failed the test. I (should have studied / must have studied) harder.", answer: "should have studied", note: "후회" },
      { text: "He's not answering. He (may have fallen / should have fallen) asleep.", answer: "may have fallen", note: "약한 추측" },
      { text: "You (shouldn't have eaten / can't have eaten) so much. Now you have a stomachache.", answer: "shouldn't have eaten", note: "하지 말았어야 했는데" },
      { text: "We (could have won / must have won) the game, but we made too many mistakes.", answer: "could have won", note: "이길 수도 있었는데(지고 말았다)" },
    ],
    fill: [
      { text: "You ____ (tell) me earlier. (말했어야 했는데)", answer: "should have told" },
      { text: "Minsu ____ (leave) already. His bag is gone. (떠났음에 틀림없다)", answer: "must have left" },
      { text: "She ____ (forget) the meeting. She never forgets anything. (잊었을 리가 없다)", answer: "can't[cannot] have forgotten" },
      { text: "They ____ (take) a different road. (택했을지도 모른다)", answer: "may[might] have taken" },
    ],
    fix: [
      { text: "I should have call her yesterday.", wrong: "call", right: "called", note: "have + p.p." },
      { text: "He can't has finished the work so soon.", wrong: "has", right: "have", note: "조동사 뒤에는 have" },
      { text: "Jina looks very tired. She must has stayed up late.", wrong: "has", right: "have", note: "조동사 뒤에는 have" },
    ],
    rewrite: [
      { direction: "조동사 + have p.p.를 써서 바꾸시오.", text: "I'm sorry that I didn't take your advice.", answer: "I should have taken your advice." },
      { direction: "조동사 + have p.p.를 써서 바꾸시오.", text: "It is certain that he broke the vase.", answer: "He must have broken the vase." },
    ],
  },
  {
    key: "emphasis", name: "강조와 도치",
    rule: ["It is[was] + 강조할 말 + that ~: 주어·목적어·부사(구)를 강조해요.", "동사 강조: do/does/did + 동사원형", "부정어(Never, Little, Hardly, Not only 등)가 문장 앞에 오면 조동사 + 주어 + 동사 순서로 바뀌어요.", "장소·방향 부사구가 앞에 오면 동사 + 주어(주어가 대명사면 바꾸지 않아요).", "So + 조동사 + 주어(~도 그렇다), Neither + 조동사 + 주어(~도 그렇지 않다)"],
    choose: [
      { text: "It was Minji (that / what) broke the window.", answer: "that", note: "It was ~ that 강조 구문" },
      { text: "I (do / does) love this song.", answer: "do", note: "동사 강조" },
      { text: "Never (I have / have I) seen such a beautiful sunset.", answer: "have I", note: "부정어 도치" },
      { text: "Little (did he know / he knew) that his life would change.", answer: "did he know", note: "부정어 도치" },
      { text: "A: I like pizza. B: So (do I / I do).", answer: "do I", note: "So + 조동사 + 주어" },
      { text: "She didn't go to the party, and (neither did I / so did I).", answer: "neither did I", note: "부정문에 동의" },
      { text: "Here (comes the bus / the bus comes).", answer: "comes the bus", note: "Here + 동사 + 명사 주어" },
    ],
    fill: [
      { text: "He ____ (do) finish his homework, although it was late.", answer: "did", note: "과거 동사 강조" },
      { text: "Not only ____ she sing well, but she also dances well.", answer: "does" },
      { text: "It was in 2010 ____ we moved to Seoul.", answer: "that" },
      { text: "On the hill ____ (stand) an old castle.", answer: "stands", note: "주어는 an old castle(단수)" },
    ],
    fix: [
      { text: "Never I have eaten such delicious food.", wrong: "I have", right: "have I", note: "부정어 도치" },
      { text: "It was my brother which fixed my computer.", wrong: "which", right: "that(또는 who)", note: "강조하는 말이 사람" },
      { text: "Hardly I could believe my eyes.", wrong: "I could", right: "could I", note: "부정어 도치" },
    ],
    rewrite: [
      { direction: "It ~ that 구문으로 at the library를 강조하시오.", text: "I met Jihun at the library.", answer: "It was at the library that I met Jihun." },
      { direction: "Never로 시작하는 문장으로 바꾸시오.", text: "I have never heard such a strange story.", answer: "Never have I heard such a strange story." },
    ],
  },
  {
    key: "conjPrep", name: "접속사와 전치사",
    rule: ["접속사 + 주어 + 동사 / 전치사 + 명사(구)", "because(접속사) — because of(전치사)", "although, though(접속사) — despite, in spite of(전치사)", "while(접속사) — during(전치사)"],
    choose: [
      { text: "We stayed home (because / because of) the heavy rain.", answer: "because of", note: "뒤에 명사구" },
      { text: "(Although / Despite) it was cold, we went swimming.", answer: "Although", note: "뒤에 주어 + 동사" },
      { text: "(Although / Despite) the cold weather, we went swimming.", answer: "Despite", note: "뒤에 명사구" },
      { text: "I fell asleep (during / while) the movie.", answer: "during", note: "뒤에 명사" },
      { text: "Someone called you (during / while) you were out.", answer: "while", note: "뒤에 주어 + 동사" },
      { text: "He couldn't sleep (because / because of) he drank too much coffee.", answer: "because", note: "뒤에 주어 + 동사" },
      { text: "(In spite of / Though) his injury, he finished the race.", answer: "In spite of", note: "뒤에 명사구" },
    ],
    fill: [
      { text: "She went to work d____ her cold.", answer: "despite" },
      { text: "The flight was delayed b____ of the storm.", answer: "because" },
      { text: "Please don't talk w____ I'm studying.", answer: "while" },
      { text: "A____ he is young, he is very wise.", answer: "Although" },
    ],
    fix: [
      { text: "Despite it was raining, they played soccer.", wrong: "Despite", right: "Although(또는 Though)", note: "뒤에 주어 + 동사" },
      { text: "I met many people while my trip to Europe.", wrong: "while", right: "during", note: "뒤에 명사구" },
      { text: "The game was canceled because the storm.", wrong: "because", right: "because of", note: "뒤에 명사구" },
    ],
    rewrite: [
      { direction: "because of를 써서 바꾸시오.", text: "Because it was noisy, I couldn't hear you.", answer: "Because of the noise, I couldn't hear you." },
      { direction: "although를 써서 바꾸시오.", text: "Despite his hard work, he failed.", answer: "Although he worked hard, he failed." },
    ],
  },
  {
    key: "nounClause", name: "명사절(that·whether·if·간접 의문문)",
    rule: ["that절: ~라는 것(주어·목적어·보어). 주어로 쓸 때는 보통 가주어 It ~ that", "whether/if: ~인지 (아닌지). if는 문장 맨 앞 주어 자리·전치사 뒤·or not 바로 앞에 쓰지 않아요.", "간접 의문문: 의문사 + 주어 + 동사 순서"],
    choose: [
      { text: "I think (that / what) he is honest.", answer: "that" },
      { text: "I wonder (if / that) she will come.", answer: "if", note: "~인지 궁금하다" },
      { text: "(Whether / If) we win or lose doesn't matter.", answer: "Whether", note: "주어 자리에는 whether" },
      { text: "Do you know where (he lives / does he live)?", answer: "he lives", note: "간접 의문문 어순" },
      { text: "Can you tell me what time (it is / is it)?", answer: "it is", note: "간접 의문문 어순" },
      { text: "It is true (that / whether) the Earth goes around the Sun.", answer: "that" },
      { text: "It depends on (whether / if) we have enough money.", answer: "whether", note: "전치사 뒤에는 whether" },
    ],
    fill: [
      { text: "I'm not sure w____ he will like the gift or not.", answer: "whether" },
      { text: "The problem is ____ we don't have enough time.", answer: "that" },
      { text: "I don't know ____ he went. (장소)", answer: "where" },
      { text: "Please tell me ____ you were absent yesterday. (이유)", answer: "why" },
    ],
    fix: [
      { text: "I don't know where does she live.", wrong: "does she live", right: "she lives", note: "간접 의문문 어순" },
      { text: "If it will rain tomorrow is not certain.", wrong: "If", right: "Whether", note: "주어 자리에는 whether" },
      { text: "Tell me what did you buy.", wrong: "did you buy", right: "you bought", note: "간접 의문문 어순" },
    ],
    rewrite: [
      { direction: "Do you know ~?로 시작하는 간접 의문문으로 바꾸시오.", text: "Where is the station?", answer: "Do you know where the station is?" },
      { direction: "가주어 It을 써서 바꾸시오.", text: "That she won the prize is amazing.", answer: "It is amazing that she won the prize." },
    ],
  },
  {
    key: "causative", name: "사역동사와 지각동사",
    rule: ["make/have/let + 목적어 + 동사원형(목적어가 그 행동을 할 때)", "have/get + 목적어 + p.p.(목적어가 ~되게 할 때)", "get + 목적어 + to부정사, help + 목적어 + (to) 동사원형", "지각동사(see, watch, hear, feel) + 목적어 + 동사원형 / -ing(진행 중) / p.p.(수동)"],
    choose: [
      { text: "My mom made me (clean / to clean) my room.", answer: "clean", note: "make + 목적어 + 동사원형" },
      { text: "Let me (introduce / to introduce) myself.", answer: "introduce" },
      { text: "She got her brother (to help / help) her with the dishes.", answer: "to help", note: "get + 목적어 + to부정사" },
      { text: "I heard someone (call / to call) my name.", answer: "call", note: "지각동사 + 목적어 + 동사원형" },
      { text: "We watched the sun (rising / to rise) over the sea.", answer: "rising", note: "떠오르고 있는 것을 봄" },
      { text: "I had my car (washed / wash) at the gas station.", answer: "washed", note: "차가 세차됨(수동)" },
      { text: "The teacher had us (write / written) a short essay.", answer: "write", note: "우리가 쓰는 행동을 함" },
    ],
    fill: [
      { text: "The teacher let us ____ (go) home early.", answer: "go" },
      { text: "He had the package ____ (deliver) to his office.", answer: "delivered" },
      { text: "My parents won't let me ____ (stay) out late.", answer: "stay" },
      { text: "I got my computer ____ (fix) by a technician.", answer: "fixed" },
    ],
    fix: [
      { text: "My father made me to wash his car.", wrong: "to wash", right: "wash", note: "make + 목적어 + 동사원형" },
      { text: "I had my bike repair yesterday.", wrong: "repair", right: "repaired", note: "자전거가 수리됨(수동)" },
      { text: "She let her son to play games for an hour.", wrong: "to play", right: "play", note: "let + 목적어 + 동사원형" },
    ],
    rewrite: [
      { direction: "have를 써서 ‘차를 고치게 했다’는 뜻으로 쓰시오.", text: "A mechanic fixed my car. I asked him to do it.", answer: "I had my car fixed (by a mechanic)." },
      { direction: "지각동사를 써서 한 문장으로 쓰시오.", text: "I heard the birds. They were singing in the tree.", answer: "I heard the birds singing in the tree." },
    ],
  },
];

/* ───── 문제 ───── */

export type GrammarKind = "choose" | "fill" | "fix" | "rewrite";
export const grammarKinds: Record<GrammarKind, string> = { choose: "알맞은 것 고르기", fill: "빈칸 채우기", fix: "틀린 곳 고치기", rewrite: "문장 바꿔 쓰기" };
const KIND_HEADINGS: Record<GrammarKind, string> = {
  choose: "괄호 안에서 어법상 알맞은 것을 고르시오.",
  fill: "빈칸에 알맞은 말을 쓰시오. (괄호 속 단어는 알맞은 형태로 바꾸시오.)",
  fix: "어법상 틀린 부분을 찾아 바르게 고치시오.",
  rewrite: "지시에 따라 문장을 바꿔 쓰시오.",
};

/** ( A / B ) 묶음을 찾습니다. 문장마다 하나만 둡니다. */
export function chooseOptions(text: string) {
  const match = /\(([^()]*\/[^()]*)\)/.exec(text);
  return match ? { start: match.index, end: match.index + match[0].length, options: match[1].split("/").map(option => option.trim()) } : null;
}
/** 문장 안에서 wrong이 낱말 경계로 몇 번 나오는지 셉니다(고치기 문제는 한 번이어야 해요). */
export const countPhrase = (text: string, phrase: string) => (text.match(new RegExp(`(?<![A-Za-z])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`, "g")) ?? []).length;

const noteHtml = (note?: string) => note ? ` <span style="color:#555">— ${escapeHtml(note)}</span>` : "";
function chooseProblem(item: ChooseItem): SheetProblem {
  const found = chooseOptions(item.text)!;
  const html = `${escapeHtml(item.text.slice(0, found.start))}( <b>${found.options.map(escapeHtml).join(" / ")}</b> )${escapeHtml(item.text.slice(found.end))}`;
  return problem(html, `<b>${escapeHtml(item.answer)}</b>${noteHtml(item.note)}`);
}
const fillProblem = (item: FillItem) => problem(escapeHtml(item.text).replace(/____/g, blankLine("26mm")), `<b>${escapeHtml(item.answer)}</b>${noteHtml(item.note)}`);
const fixProblem = (item: FixItem) => problem(`${escapeHtml(item.text)}<br>( ${blankLine("26mm")} → ${blankLine("26mm")} )`, `<b>${escapeHtml(item.wrong)}</b> → <b>${escapeHtml(item.right)}</b>${noteHtml(item.note)}`);
const rewriteProblem = (item: RewriteItem) => problem(`${escapeHtml(item.direction)}<br><span style="display:block;margin:1mm 0 0 4mm">${escapeHtml(item.text)}</span>→ ${blankLine("120mm")}`, `(예) ${escapeHtml(item.answer)}`, { space: 4 });

export type GrammarOptions = { topics: string[]; kinds: GrammarKind[]; count: number; seed: number; rules: boolean };

/** 고른 문법 항목의 문제를 유형마다 count개씩 섞어 냅니다. 규칙 요약을 앞에 붙일 수 있어요. */
export function grammarSections(options: GrammarOptions): SheetSection[] {
  const topics = GRAMMAR_TOPICS.filter(topic => options.topics.includes(topic.key));
  if (!topics.length) return [];
  const random = seededRandom(options.seed * 97 + 13);
  const take = <T,>(items: T[]) => shuffled(items, Math.floor(random() * 1e9)).slice(0, options.count);
  const sections: SheetSection[] = [];
  if (options.rules) {
    const html = topics.map(topic => `<div style="margin:0 0 2mm"><b>${escapeHtml(topic.name)}</b><ul style="margin:.5mm 0 0 5mm;padding:0">${topic.rule.map(line => `<li>${escapeHtml(line)}</li>`).join("")}</ul></div>`).join("");
    sections.push({ heading: "규칙 정리", problems: [], intro: { html: `<div style="border:1px solid #888;border-radius:2mm;padding:2.5mm 3.5mm;font-size:9.8pt">${html}</div>`, text: topics.map(topic => `${topic.name}: ${topic.rule.join(" / ")}`).join("\n") } });
  }
  for (const kind of options.kinds) {
    const problems = kind === "choose" ? take(topics.flatMap(topic => topic.choose)).map(chooseProblem)
      : kind === "fill" ? take(topics.flatMap(topic => topic.fill)).map(fillProblem)
        : kind === "fix" ? take(topics.flatMap(topic => topic.fix)).map(fixProblem)
          : take(topics.flatMap(topic => topic.rewrite)).map(rewriteProblem);
    if (problems.length) sections.push({ heading: KIND_HEADINGS[kind], problems });
  }
  return sections;
}
