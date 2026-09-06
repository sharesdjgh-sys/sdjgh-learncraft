import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { get, put, del } from "@vercel/blob";
import type { StoredFeedbackImage } from "./model";

const directory = path.join(process.cwd(), ".feedback-uploads");
export const maxImageBytes = 1024 * 1024;
export class ImageInputError extends Error {}

export async function normalizeImage(file: File) {
  if (!file.size || file.size > maxImageBytes || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new ImageInputError("이미지는 PNG, JPG, WebP 형식으로 장당 1MB 이하만 첨부할 수 있어요.");
  try {
    const source = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 24_000_000, animated: false });
    const metadata = await source.metadata();
    if (!["png", "jpeg", "webp"].includes(metadata.format ?? "") || (metadata.pages ?? 1) > 1) throw new Error("Unsupported image");
    const result = await source.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
    if (result.data.length > maxImageBytes) throw new Error("Image too large");
    return result;
  } catch { throw new ImageInputError("이미지를 읽지 못했어요. 다른 이미지나 작은 이미지로 다시 시도해 주세요."); }
}

export async function saveImage(result: Awaited<ReturnType<typeof normalizeImage>>): Promise<StoredFeedbackImage> {
  const id = crypto.randomUUID();
  const base = { id, width: result.info.width, height: result.info.height, size: result.data.length };
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`feedback/${id}.webp`, result.data, { access: "private", contentType: "image/webp", addRandomSuffix: false });
    return { ...base, key: blob.pathname, provider: "blob" };
  }
  if (process.env.NODE_ENV === "production") throw new Error("Private image storage is not configured");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${id}.webp`), result.data, { flag: "wx" });
  return { ...base, key: `${id}.webp`, provider: "local" };
}

function localPath(image: StoredFeedbackImage) {
  if (!/^[0-9a-f-]{36}\.webp$/.test(image.key)) throw new Error("Invalid storage key");
  return path.join(directory, image.key);
}

export async function readImage(image: StoredFeedbackImage): Promise<BodyInit | null> {
  if (image.provider === "blob") {
    const result = await get(image.key, { access: "private" });
    return result?.statusCode === 200 ? result.stream : null;
  }
  try { return new Uint8Array(await readFile(localPath(image))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

export async function removeImage(image: StoredFeedbackImage) {
  if (image.provider === "blob") await del(image.key);
  else await unlink(localPath(image)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; });
}
