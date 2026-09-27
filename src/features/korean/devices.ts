/* 국어 · 문학: 표현법 사전과 문제입니다. 예시는 저작권이 끝난 작품의 구절이거나 교과서형으로 지은 짧은 예문입니다(source가 없으면 지은 예문). */
import { circled, escapeHtml, particle, problem, seededRandom, shuffled, type SheetProblem, type SheetSection } from "./sheet";

export type DeviceGroup = "figure" | "emphasis" | "variation" | "image";
export const deviceGroups: Record<DeviceGroup, string> = { figure: "비유·상징", emphasis: "강조", variation: "변화", image: "심상·정서 표현" };

export type Device = { id: string; name: string; group: DeviceGroup; meaning: string; examples: { text: string; source?: string }[] };

export const DEVICES: Device[] = [
  { id: "simile", name: "직유법", group: "figure", meaning: "‘~같이, ~처럼, ~듯이’ 같은 연결어로 원관념과 보조 관념을 직접 이어 빗대는 방법",
    examples: [{ text: "그녀의 볼은 잘 익은 사과처럼 붉었다." }, { text: "아이들은 참새처럼 재잘거렸다." }] },
  { id: "metaphor", name: "은유법", group: "figure", meaning: "연결어 없이 ‘A는 B이다’처럼 원관념을 보조 관념에 바로 빗대는 방법",
    examples: [{ text: "시간은 금이다." }, { text: "내 마음은 고요한 호수다." }] },
  { id: "personification", name: "의인법", group: "figure", meaning: "사람이 아닌 것을 사람처럼 생각하고 행동하는 것으로 나타내는 방법",
    examples: [{ text: "꽃들이 봄바람에 방긋 웃는다." }, { text: "바람이 창문을 두드리며 나를 부른다." }] },
  { id: "animation", name: "활유법", group: "figure", meaning: "생명이 없는 것을 살아 있는 동물처럼 나타내는 방법(사람처럼 나타내는 의인법과 구별함)",
    examples: [{ text: "성난 파도가 울부짖으며 바위를 물어뜯는다." }, { text: "기차가 긴 꼬리를 흔들며 산모퉁이를 돌아간다." }] },
  { id: "synecdoche", name: "제유법", group: "figure", meaning: "사물의 한 부분으로 그 전체를 나타내는 방법",
    examples: [{ text: "사람은 빵만으로는 살 수 없다. (빵 → 먹을 것 전체)" }, { text: "우리 집은 식구가 많아 입이 여섯이다. (입 → 사람)" }] },
  { id: "metonymy", name: "환유법", group: "figure", meaning: "어떤 사물과 밀접하게 관련된 다른 사물로 그것을 나타내는 방법",
    examples: [{ text: "요람에서 무덤까지 나라가 보살핀다. (요람·무덤 → 태어남과 죽음)" }, { text: "백의민족의 슬기를 이어 가자. (백의 → 한민족)" }] },
  { id: "symbol", name: "상징법", group: "figure", meaning: "원관념은 숨기고 보조 관념만 내세워, 추상적인 뜻을 구체적인 사물로 암시하는 방법",
    examples: [{ text: "비둘기가 날아오르는 광장 (비둘기 → 평화)" }, { text: "죽는 날까지 하늘을 우러러 / 한 점 부끄럼이 없기를, (하늘 → 삶의 기준이 되는 절대적 가치)", source: "윤동주, 「서시」" }] },
  { id: "hyperbole", name: "과장법", group: "emphasis", meaning: "사물이나 느낌을 실제보다 훨씬 크게 또는 작게 나타내는 방법",
    examples: [{ text: "그 말을 듣고 눈물이 강물처럼 쏟아졌다." }, { text: "쥐구멍에라도 들어가고 싶을 만큼 부끄러웠다." }] },
  { id: "irony", name: "반어법", group: "emphasis", meaning: "말하려는 뜻과 반대로 표현하여 뜻을 오히려 강조하는 방법(겉으로 드러난 말과 속뜻이 반대임)",
    examples: [{ text: "나 보기가 역겨워 / 가실 때에는 / 죽어도 아니 눈물 흘리우리다", source: "김소월, 「진달래꽃」" }, { text: "(시험을 망친 친구에게) 참 잘했다, 잘했어." }] },
  { id: "paradox", name: "역설법", group: "emphasis", meaning: "겉으로는 앞뒤가 맞지 않고 모순되어 보이지만, 그 속에 깊은 진리를 담는 방법",
    examples: [{ text: "아아, 님은 갔지마는 나는 님을 보내지 아니하였습니다.", source: "한용운, 「님의 침묵」" }, { text: "찬란한 슬픔의 봄을", source: "김영랑, 「모란이 피기까지는」" }] },
  { id: "rhetorical", name: "설의법", group: "emphasis", meaning: "누구나 아는 사실을 의문의 형식으로 던져 독자가 스스로 판단하게 하여 강조하는 방법",
    examples: [{ text: "임 향한 일편단심이야 가실 줄이 있으랴", source: "정몽주, 「이 몸이 죽고 죽어」" }, { text: "부모님의 은혜를 어찌 다 갚을 수 있겠는가?" }] },
  { id: "exclamation", name: "영탄법", group: "emphasis", meaning: "‘아아, 오’ 같은 감탄사나 ‘~구나, ~여라’ 같은 감탄형 어미로 벅찬 감정을 드러내는 방법",
    examples: [{ text: "아아, 사랑하는 나의 님은 갔습니다.", source: "한용운, 「님의 침묵」" }, { text: "오, 눈부시게 푸른 하늘이여!" }] },
  { id: "climax", name: "점층법", group: "emphasis", meaning: "말의 뜻이나 정도를 점점 크게, 강하게, 넓게 하여 뜻을 강조하는 방법",
    examples: [{ text: "이 몸이 죽고 죽어 일백 번 고쳐 죽어", source: "정몽주, 「이 몸이 죽고 죽어」" }, { text: "한 사람이 바뀌면 가정이 바뀌고, 가정이 바뀌면 나라가 바뀐다." }] },
  { id: "repetition", name: "반복법", group: "emphasis", meaning: "같은 낱말이나 구절, 문장을 되풀이하여 뜻을 강조하고 운율을 만드는 방법",
    examples: [{ text: "가시는 걸음걸음 / 놓인 그 꽃을", source: "김소월, 「진달래꽃」" }, { text: "산에는 꽃이 피네. 꽃이 피네." }] },
  { id: "enumeration", name: "열거법", group: "emphasis", meaning: "비슷하거나 관련 있는 낱말·구절을 여러 개 늘어놓아 내용을 강조하는 방법",
    examples: [{ text: "시장에는 사과, 배, 감, 대추가 수북이 쌓여 있었다." }, { text: "웃음과 눈물과 땀과 노래가 이 마당에 모두 있다." }] },
  { id: "inversion", name: "도치법", group: "variation", meaning: "문장 성분의 순서를 바꾸어 강조하거나 변화를 주는 방법",
    examples: [{ text: "가자, 저 넓은 세상으로." }, { text: "보고 싶다, 고향의 푸른 들판이." }] },
  { id: "parallelism", name: "대구법", group: "variation", meaning: "비슷한 짜임의 구절을 짝지어 나란히 놓아 운율과 균형을 만드는 방법",
    examples: [{ text: "산은 높고 물은 깊다." }, { text: "호랑이는 죽어서 가죽을 남기고, 사람은 죽어서 이름을 남긴다." }] },
  { id: "contrast", name: "대조법", group: "variation", meaning: "뜻이 서로 반대되는 것을 맞세워 차이를 뚜렷하게 드러내는 방법",
    examples: [{ text: "인생은 짧고 예술은 길다." }, { text: "형은 부지런하고 아우는 게으르다." }] },
  { id: "sound-symbol", name: "음성 상징어", group: "image", meaning: "소리를 흉내 낸 말(의성어)이나 모양·움직임을 흉내 낸 말(의태어)로 생생함과 운율을 주는 방법",
    examples: [{ text: "봄바람 이불 아래 서리서리 넣었다가 / 정든 임 오신 날 밤이거든 굽이굽이 펴리라", source: "황진이, 「동짓달 기나긴 밤을」" }, { text: "시냇물이 졸졸졸 흐르고 나비가 팔랑팔랑 날아간다." }] },
  { id: "synesthesia", name: "공감각적 심상", group: "image", meaning: "하나의 감각을 다른 감각으로 옮겨 나타내는 심상(예: 청각의 시각화)",
    examples: [{ text: "노랗게 번지는 아이들의 웃음소리 (청각의 시각화)" }, { text: "달콤한 햇살이 창가에 내려앉았다. (시각의 미각화)" }] },
  { id: "empathy", name: "감정 이입", group: "image", meaning: "화자의 감정을 다른 대상에 옮겨, 그 대상도 화자와 같은 감정을 느끼는 것처럼 나타내는 방법",
    examples: [{ text: "우러라 우러라 새여 자고 니러 우러라 새여 (새도 화자처럼 슬퍼 운다)", source: "「청산별곡」" }, { text: "이별하던 날, 창밖의 빗줄기도 흐느껴 울었다." }] },
  { id: "correlative", name: "객관적 상관물", group: "image", meaning: "화자의 정서를 직접 말하지 않고, 그 정서를 불러일으키거나 드러내는 구체적인 사물·상황(감정 이입의 대상을 포함하는 넓은 개념)",
    examples: [{ text: "일지 춘심을 자규야 알랴마는 (자규의 울음이 화자의 애상을 돋움)", source: "이조년, 「이화에 월백하고」" }, { text: "홀로 남은 빈 의자가 떠난 친구를 생각나게 했다." }] },
];
export const deviceById = (id: string) => DEVICES.find(device => device.id === id);

