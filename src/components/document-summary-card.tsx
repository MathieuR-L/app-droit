import { FileText } from "lucide-react";

import {
  getCustodyRecordDownloadUrl,
  getCustodyRecordSummaryState,
  getRenderableCustodyRecordSummary,
} from "@/lib/custody-records";
import { isVercelDemoStorageMode } from "@/lib/runtime-database";
import { formatDateTime } from "@/lib/utils";

import { DocumentOpenButton } from "./document-open-button";
import { DocumentSummaryLive } from "./document-summary-live";

export function DocumentSummaryCard({
  alertId,
  fileName,
  pageCount,
  uploadedAt,
  summary,
}: {
  alertId: string;
  fileName?: string | null;
  pageCount?: number | null;
  uploadedAt?: Date | string | null;
  summary?: string | null;
}) {
  if (!fileName) {
    return null;
  }

  const { canEnhanceWithGemini, pendingGeminiSummary, source } =
    getCustodyRecordSummaryState({
      fileName,
      summary,
    });
  const demoStorageMode = isVercelDemoStorageMode();

  const initialSummary =
    canEnhanceWithGemini && source !== "gemini"
      ? null
      : getRenderableCustodyRecordSummary(summary);

  return (
    <section className="rounded-[1.4rem] border border-sky-300 bg-sky-100/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-950">
            <FileText className="h-4 w-4" />
            <p className="text-sm font-semibold">PDF de garde a vue joint</p>
          </div>
          <p className="text-sm font-medium text-slate-900">{fileName}</p>
          <p className="text-xs leading-6 text-slate-700">
            {pageCount ? `${pageCount} pages` : "Nombre de pages non detecte"}
            {uploadedAt ? ` • Televerse le ${formatDateTime(uploadedAt)}` : ""}
          </p>
        </div>

        <DocumentOpenButton
          alertId={alertId}
          downloadUrl={getCustodyRecordDownloadUrl(alertId)}
          demoStorageMode={demoStorageMode}
        />
      </div>

      <DocumentSummaryLive
        alertId={alertId}
        demoStorageMode={demoStorageMode}
        summaryApiUrl={`/api/alerts/${alertId}/summary`}
        initialSummary={initialSummary}
        initialSource={source}
        pendingGeminiSummary={canEnhanceWithGemini && pendingGeminiSummary}
      />
    </section>
  );
}
