import assert from "node:assert/strict";
import { artGroups, artMovements, artTerms, artWorks, termCategories, termDetails, worksForTerm } from "../src/lib/art-works/catalog";
import { appreciationSteps, termPrompt, workExplanationSchema, workPrompt } from "../src/lib/art-works/explanation";
import { commonsImages, isCommonsFileName } from "../src/lib/commons-media";

const unique = (values: string[], message: string) => assert.deepEqual(values.filter((value, index) => values.indexOf(value) !== index), [], message);

// 작품·사조·용어 id가 겹치지 않고, 작품이 가리키는 용어가 모두 있어야 합니다.
unique(artMovements.map(item => item.id), "사조 id 중복");
unique(artWorks.map(item => item.id), "작품 id 중복");
unique(artTerms.map(item => item.id), "용어 id 중복");
unique(artTerms.map(item => item.term), "용어 이름 중복");
const termIds = new Set(artTerms.map(term => term.id));
for (const work of artWorks) {
  assert.deepEqual(work.terms.filter(id => !termIds.has(id)), [], `${work.id} 용어 참조`);
  // 이미지가 있는 작품과 저작권 때문에 설명만 두는 작품 중 하나여야 합니다.
  assert.ok(Boolean(work.file) !== Boolean(work.copyright), `${work.id} 이미지·저작권 표시`);
  if (work.file) assert.ok(isCommonsFileName(work.file), `${work.id} 파일 이름`);
}
unique(artWorks.flatMap(work => work.file ? [work.file] : []), "같은 이미지를 두 작품에 씀");
for (const movement of artMovements) {
  assert.ok(artGroups.includes(movement.group), `${movement.id} 묶음`);
  assert.ok(movement.works.length >= 6, `${movement.id} 작품 수`);
}
// 모든 용어에 자세한 설명이 있고, 함께 볼 용어가 실제로 있어야 합니다.
assert.deepEqual(artTerms.filter(term => !termDetails[term.id]).map(term => term.id), [], "용어 설명 누락");
assert.deepEqual(Object.keys(termDetails).filter(id => !termIds.has(id)), [], "없는 용어의 설명");
for (const [id, detail] of Object.entries(termDetails)) assert.deepEqual(detail.related.filter(other => !termIds.has(other) || other === id), [], `${id} 함께 볼 용어`);
for (const group of artGroups) assert.ok(artMovements.some(movement => movement.group === group), `${group} 사조 없음`);
for (const category of termCategories) assert.ok(artTerms.some(term => term.category === category), `${category} 용어 없음`);
assert.ok(worksForTerm("linear-perspective").some(work => work.id === "last-supper"), "용어별 작품 예시");

// 교과서에서 자주 찾는 사조와 작품이 빠지지 않았는지 확인합니다.
for (const name of ["인상주의", "추상 미술", "르네상스", "입체주의", "야수주의", "조선의 미술"]) assert.ok(artMovements.some(movement => movement.name === name), `${name} 사조`);
for (const id of ["mona-lisa", "starry-night", "impression-sunrise", "mondrian", "composition-vii", "ssireum", "sehando"]) assert.ok(artWorks.some(work => work.id === id), `${id} 작품`);

// 해설 스키마와 프롬프트
assert.equal(appreciationSteps.length, 4);
const step = { question: "무엇이 보이나요?", hint: "보이는 것을 말해요." };
assert.ok(workExplanationSchema.safeParse({
  oneLine: "한 줄", overview: "소개", background: "배경", elements: [{ name: "색", observation: "파랑" }, { name: "선", observation: "곡선" }],
  appreciation: { describe: step, analyze: step, interpret: step, judge: step },
  questions: [1, 2, 3].map(index => ({ question: `질문 ${index}`, intent: "의도" })), activities: [{ title: "활동", description: "설명" }],
  stories: [], terms: [], teacherScript: "대본", checkNote: "확인",
}).success, "작품 해설 스키마");
const mona = artWorks.find(work => work.id === "mona-lisa")!;
assert.match(workPrompt({ ...mona, movement: "르네상스" }, "high"), /고등학생[\s\S]*모나리자[\s\S]*르네상스/);
assert.match(termPrompt("명도", "middle", { category: "조형 요소", definition: "밝기" }), /중학생[\s\S]*명도[\s\S]*조형 요소/);

// --online: 모든 이미지가 Commons에 있고 이용 조건(퍼블릭 도메인·CC)을 통과하는지 확인합니다.
async function verifyOnline() {
  const files = artWorks.flatMap(work => work.file ? [work.file] : []);
  const missing: string[] = [];
  for (let index = 0; index < files.length; index += 20) {
    const chunk = files.slice(index, index + 20);
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "1280", iiextmetadatalanguage: "en", titles: chunk.join("|") }).toString();
    let response = await fetch(url, { headers: { "User-Agent": "LearnCraft/1.0 (school learning media; catalog check)" } });
    // 요청 제한에 걸리면 잠시 기다렸다가 다시 묻습니다.
    for (let attempt = 1; response.status === 429 && attempt <= 5; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, attempt * 20_000));
      response = await fetch(url, { headers: { "User-Agent": "LearnCraft/1.0 (school learning media; catalog check)" } });
    }
    assert.ok(response.ok, `Commons 응답 ${response.status}`);
    const found = new Set(commonsImages(await response.json()).map(image => image.file));
    missing.push(...chunk.filter(file => !found.has(file)));
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  assert.deepEqual(missing, [], "Commons에서 쓸 수 없는 이미지");
  console.log(`온라인 확인: 이미지 ${files.length}개 모두 사용 가능`);
}

void (process.argv.includes("--online") ? verifyOnline() : Promise.resolve()).then(() => console.log(`미술 작품 검증 통과: 사조 ${artMovements.length}개, 작품 ${artWorks.length}점(설명만 ${artWorks.filter(work => work.copyright).length}점), 용어 ${artTerms.length}개`));
