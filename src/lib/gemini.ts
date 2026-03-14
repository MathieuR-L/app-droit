type FetchImplementation = typeof fetch;

type GeminiFile = {
  name: string;
  uri: string;
  mimeType?: string;
};

type GeminiGenerateContentPayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type GeminiSummaryOptions = {
  apiKey?: string | null;
  model?: string;
  pdfBuffer: Buffer;
  fileName: string;
  fetchImplementation?: FetchImplementation;
};

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function readGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() || "";
}

function buildSummaryPrompt(fileName: string) {
  return [
    `Tu es un assistant juridique francophone.`,
    `Resume ce PDF de garde a vue de maniere concise et utile pour un avocat de permanence.`,
    `Nom du fichier: ${fileName}.`,
    `Structure attendue:`,
    `1. Identite / elements d'identification si presents`,
    `2. Mesure et contexte de la garde a vue`,
    `3. Faits reproches ou objet de l'audition`,
    `4. Droits, horaires, actes et informations procedurales importantes`,
    `5. Points de vigilance pour l'avocat`,
    `Si une information n'apparait pas clairement, indique-le. Reponds en francais avec des phrases courtes.`,
  ].join("\n");
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

async function uploadPdfToGemini(
  apiKey: string,
  fileName: string,
  pdfBuffer: Buffer,
  fetchImplementation: FetchImplementation,
) {
  const startResponse = await fetchImplementation(
    `${GEMINI_BASE_URL}/upload/v1beta/files`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(pdfBuffer.byteLength),
        "X-Goog-Upload-Header-Content-Type": "application/pdf",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: {
          display_name: fileName,
        },
      }),
    },
  );

  if (!startResponse.ok) {
    throw new Error(`Gemini upload start failed with status ${startResponse.status}.`);
  }

  const uploadUrl = startResponse.headers.get("x-goog-upload-url");

  if (!uploadUrl) {
    throw new Error("Gemini upload URL missing from response headers.");
  }

  const uploadResponse = await fetchImplementation(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(pdfBuffer.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(pdfBuffer),
  });

  if (!uploadResponse.ok) {
    throw new Error(`Gemini upload finalize failed with status ${uploadResponse.status}.`);
  }

  const uploadPayload = (await uploadResponse.json()) as {
    file?: GeminiFile;
  };

  if (!uploadPayload.file?.uri || !uploadPayload.file?.name) {
    throw new Error("Gemini upload response did not return a usable file reference.");
  }

  return uploadPayload.file;
}

async function deleteGeminiFile(
  apiKey: string,
  fileName: string,
  fetchImplementation: FetchImplementation,
) {
  await fetchImplementation(`${GEMINI_BASE_URL}/v1beta/files/${fileName}`, {
    method: "DELETE",
    headers: {
      "x-goog-api-key": apiKey,
    },
  }).catch(() => undefined);
}

export async function generatePdfSummaryWithGemini({
  apiKey = readGeminiApiKey(),
  model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
  pdfBuffer,
  fileName,
  fetchImplementation = fetch,
}: GeminiSummaryOptions) {
  if (!apiKey) {
    return null;
  }

  let uploadedFile: GeminiFile | null = null;

  try {
    uploadedFile = await uploadPdfToGemini(
      apiKey,
      fileName,
      pdfBuffer,
      fetchImplementation,
    );

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
                { text: buildSummaryPrompt(fileName) },
                {
                  file_data: {
                    mime_type: uploadedFile.mimeType || "application/pdf",
                    file_uri: uploadedFile.uri,
                  },
                },
              ],
            },
          ],
        }),
      },
    );

    if (!generationResponse.ok) {
      throw new Error(
        `Gemini summary generation failed with status ${generationResponse.status}.`,
      );
    }

    const payload = await generationResponse.json();
    const summary = extractTextFromGeminiResponse(payload);

    if (!summary) {
      throw new Error("Gemini returned an empty summary.");
    }

    return summary;
  } catch (error) {
    console.error("Gemini PDF summary failed", error);
    return null;
  } finally {
    if (uploadedFile?.name) {
      await deleteGeminiFile(apiKey, uploadedFile.name, fetchImplementation);
    }
  }
}
