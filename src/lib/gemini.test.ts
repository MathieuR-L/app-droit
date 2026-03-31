import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_GEMINI_MODEL,
  generateTextSummaryWithGemini,
} from "./gemini";

describe("generateTextSummaryWithGemini", () => {
  it("returns null when no api key is configured", async () => {
    const result = await generateTextSummaryWithGemini({
      apiKey: "",
      fileName: "test.pdf",
      sourceText: "Texte de test",
      fetchImplementation: vi.fn() as unknown as typeof fetch,
    });

    expect(result).toBeNull();
  });

  it("returns null when the extracted text is empty", async () => {
    const result = await generateTextSummaryWithGemini({
      apiKey: "test-key",
      fileName: "test.pdf",
      sourceText: "   ",
      fetchImplementation: vi.fn() as unknown as typeof fetch,
    });

    expect(result).toBeNull();
  });

  it("requests Gemini and extracts the returned summary", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn(async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "Resume Gemini du PDF" }],
            },
          },
        ],
      })),
    });

    const result = await generateTextSummaryWithGemini({
      apiKey: "test-key",
      fileName: "garde-a-vue.pdf",
      sourceText: "Texte extrait du document",
      fetchImplementation: fetchMock as unknown as typeof fetch,
    });

    expect(result).toBe("Resume Gemini du PDF");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses Flash-Lite as the default model", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn(async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "Resume Gemini du PDF" }],
            },
          },
        ],
      })),
    });

    await generateTextSummaryWithGemini({
      apiKey: "test-key",
      fileName: "garde-a-vue.pdf",
      sourceText: "Texte extrait du document",
      fetchImplementation: fetchMock as unknown as typeof fetch,
      model: undefined,
    });

    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-2.5-flash-lite");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`),
      expect.any(Object),
    );
  });
});
