import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { generateTextSummaryWithGemini, isGeminiConfigured } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;
const STORAGE_DIRECTORY = process.env.VERCEL
  ? path.join("/tmp", "custody-records")
  : path.join(process.cwd(), "storage", "custody-records");

const STOP_WORDS = new Set([
  "a",
  "au",
  "aux",
  "avec",
  "ce",
  "ces",
  "dans",
  "de",
  "des",
  "du",
  "elle",
  "en",
  "et",
  "eux",
  "il",
  "je",
  "la",
  "le",
  "les",
  "leur",
  "lui",
  "mais",
  "me",
  "meme",
  "mes",
  "moi",
  "mon",
  "ne",
  "nos",
  "notre",
  "nous",
  "on",
  "ou",
  "par",
  "pas",
  "pour",
  "qu",
  "que",
  "qui",
  "sa",
  "se",
  "ses",
  "son",
  "sur",
  "ta",
  "te",
  "tes",
  "toi",
  "ton",
  "tu",
  "un",
  "une",
  "vos",
  "votre",
  "vous",
  "d",
  "l",
  "cette",
  "cet",
  "est",
  "sont",
  "ete",
  "etre",
  "avait",
  "ont",
  "dans",
  "ainsi",
  "plus",
  "moins",
  "dont",
  "tout",
  "tous",
  "toute",
  "toutes",
  "fait",
  "faits",
  "selon",
  "apres",
  "avant",
  "entre",
  "sans",
  "vers",
]);

export type PreparedCustodyRecord = {
  fileName: string;
  storedName: string;
  mimeType: string;
  extractedText: string | null;
  summary: string;
  pageCount: number | null;
  uploadedAt: Date;
};

type SummarySource = "local" | "gemini";

type SummaryStateInput = {
  extractedText?: string | null;
  summary?: string | null;
};

const GEMINI_SUMMARY_PREFIX = "Resume Gemini Flash-Lite";

const globalForCustodyRecordSummaries = globalThis as typeof globalThis & {
  custodyRecordGeminiJobs?: Map<string, Promise<string | null>>;
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

function cleanExtractedText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\u0000/g, "")
    .trim();
}

function removeDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 45);
}

function sentenceScore(sentence: string, frequencies: Map<string, number>) {
  const words = removeDiacritics(sentence.toLowerCase())
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  return words.reduce((total, word) => total + (frequencies.get(word) ?? 0), 0);
}

function buildSummary(text: string, pageCount: number | null) {
  const cleanedText = cleanExtractedText(text);

  if (!cleanedText) {
    return "Aucun texte exploitable n'a pu etre extrait automatiquement du PDF. Le document reste telechargeable, mais un OCR ou un LLM serait necessaire pour un resume plus fiable.";
  }

  const sentences = splitIntoSentences(cleanedText);

  if (!sentences.length) {
    const preview = cleanedText.slice(0, 550);
    const suffix = cleanedText.length > 550 ? "..." : "";
    return `Resume automatique local${pageCount ? ` (${pageCount} pages)` : ""}: ${preview}${suffix}`;
  }

  const frequencies = new Map<string, number>();

  for (const sentence of sentences) {
    const words = removeDiacritics(sentence.toLowerCase())
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

    for (const word of words) {
      frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
    }
  }

  const ranked = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: sentenceScore(sentence, frequencies),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .sort((left, right) => left.index - right.index)
    .map((item) => item.sentence);

  const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;

  return [
    `Resume automatique local${pageCount ? ` (${pageCount} pages` : ""}${wordCount ? `${pageCount ? ", " : " ("}${wordCount} mots exploitables)` : pageCount ? ")" : ""}.`,
    ...ranked.map((sentence) => `- ${sentence}`),
  ].join("\n");
}

function wrapGeminiSummary(summary: string) {
  return `${GEMINI_SUMMARY_PREFIX}\n${summary.trim()}`;
}

export function isGeminiSummary(summary?: string | null) {
  return summary?.startsWith(`${GEMINI_SUMMARY_PREFIX}\n`) ?? false;
}

export function getCustodyRecordSummaryState({
  extractedText,
  summary,
}: SummaryStateInput): {
  canEnhanceWithGemini: boolean;
  pendingGeminiSummary: boolean;
  source: SummarySource;
} {
  const source: SummarySource = isGeminiSummary(summary) ? "gemini" : "local";
  const canEnhanceWithGemini = Boolean(
    isGeminiConfigured() &&
      extractedText?.trim() &&
      source !== "gemini",
  );

  return {
    canEnhanceWithGemini,
    pendingGeminiSummary: canEnhanceWithGemini,
    source,
  };
}

async function ensureStorageDirectory() {
  await mkdir(STORAGE_DIRECTORY, { recursive: true });
}

function assertPdfSignature(buffer: Buffer) {
  const header = buffer.subarray(0, 4).toString("utf8");

  if (header !== "%PDF") {
    throw new Error("Le fichier transmis n'est pas un PDF valide.");
  }
}

async function extractPdfContents(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const [infoResult, textResult] = await Promise.all([
      parser.getInfo({ parsePageInfo: false }),
      parser.getText(),
    ]);

    return {
      text: cleanExtractedText(textResult.text),
      pageCount: infoResult.total || null,
    };
  } finally {
    await parser.destroy();
  }
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

  let text: string | null = null;
  let pageCount: number | null = null;
  let summary = "";

  try {
    const extracted = await extractPdfContents(buffer);
    text = extracted.text || null;
    pageCount = extracted.pageCount;
    summary = buildSummary(extracted.text, extracted.pageCount);
  } catch {
    summary =
      "Le PDF a bien ete joint, mais l'extraction automatique du texte a echoue. Le document original reste disponible pour lecture et un OCR ou un LLM pourra etre ajoute ensuite si besoin.";
  }

  const storedName = `${crypto.randomUUID()}.pdf`;

  await ensureStorageDirectory();
  await writeFile(path.join(STORAGE_DIRECTORY, storedName), buffer);

  return {
    fileName: safeName,
    storedName,
    mimeType,
    extractedText: text,
    summary,
    pageCount,
    uploadedAt: new Date(),
  };
}

export async function enhanceCustodyAlertSummary(alertId: string) {
  const jobs = getGeminiSummaryJobs();
  const existingJob = jobs.get(alertId);

  if (existingJob) {
    return existingJob;
  }

  const job = (async () => {
    const alert = await prisma.custodyAlert.findUnique({
      where: { id: alertId },
      select: {
        id: true,
        custodyRecordExtract: true,
        custodyRecordFileName: true,
        custodyRecordSummary: true,
      },
    });

    if (!alert?.custodyRecordFileName) {
      return null;
    }

    const { canEnhanceWithGemini } = getCustodyRecordSummaryState({
      extractedText: alert.custodyRecordExtract,
      summary: alert.custodyRecordSummary,
    });

    if (!canEnhanceWithGemini) {
      return alert.custodyRecordSummary;
    }

    const geminiSummary = await generateTextSummaryWithGemini({
      fileName: alert.custodyRecordFileName,
      sourceText: alert.custodyRecordExtract ?? "",
    });

    if (!geminiSummary) {
      return alert.custodyRecordSummary;
    }

    const nextSummary = wrapGeminiSummary(geminiSummary);

    await prisma.custodyAlert.update({
      where: { id: alertId },
      data: {
        custodyRecordSummary: nextSummary,
      },
    });

    return nextSummary;
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

export function getCustodyRecordDownloadUrl(alertId: string) {
  return `/api/alerts/${alertId}/document`;
}
