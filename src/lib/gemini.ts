type FetchImplementation = typeof fetch;

type GeminiGenerateContentPayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type GeminiTextSummaryOptions = {
  apiKey?: string | null;
  model?: string;
  sourceText: string;
  fileName: string;
  fetchImplementation?: FetchImplementation;
  timeoutMs?: number;
};

type GeminiPdfSummaryOptions = {
  apiKey?: string | null;
  model?: string;
  fileData: Buffer;
  fileName: string;
  mimeType: string;
  fetchImplementation?: FetchImplementation;
  timeoutMs?: number;
};

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_GEMINI_TIMEOUT_MS = 60_000;

export function readGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || "";
}

export function isGeminiConfigured() {
  return Boolean(readGeminiApiKey());
}

function buildTextSummaryPrompt(fileName: string, sourceText: string) {
  return [
    `Tu es un assistant juridique francophone.`,
    `Resume ce texte extrait d'un PDF de garde a vue de maniere concise et utile pour un avocat de permanence.`,
    `Nom du fichier: ${fileName}.`,
    `Structure attendue:`,
    `1. Identite / elements d'identification si presents`,
    `2. Mesure et contexte de la garde a vue`,
    `3. Faits reproches ou objet de l'audition`,
    `4. Droits, horaires, actes et informations procedurales importantes`,
    `5. Points de vigilance pour l'avocat`,
    `Si une information n'apparait pas clairement, indique-le. Reponds en francais avec des phrases courtes.`,
    `Texte a analyser:`,
    sourceText.slice(0, 24_000),
  ].join("\n\n");
}

function buildPdfSummaryPrompt(fileName: string) {
  return [
    `Tu es un assistant juridique francophone.`,
    `Analyse directement ce PDF de garde a vue et redige un resume operationnel pour un avocat de permanence.`,
    `Nom du fichier: ${fileName}.`,
    `Structure attendue:`,
    `1. Identite / elements d'identification si presents`,
    `2. Mesure et contexte de la garde a vue`,
    `3. Faits reproches ou objet de l'audition`,
    `4. Droits, horaires, actes et informations procedurales importantes`,
    `5. Points de vigilance pour l'avocat`,
    `Reponds exclusivement en francais, avec des phrases courtes, sans inventer d'informations absentes.`,
  ].join("\n\n");
}

function extractTextFromGeminiResponse(payload: unknown) {
  const typedPayload = payload as GeminiGenerateContentPayload;
  const candidates = Array.isArray(typedPayload?.candidates)
    ? typedPayload.candidates
    : [];

  const parts = candidates.flatMap((candidate) =>
    Array.isArray(candidate.content?.parts) ? candidate.content.parts : [],
  );

  const text = parts
    .map((part) => part.text?.trim())
    .filter((value): value is string => Boolean(value))
    .join("\n\n")
    .trim();

  return text || null;
}

function consumeServerSentEvents(buffer: string) {
  const normalized = buffer.replace(/\r/g, "");
  const events: string[] = [];
  let remaining = normalized;

  while (remaining.includes("\n\n")) {
    const separatorIndex = remaining.indexOf("\n\n");
    const rawEvent = remaining.slice(0, separatorIndex);
    remaining = remaining.slice(separatorIndex + 2);

    const data = rawEvent
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n")
      .trim();

    if (data) {
      events.push(data);
    }
  }

  return { events, remaining };
}

export async function generateTextSummaryWithGemini({
  apiKey = readGeminiApiKey(),
  model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
  sourceText,
  fileName,
  fetchImplementation = fetch,
  timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || DEFAULT_GEMINI_TIMEOUT_MS),
}: GeminiTextSummaryOptions) {
  if (!apiKey || !sourceText.trim()) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const generationResponse = await fetchImplementation(
      `${GEMINI_BASE_URL}/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildTextSummaryPrompt(fileName, sourceText),
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      },
    );

    if (!generationResponse.ok) {
      throw new Error(
        `Gemini summary generation failed with status ${generationResponse.status}.`,
      );
    }

    const payload = await generationResponse.json();
    return extractTextFromGeminiResponse(payload);
  } catch (error) {
    console.error("Gemini text summary failed", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function* streamPdfSummaryWithGemini({
  apiKey = readGeminiApiKey(),
  model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
  fileData,
  fileName,
  mimeType,
  fetchImplementation = fetch,
  timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || DEFAULT_GEMINI_TIMEOUT_MS),
}: GeminiPdfSummaryOptions) {
  if (!apiKey || !fileData.length) {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const generationResponse = await fetchImplementation(
      `${GEMINI_BASE_URL}/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildPdfSummaryPrompt(fileName),
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: fileData.toString("base64"),
                  },
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      },
    );

    if (!generationResponse.ok) {
      throw new Error(
        `Gemini PDF summary generation failed with status ${generationResponse.status}.`,
      );
    }

    if (!generationResponse.body) {
      throw new Error("Gemini PDF summary response body is empty.");
    }

    const reader = generationResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let emittedText = "";

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), {
        stream: !done,
      });

      const { events, remaining } = consumeServerSentEvents(buffer);
      buffer = remaining;

      for (const event of events) {
        if (event === "[DONE]") {
          return;
        }

        const payload = JSON.parse(event);
        const text = extractTextFromGeminiResponse(payload);

        if (!text) {
          continue;
        }

        let nextChunk = text;

        if (emittedText && text.startsWith(emittedText)) {
          nextChunk = text.slice(emittedText.length);
          emittedText = text;
        } else {
          emittedText += text;
        }

        if (nextChunk) {
          yield nextChunk;
        }
      }

      if (done) {
        return;
      }
    }
  } finally {
    clearTimeout(timeout);
  }
}