/** 반어와 역설을 가르는 예문입니다. */
export const IRONY_PARADOX: { text: string; kind: "irony" | "paradox"; why: string; source?: string }[] = [
  { text: "죽어도 아니 눈물 흘리우리다", kind: "irony", source: "김소월, 「진달래꽃」", why: "속으로는 슬프지만 겉으로는 울지 않겠다고 반대로 말한다." },
  { text: "(방을 어질러 놓은 동생에게) 방이 아주 깨끗하구나.", kind: "irony", why: "지저분한 방을 두고 반대로 깨끗하다고 말한다." },
  { text: "(비 오는 소풍날) 날씨 한번 정말 좋다.", kind: "irony", why: "궂은 날씨를 두고 반대로 좋다고 말한다." },
  { text: "아아, 님은 갔지마는 나는 님을 보내지 아니하였습니다.", kind: "paradox", source: "한용운, 「님의 침묵」", why: "님이 갔는데 보내지 않았다는 말은 모순되지만, 님을 마음속에 간직한다는 진리를 담는다." },
  { text: "찬란한 슬픔의 봄을", kind: "paradox", source: "김영랑, 「모란이 피기까지는」", why: "‘찬란함’과 ‘슬픔’이 모순되게 이어지지만 모란이 피는 기쁨과 지는 슬픔을 함께 담는다." },
  { text: "지는 것이 이기는 것이다.", kind: "paradox", why: "지는 것과 이기는 것은 반대이지만, 양보가 더 큰 것을 얻게 한다는 뜻을 담는다." },
];

