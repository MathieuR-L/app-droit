"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { openDemoDocument } from "@/lib/demo-browser-storage";

export function DocumentOpenButton({
  alertId,
  downloadUrl,
  demoStorageMode,
}: {
  alertId: string;
  downloadUrl: string;
  demoStorageMode: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-950 hover:text-white"
        onClick={async () => {
          setError(null);

          if (demoStorageMode && openDemoDocument(alertId)) {
            return;
          }

          if (!demoStorageMode) {
            window.open(downloadUrl, "_blank", "noopener,noreferrer");
            return;
          }

          try {
            const response = await fetch(downloadUrl, {
              cache: "no-store",
            });

            if (!response.ok) {
              throw new Error();
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            window.open(objectUrl, "_blank", "noopener,noreferrer");
            window.setTimeout(() => {
              URL.revokeObjectURL(objectUrl);
            }, 60_000);
          } catch {
            setError(
              "Le PDF n'est disponible que dans le navigateur qui l'a televerse tant que la demo Vercel n'utilise pas de base persistante.",
            );
          }
        }}
      >
        <Download className="h-4 w-4" />
        Ouvrir le PDF
      </button>

      {error ? <p className="max-w-xs text-xs leading-6 text-amber-900">{error}</p> : null}
    </div>
  );
}
