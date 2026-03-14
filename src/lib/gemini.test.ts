import { describe, expect, it, vi } from "vitest";

import { generatePdfSummaryWithGemini } from "./gemini";

describe("generatePdfSummaryWithGemini", () => {
  it("returns null when no api key is configured", async () => {
    const result = await generatePdfSummaryWithGemini({
      apiKey: "",
      fileName: "test.pdf",
      pdfBuffer: Buffer.from("%PDF-1.4"),
      fetchImplementation: vi.fn() as unknown as typeof fetch,
    });

    expect(result).toBeNull();
  });

  it("uploads, summarizes and deletes the Gemini file", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn((header: string) =>
            header === "x-goog-upload-url" ? "https://upload.example.test" : null,
          ),
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({
          file: {
            name: "files/123",
            uri: "https://files.example.test/123",
            mimeType: "application/pdf",
          },
        })),
      })
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        ok: true,
      });

    const result = await generatePdfSummaryWithGemini({
      apiKey: "test-key",
      fileName: "garde-a-vue.pdf",
      pdfBuffer: Buffer.from("%PDF-1.4"),
      fetchImplementation: fetchMock as unknown as typeof fetch,
    });

    expect(result).toBe("Resume Gemini du PDF");
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
