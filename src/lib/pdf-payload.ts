/**
 * /api/pdf 요청 본문을 Vercel 함수의 요청 한도(4.5MB) 안에 넣기 위한 약속입니다.
 * 브라우저는 JSON을 gzip으로 압축해 보내고, 그래도 크면 그림을 더 작게 다시 압축합니다.
 */

/** 압축한 요청 본문의 최대 크기. Vercel 한도(4.5MB)보다 여유를 둡니다. */
export const PDF_PAYLOAD_LIMIT_BYTES = 4_000_000;
/** 서버가 풀어 쓰는 JSON의 최대 크기. 압축 폭탄을 막습니다. */
export const PDF_PAYLOAD_MAX_DECODED_BYTES = 16_000_000;
/** gzip으로 보낸 본문임을 알리는 요청 헤더 */
export const PDF_PAYLOAD_ENCODING_HEADER = "X-LearnCraft-Payload-Encoding";

/**
 * 그림을 다시 압축할 단계입니다. 첫 단계는 A4 인쇄에 충분한 크기이고,
 * 한도를 넘을 때만 다음 단계로 내려갑니다.
 */
export const PDF_IMAGE_STEPS = [
  { maxSide: 1600, quality: 0.86 },
  { maxSide: 1280, quality: 0.78 },
  { maxSide: 1000, quality: 0.7 },
  { maxSide: 760, quality: 0.6 },
] as const;
export type PdfImageStep = (typeof PDF_IMAGE_STEPS)[number];

/** 그림을 이 크기에 맞추려면 얼마나 줄여야 하는지(1 이하) 계산합니다. */
export function pdfImageScale(width: number, height: number, maxSide: number) {
  const longest = Math.max(width, height);
  return longest > maxSide ? maxSide / longest : 1;
}

/** 브라우저와 Node 모두에 있는 CompressionStream으로 글을 gzip합니다. */
export async function gzipText(text: string) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export const canGzipInBrowser = () => typeof CompressionStream === "function";
