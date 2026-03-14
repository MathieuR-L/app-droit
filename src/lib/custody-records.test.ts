import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("custody records module loading", () => {
  it("loads pdf-parse dynamically to avoid crashing unrelated routes", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src", "lib", "custody-records.ts"),
      "utf8",
    );

    expect(source).not.toContain('import { PDFParse } from "pdf-parse"');
    expect(source).toContain('await import("pdf-parse")');
  });
});
