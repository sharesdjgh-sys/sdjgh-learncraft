import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

const directory = path.join(process.cwd(), ".learning-images");
type Owner = { id: string; schoolId: string };

export function imageOwnerKey(user: Owner) {
  return createHash("sha256").update(JSON.stringify([user.schoolId, user.id])).digest("hex");
}

export function learningImageStorageAvailable() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) || process.env.NODE_ENV !== "production";
}

function validateImageData(data: Buffer) {
  if (data.length === 0 || data.length > 1_000_000
    || data.subarray(0, 4).toString("ascii") !== "RIFF"
    || data.subarray(8, 12).toString("ascii") !== "WEBP") {
    throw new Error("INVALID_LEARNING_IMAGE");
  }
  return data;
}

function imageData(dataUrl: string) {
  const match = /^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match) throw new Error("INVALID_LEARNING_IMAGE");
  return validateImageData(Buffer.from(match[1], "base64"));
}

function validateImageId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("INVALID_LEARNING_IMAGE_ID");
  }
}

async function writeLearningImage(user: Owner, id: string, data: Buffer) {
  validateImageId(id);
  const key = `${imageOwnerKey(user)}/${id}.webp`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(`learning-images/${key}`, data, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "image/webp",
    });
    return;
  }
  if (!learningImageStorageAvailable()) throw new Error("LEARNING_IMAGE_STORAGE_UNAVAILABLE");
  const ownerDirectory = path.join(directory, imageOwnerKey(user));
  await mkdir(ownerDirectory, { recursive: true });
  await writeFile(path.join(ownerDirectory, `${id}.webp`), data);
}

export async function saveLearningImage(user: Owner, id: string, dataUrl: string) {
  return writeLearningImage(user, id, imageData(dataUrl));
}

export async function saveLearningImageFile(user: Owner, id: string, file: File) {
  if (file.type !== "image/webp") throw new Error("INVALID_LEARNING_IMAGE");
  return writeLearningImage(user, id, validateImageData(Buffer.from(await file.arrayBuffer())));
}

async function read(key: string): Promise<BodyInit | null> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const result = await get(`learning-images/${key}`, { access: "private", useCache: false });
    return result?.statusCode === 200 ? result.stream : null;
  }
  if (!learningImageStorageAvailable()) return null;
  try { return new Uint8Array(await readFile(path.join(directory, key))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
}

export async function readLearningImage(user: Owner, id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) return null;
  return read(`${imageOwnerKey(user)}/${id}.webp`);
}

export async function deleteLearningImages(user: Owner, ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  uniqueIds.forEach(validateImageId);
  if (uniqueIds.length === 0) return;
  const ownerKey = imageOwnerKey(user);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await del(uniqueIds.map((id) => `learning-images/${ownerKey}/${id}.webp`));
    return;
  }
  if (!learningImageStorageAvailable()) return;
  await Promise.all(uniqueIds.map((id) => unlink(path.join(directory, ownerKey, `${id}.webp`))
    .catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error; })));
}

