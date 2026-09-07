// Read-only compatibility for previously saved generated images. New images are sent inline.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { get } from "@vercel/blob";

const directory = path.join(process.cwd(), ".learning-images");
type Owner = { id: string; schoolId: string };

export function imageOwnerKey(user: Owner) {
  return createHash("sha256").update(JSON.stringify([user.schoolId, user.id])).digest("hex");
}

export function learningImageStorageAvailable() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) || process.env.NODE_ENV !== "production";
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

