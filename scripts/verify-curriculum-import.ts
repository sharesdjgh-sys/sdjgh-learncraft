import { readFile } from "node:fs/promises";
import { parseCurriculumPdf } from "../src/lib/curriculum-pdf";

async function main() {
const source = new URL("../ref/2026학년도 서대전여고 검인정 교과서 선정결과.pdf", import.meta.url);
const bytes = new Uint8Array(await readFile(source));
const result = await parseCurriculumPdf(bytes);

if (result.totalPages !== 1) throw new Error(`예상 페이지 1, 실제 ${result.totalPages}`);
if (result.offerings.length !== 53) throw new Error(`예상 과목 53개, 실제 ${result.offerings.length}개`);

const expected = ["공통국어1", "공통수학1", "문학", "대수", "지구시스템과학", "일본문화"];
for (const title of expected) {
  if (!result.offerings.some((item) => item.courseTitle === title)) {
    throw new Error(`${title} 과목을 찾지 못했습니다.`);
  }
}

const contentReady = result.offerings.filter((item) => item.contentCourseCode).length;
if (contentReady !== 15) throw new Error(`예상 콘텐츠 연결 15개, 실제 ${contentReady}개`);

console.log(`교육과정 PDF 검증 완료: ${result.totalPages}페이지, ${result.offerings.length}과목, 콘텐츠 연결 ${contentReady}과목`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