/* ───── 문제 ───── */
export type DeviceAsk = "identify" | "meaning" | "write" | "ironyParadox";
export const deviceAsks: Record<DeviceAsk, string> = { identify: "예문 → 표현법 고르기", meaning: "표현법의 뜻 쓰기", write: "표현법으로 문장 짓기", ironyParadox: "반어·역설 구별" };

const exampleHtml = (example: Device["examples"][number]) => `<span style="display:block;margin:1mm 0 1mm 4mm;padding-left:2mm;border-left:2px solid #999">${escapeHtml(example.text)}${example.source ? ` <span style="font-size:9pt;color:#555">— ${escapeHtml(example.source)}</span>` : ""}</span>`;

export function deviceProblems(asks: DeviceAsk[], pool: Device[], perAsk: number, seed: number): SheetSection[] {
  const devices = pool.length >= 2 ? pool : DEVICES;
  const random = seededRandom(seed * 37 + 11);
  const sections: SheetSection[] = [];
  for (const ask of asks) {
    const problems: SheetProblem[] = [];
    const order = shuffled(devices, seed * 13 + asks.indexOf(ask) + 1);
    for (let index = 0; index < perAsk && index < order.length; index += 1) {
      const device = order[index];
      if (ask === "identify") {
        const example = device.examples[Math.floor(random() * device.examples.length)];
        // 보기는 같은 묶음의 다른 표현법을 먼저 씁니다.
        const others = shuffled(DEVICES.filter(item => item.id !== device.id), seed * 7 + index).sort((a, b) => Number(b.group === device.group) - Number(a.group === device.group)).slice(0, 4);
        const choices = shuffled([device, ...others], seed * 3 + index * 5 + 2);
        const at = choices.indexOf(device);
        problems.push(problem(`다음에 쓰인 표현법으로 가장 알맞은 것은?${exampleHtml(example)}${choices.map((item, i) => `${circled(i)} ${escapeHtml(item.name)}`).join("&nbsp;&nbsp; ")}`,
          `${circled(at)} ${escapeHtml(device.name)} — ${escapeHtml(device.meaning)}`, { space: 4 }));
      } else if (ask === "meaning") {
        problems.push(problem(`‘${escapeHtml(device.name)}’의 뜻을 쓰고, 예를 하나 드시오.`, `${escapeHtml(device.meaning)}<br>예: ${escapeHtml(device.examples[0].text)}`, { space: 16 }));
      } else if (ask === "write") {
        problems.push(problem(`‘${escapeHtml(device.name)}’${particle(device.name, "을", "를")} 써서 ‘봄’이나 ‘친구’에 대한 문장을 한 문장 지으시오.`, `(예시) ${escapeHtml(device.examples[0].text)} — ${escapeHtml(device.meaning)}`, { space: 14 }));
      }
    }
    if (ask === "ironyParadox") {
      const items = shuffled(IRONY_PARADOX, seed * 17 + 5).slice(0, Math.max(3, Math.min(IRONY_PARADOX.length, perAsk * 2)));
      problems.push(problem(`다음 표현이 반어법인지 역설법인지 구별하고, 그렇게 생각한 까닭을 쓰시오.${items.map((item, i) => `<span style="display:block;margin:1mm 0 0 4mm">${circled(i)} ${escapeHtml(item.text)}${item.source ? ` <span style="font-size:9pt;color:#555">— ${escapeHtml(item.source)}</span>` : ""}</span>`).join("")}`,
        items.map((item, i) => `${circled(i)} ${item.kind === "irony" ? "반어법" : "역설법"} — ${escapeHtml(item.why)}`).join("<br>"), { space: 20 }));
    }
    if (problems.length) sections.push({ heading: deviceAsks[ask], problems });
  }
  return sections;
}
