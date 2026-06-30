import { randomUUID } from "crypto";
import { mkdir, readFile, rm, stat, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");
const ORIGINALS_DIR = path.join(UPLOAD_ROOT, "originals");

export type ImageVariantName = "thumbnail" | "feed" | "detail";

export type StoredUpload = {
  storageKey: string;
  fileName: string;
};

export async function storeOriginalUpload(input: {
  pinId: string;
  extension: string;
  bytes: Buffer;
}): Promise<StoredUpload> {
  await mkdir(ORIGINALS_DIR, { recursive: true });

  const fileName = `${input.pinId}-${randomUUID()}.${input.extension}`;
  const storageKey = `originals/${fileName}`;
  const filePath = resolveStorageKey(storageKey);

  await writeFile(filePath, input.bytes);

  return {
    storageKey,
    fileName,
  };
}

export async function storeImageVariant(input: {
  pinId: string;
  variant: ImageVariantName;
  bytes: Buffer;
}): Promise<StoredUpload> {
  const variantDir = path.join(UPLOAD_ROOT, "variants", input.variant);
  await mkdir(variantDir, { recursive: true });

  const fileName = `${input.pinId}-${input.variant}-${randomUUID()}.webp`;
  const storageKey = `variants/${input.variant}/${fileName}`;
  const filePath = resolveStorageKey(storageKey);

  await writeFile(filePath, input.bytes);

  return {
    storageKey,
    fileName,
  };
}

export async function readStoredUpload(storageKey: string) {
  const filePath = resolveStorageKey(storageKey);
  const [bytes, fileStats] = await Promise.all([readFile(filePath), stat(filePath)]);

  return {
    bytes,
    size: fileStats.size,
  };
}

export async function deleteStoredUpload(storageKey: string) {
  await rm(resolveStorageKey(storageKey), { force: true });
}

export async function deleteStoredUploads(storageKeys: Array<string | null | undefined>) {
  await Promise.all(
    storageKeys
      .filter((storageKey): storageKey is string => Boolean(storageKey))
      .map((storageKey) => deleteStoredUpload(storageKey)),
  );
}

function resolveStorageKey(storageKey: string) {
  const root = path.resolve(UPLOAD_ROOT);
  const filePath = path.resolve(root, storageKey);

  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage key.");
  }

  return filePath;
}
