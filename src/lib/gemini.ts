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

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_GEMINI_TIMEOUT_MS = 8000;

function readGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || "";
}

function buildSummaryPrompt(fileName: string, sourceText: string) {
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
    sourceText.slice(0, 24000),
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
                  text: buildSummaryPrompt(fileName, sourceText),
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
