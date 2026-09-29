import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { gzipText, PDF_IMAGE_STEPS, PDF_PAYLOAD_LIMIT_BYTES, PDF_PAYLOAD_MAX_DECODED_BYTES, pdfImageScale } from "../src/lib/pdf-payload";

async function main() {
  // 브라우저에서 만든 gzip을 서버 zlib이 그대로 풀 수 있어야 합니다.
  const payload = JSON.stringify({ html: "<p>전기장과 전위차 ∇·E</p>".repeat(20_000), styles: ".learncraft{color:red}".repeat(20_000), title: "물리학" });
  const compressed = await gzipText(payload);
  assert.equal(gunzipSync(compressed).toString("utf8"), payload, "gzip 왕복");
  assert.ok(compressed.byteLength < payload.length / 10, "HTML·스타일은 크게 줄어듦");

  // 풀린 크기 상한을 넘는 압축 폭탄은 서버에서 거절합니다.
  const bomb = await gzipText("a".repeat(PDF_PAYLOAD_MAX_DECODED_BYTES + 1));
  assert.ok(bomb.byteLength < PDF_PAYLOAD_LIMIT_BYTES);
  assert.throws(() => gunzipSync(bomb, { maxOutputLength: PDF_PAYLOAD_MAX_DECODED_BYTES }), "압축 폭탄 차단");

  // 한도는 Vercel 요청 한도(4.5MB)보다 작고, 그림 단계는 점점 작아져야 합니다.
  assert.ok(PDF_PAYLOAD_LIMIT_BYTES < 4.5 * 1024 * 1024);
  for (let index = 1; index < PDF_IMAGE_STEPS.length; index += 1) {
    assert.ok(PDF_IMAGE_STEPS[index].maxSide < PDF_IMAGE_STEPS[index - 1].maxSide && PDF_IMAGE_STEPS[index].quality < PDF_IMAGE_STEPS[index - 1].quality, "단계가 점점 작아짐");
  }
  assert.equal(pdfImageScale(800, 600, 1600), 1, "작은 그림은 키우지 않음");
  assert.equal(pdfImageScale(3200, 1600, 1600), 0.5, "긴 변 기준으로 줄임");
  assert.equal(pdfImageScale(900, 1800, 1600), 1600 / 1800, "세로 그림");
  console.log(`PDF 요청 압축 검증 완료: gzip ${payload.length.toLocaleString()} → ${compressed.byteLength.toLocaleString()}바이트, 압축 폭탄 차단, 그림 단계 ${PDF_IMAGE_STEPS.length}개`);
}

void main();
