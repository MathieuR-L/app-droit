import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("custody records module loading", () => {
  it("does not depend on local PDF parsing or Gemini summary generation", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "lib", "custody-records.ts"),
      "utf8",
    );

    expect(source).not.toContain('import { PDFParse } from "pdf-parse"');
    expect(source).not.toContain("pdf-parse");
    expect(source).not.toContain("streamPdfSummaryWithGemini");
    expect(source).not.toContain("Gemini");
  });
});
