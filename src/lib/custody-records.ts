import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;
const STORAGE_DIRECTORY = process.env.VERCEL
  ? path.join("/tmp", "custody-records")
  : path.join(process.cwd(), "storage", "custody-records");

export type PreparedCustodyRecord = {
  fileName: string;
  storedName: string;
  mimeType: string;
  data: Buffer;
  extractedText: string | null;
  summary: string | null;
  pageCount: number | null;
  uploadedAt: Date;
};

function sanitizeFileName(fileName: string) {
  const baseName = fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, "-");

  if (!baseName.toLowerCase().endsWith(".pdf")) {
    return `${baseName || "garde-a-vue"}.pdf`;
  }

  return baseName || "garde-a-vue.pdf";
}

function assertPdfSignature(buffer: Buffer) {
  const header = buffer.subarray(0, 4).toString("utf8");

  if (header !== "%PDF") {
    throw new Error("Le fichier transmis n'est pas un PDF valide.");
  }
}

async function ensureStorageDirectory() {
  await mkdir(STORAGE_DIRECTORY, { recursive: true });
}

export async function prepareCustodyRecordUpload(
  file: File | null | undefined,
): Promise<PreparedCustodyRecord | null> {
  if (!file || file.size === 0) {
    return null;
  }

  const safeName = sanitizeFileName(file.name);
  const mimeType = file.type || "application/pdf";

  if (!safeName.toLowerCase().endsWith(".pdf")) {
    throw new Error("Seuls les fichiers PDF sont acceptés.");
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error("Le PDF dépasse la taille maximale autorisée de 15 Mo.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  assertPdfSignature(buffer);

  const storedName = `${crypto.randomUUID()}.pdf`;

  await ensureStorageDirectory();
  await writeFile(path.join(STORAGE_DIRECTORY, storedName), buffer);

  return {
    fileName: safeName,
    storedName,
    mimeType,
    data: buffer,
    extractedText: null,
    summary: null,
    pageCount: null,
    uploadedAt: new Date(),
  };
}

export async function removeCustodyRecordFile(storedName?: string | null) {
  if (!storedName) {
    return;
  }

  await rm(path.join(STORAGE_DIRECTORY, storedName), {
    force: true,
  });
}

export function getCustodyRecordPath(storedName: string) {
  return path.join(STORAGE_DIRECTORY, storedName);
}

export async function readCustodyRecordFile(storedName: string) {
  return readFile(getCustodyRecordPath(storedName));
}

export function decodeCustodyRecordData(data?: Uint8Array | null) {
  if (!data) {
    return null;
  }

  return Buffer.from(data);
}

export function getCustodyRecordDownloadUrl(alertId: string) {
  return `/api/alerts/${alertId}/document`;
}
