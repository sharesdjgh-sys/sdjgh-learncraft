import { gunzipSync } from "node:zlib";
import { PDF_PAYLOAD_ENCODING_HEADER, PDF_PAYLOAD_MAX_DECODED_BYTES } from "./pdf-payload";

/**
 * 브라우저는 Vercel 요청 한도에 맞추려고 JSON을 gzip으로 보냅니다.
 * 풀린 크기에 상한을 두어 압축 폭탄을 막고, 헤더가 없으면 예전처럼 JSON으로 읽습니다.
 */
export async function readPdfPayload(request: Request): Promise<unknown> {
  try {
    if (request.headers.get(PDF_PAYLOAD_ENCODING_HEADER) !== "gzip") return await request.json();
    const compressed = Buffer.from(await request.arrayBuffer());
    if (compressed.length > PDF_PAYLOAD_MAX_DECODED_BYTES) return null;
    return JSON.parse(gunzipSync(compressed, { maxOutputLength: PDF_PAYLOAD_MAX_DECODED_BYTES }).toString("utf8"));
  } catch {
    return null;
  }
}
