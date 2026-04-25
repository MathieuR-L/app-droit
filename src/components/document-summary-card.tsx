import { FileText } from "lucide-react";

import { getCustodyRecordDownloadUrl } from "@/lib/custody-records";
import { isVercelDemoStorageMode } from "@/lib/runtime-database";
import { formatDateTime } from "@/lib/utils";

import { DocumentOpenButton } from "./document-open-button";

export function DocumentSummaryCard({
  alertId,
  fileName,
  pageCount,
  uploadedAt,
}: {
  alertId: string;
  fileName?: string | null;
  pageCount?: number | null;
  uploadedAt?: Date | string | null;
}) {
  if (!fileName) {
    return null;
  }
  const demoStorageMode = isVercelDemoStorageMode();

  return (
    <section className="rounded-[1.4rem] border border-sky-300 bg-sky-100/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-950">
            <FileText className="h-4 w-4" />
            <p className="text-sm font-semibold">PDF de garde à vue joint</p>
          </div>
          <p className="text-sm font-medium text-slate-900">{fileName}</p>
          <p className="text-xs leading-6 text-slate-700">
            {pageCount ? `${pageCount} pages` : "Nombre de pages non détecté"}
            {uploadedAt ? ` • Téléversé le ${formatDateTime(uploadedAt)}` : ""}
          </p>
        </div>

        <DocumentOpenButton
          alertId={alertId}
          downloadUrl={getCustodyRecordDownloadUrl(alertId)}
          demoStorageMode={demoStorageMode}
        />
      </div>
    </section>
  );
}
