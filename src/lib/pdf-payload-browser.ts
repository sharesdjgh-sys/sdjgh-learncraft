import { canGzipInBrowser, gzipText, PDF_IMAGE_STEPS, PDF_PAYLOAD_ENCODING_HEADER, PDF_PAYLOAD_LIMIT_BYTES, pdfImageScale, type PdfImageStep } from "./pdf-payload";

/* 브라우저에서 PDF 요청 본문을 Vercel 요청 한도 안으로 줄입니다. */

/** 그림 원본(data URL)을 기억해 두고, 단계마다 원본에서 다시 줄여 화질이 겹쳐 나빠지지 않게 합니다. */
function collectPdfImageSources(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLImageElement>("img"))
    .filter((image) => /^data:image\/(?:png|jpeg|webp|gif|bmp)/i.test(image.src))
    .map((image) => ({ image, source: image.src }));
}

async function reencodePdfImage(source: string, step: PdfImageStep) {
  const original = document.createElement("img");
  original.src = source;
  await original.decode();
  const scale = pdfImageScale(original.naturalWidth, original.naturalHeight, step.maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(original.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(original.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return { source, width: original.naturalWidth };
  // WebP를 만들지 못하는 브라우저는 JPEG로 저장하므로 투명한 곳을 흰색으로 채웁니다.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(original, 0, 0, canvas.width, canvas.height);
  let encoded = canvas.toDataURL("image/webp", step.quality);
  if (!encoded.startsWith("data:image/webp")) encoded = canvas.toDataURL("image/jpeg", step.quality);
  return { source: encoded.length < source.length ? encoded : source, width: original.naturalWidth };
}

async function compressPdfImages(images: ReturnType<typeof collectPdfImageSources>, step: PdfImageStep) {
  await Promise.all(images.map(async ({ image, source }) => {
    try {
      const compressed = await reencodePdfImage(source, step);
      // 해상도를 줄여도 문서에 보이는 크기는 원래대로 둡니다.
      if (!image.getAttribute("width")) image.setAttribute("width", String(compressed.width));
      image.src = compressed.source;
    } catch (error) {
      console.warn("[LearnCraft PDF 이미지 압축 실패]", error);
    }
  }));
}

/**
 * Vercel 요청 한도 안에 들어오도록 JSON을 gzip으로 압축합니다. 그래도 크면
 * 그림을 더 작게 다시 압축하고, 마지막 단계에서도 크면 오류를 알립니다.
 */
export async function preparePdfRequest(root: HTMLElement, styles: string, title: string) {
  const images = collectPdfImageSources(root);
  const gzip = canGzipInBrowser();
  for (const step of PDF_IMAGE_STEPS) {
    if (images.length) await compressPdfImages(images, step);
    const json = JSON.stringify({ html: root.outerHTML, styles, title });
    const body = gzip ? await gzipText(json) : json;
    const size = typeof body === "string" ? new Blob([body]).size : body.byteLength;
    if (size <= PDF_PAYLOAD_LIMIT_BYTES) {
      return {
        body: typeof body === "string" ? body : new Blob([body]),
        headers: (gzip
          ? { "Content-Type": "application/octet-stream", [PDF_PAYLOAD_ENCODING_HEADER]: "gzip" }
          : { "Content-Type": "application/json" }) as Record<string, string>,
      };
    }
    if (!images.length) break;
  }
  throw new PdfTooLargeError();
}

export class PdfTooLargeError extends Error {
  constructor() {
    super("PDF_PAYLOAD_TOO_LARGE");
  }
}

