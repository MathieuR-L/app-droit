import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { isGeminiConfigured, streamPdfSummaryWithGemini } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;
const STORAGE_DIRECTORY = process.env.VERCEL
  ? path.join("/tmp", "custody-records")
  : path.join(process.cwd(), "storage", "custody-records");

const GEMINI_SUMMARY_PREFIX = "Resume Gemini Flash-Lite";

const globalForCustodyRecordSummaries = globalThis as typeof globalThis & {
  custodyRecordGeminiJobs?: Map<string, Promise<string | null>>;
};

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

type SummarySource = "local" | "gemini";

type SummaryStateInput = {
  extractedText?: string | null;
  fileName?: string | null;
  summary?: string | null;
};

function sanitizeFileName(fileName: string) {
  const baseName = fileName.trim().replace(/[^a-zA-Z0-9._-]+/g, "-");

  if (!baseName.toLowerCase().endsWith(".pdf")) {
    return `${baseName || "garde-a-vue"}.pdf`;
  }

  return baseName || "garde-a-vue.pdf";
}

function getGeminiSummaryJobs() {
  if (!globalForCustodyRecordSummaries.custodyRecordGeminiJobs) {
    globalForCustodyRecordSummaries.custodyRecordGeminiJobs = new Map();
  }

  return globalForCustodyRecordSummaries.custodyRecordGeminiJobs;
}

function wrapGeminiSummary(summary: string) {
  return `${GEMINI_SUMMARY_PREFIX}\n${summary.trim()}`;
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

export function isGeminiSummary(summary?: string | null) {
  return summary?.startsWith(`${GEMINI_SUMMARY_PREFIX}\n`) ?? false;
}

export function getRenderableCustodyRecordSummary(summary?: string | null) {
  if (!summary) {
    return null;
  }

  if (!isGeminiSummary(summary)) {
    return summary;
  }

  return summary.slice(GEMINI_SUMMARY_PREFIX.length).trimStart();
}

export function getCustodyRecordSummaryState({
  extractedText,
  fileName,
  summary,
}: SummaryStateInput): {
  canEnhanceWithGemini: boolean;
  pendingGeminiSummary: boolean;
  source: SummarySource;
} {
  const source: SummarySource = isGeminiSummary(summary) ? "gemini" : "local";
  const canEnhanceWithGemini = Boolean(
    isGeminiConfigured() &&
      (fileName?.trim() || extractedText?.trim()) &&
      source !== "gemini",
  );

  return {
    canEnhanceWithGemini,
    pendingGeminiSummary: canEnhanceWithGemini,
    source,
  };
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
    throw new Error("Seuls les fichiers PDF sont acceptes.");
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error("Le PDF depasse la taille maximale autorisee de 15 Mo.");
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

export async function enhanceCustodyAlertSummary(
  alertId: string,
  options?: {
    onChunk?: (chunk: string) => void;
  },
) {
  const jobs = getGeminiSummaryJobs();
  const existingJob = jobs.get(alertId);

  if (existingJob) {
    const existingSummary = await existingJob;

    if (options?.onChunk) {
      const renderableSummary = getRenderableCustodyRecordSummary(existingSummary);

      if (renderableSummary) {
        options.onChunk(renderableSummary);
      }
    }

    return existingSummary;
  }

  const job = (async () => {
    const alert = await prisma.custodyAlert.findUnique({
      where: { id: alertId },
      select: {
        id: true,
        custodyRecordData: true,
        custodyRecordFileName: true,
        custodyRecordMimeType: true,
        custodyRecordStoredName: true,
        custodyRecordSummary: true,
      },
    });

    if (!alert?.custodyRecordFileName) {
      return null;
    }

    if (isGeminiSummary(alert.custodyRecordSummary)) {
      const renderableSummary = getRenderableCustodyRecordSummary(
        alert.custodyRecordSummary,
      );

      if (renderableSummary && options?.onChunk) {
        options.onChunk(renderableSummary);
      }

      return alert.custodyRecordSummary;
    }

    const { canEnhanceWithGemini } = getCustodyRecordSummaryState({
      fileName: alert.custodyRecordFileName,
      summary: alert.custodyRecordSummary,
    });

    if (!canEnhanceWithGemini) {
      return alert.custodyRecordSummary;
    }

    const fileBuffer =
      decodeCustodyRecordData(alert.custodyRecordData) ??
      (alert.custodyRecordStoredName
        ? await readCustodyRecordFile(alert.custodyRecordStoredName)
        : null);

    if (!fileBuffer) {
      return alert.custodyRecordSummary;
    }

    let streamedSummary = "";

    for await (const chunk of streamPdfSummaryWithGemini({
      fileData: fileBuffer,
      fileName: alert.custodyRecordFileName,
      mimeType: alert.custodyRecordMimeType || "application/pdf",
    })) {
      streamedSummary += chunk;
      options?.onChunk?.(chunk);
    }

    const normalizedSummary = streamedSummary.trim();

    if (!normalizedSummary) {
      return alert.custodyRecordSummary;
    }

    const storedSummary = wrapGeminiSummary(normalizedSummary);

    await prisma.custodyAlert.update({
      where: { id: alertId },
      data: {
        custodyRecordSummary: storedSummary,
      },
    });

    return storedSummary;
  })().finally(() => {
    jobs.delete(alertId);
  });

  jobs.set(alertId, job);
  return job;
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
