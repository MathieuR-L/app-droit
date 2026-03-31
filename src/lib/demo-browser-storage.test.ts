import { describe, expect, it } from "vitest";

import { matchPendingDocumentToAlert } from "./demo-browser-storage";

describe("demo browser storage", () => {
  it("matches the pending PDF with the closest uploaded alert using the same file name", () => {
    const pendingDocument = {
      fileName: "garde-a-vue.pdf",
      mimeType: "application/pdf",
      dataUrl: "data:application/pdf;base64,AAA",
      size: 128,
      createdAt: "2026-03-31T11:00:00.000Z",
    };

    const matchedAlert = matchPendingDocumentToAlert(pendingDocument, [
      {
        id: "older-alert",
        fileName: "garde-a-vue.pdf",
        uploadedAt: "2026-03-31T10:20:00.000Z",
      },
      {
        id: "closest-alert",
        fileName: "garde-a-vue.pdf",
        uploadedAt: "2026-03-31T11:01:00.000Z",
      },
      {
        id: "wrong-file",
        fileName: "autre-document.pdf",
        uploadedAt: "2026-03-31T11:00:30.000Z",
      },
    ]);

    expect(matchedAlert?.id).toBe("closest-alert");
  });

  it("returns null when no uploaded alert matches the file name", () => {
    const pendingDocument = {
      fileName: "garde-a-vue.pdf",
      mimeType: "application/pdf",
      dataUrl: "data:application/pdf;base64,AAA",
      size: 128,
      createdAt: "2026-03-31T11:00:00.000Z",
    };

    expect(
      matchPendingDocumentToAlert(pendingDocument, [
        {
          id: "other-alert",
          fileName: "autre-document.pdf",
          uploadedAt: "2026-03-31T11:01:00.000Z",
        },
      ]),
    ).toBeNull();
  });
});
