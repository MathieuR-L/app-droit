"use client";

import { useState } from "react";

import {
  clearPendingDemoDocument,
  stagePendingDemoDocument,
} from "@/lib/demo-browser-storage";

export function PolicierAlertFileFields({
  demoStorageMode,
}: {
  demoStorageMode: boolean;
}) {
  const [isPreparingLocalCopy, setIsPreparingLocalCopy] = useState(false);
  const [localCopyMessage, setLocalCopyMessage] = useState<string | null>(null);
  const [localCopyTone, setLocalCopyTone] = useState<"success" | "warning">("success");

  return (
    <>
      <label className="block space-y-2 md:col-span-2">
        <span className="text-sm font-semibold text-slate-800">
          PDF de garde à vue
        </span>
        <input
          type="file"
          name="custodyRecord"
          accept="application/pdf,.pdf"
          className="w-full rounded-2xl border border-dashed border-sky-500 bg-sky-50 px-4 py-3 text-sm font-medium text-slate-900 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0];

            setLocalCopyMessage(null);

            if (!demoStorageMode || !file) {
              clearPendingDemoDocument();
              return;
            }

            setIsPreparingLocalCopy(true);

            try {
              const result = await stagePendingDemoDocument(file);
              setLocalCopyMessage(result.message);
              setLocalCopyTone(result.ok ? "success" : "warning");
            } catch {
              setLocalCopyMessage(
                "La copie locale du PDF n'a pas pu être préparée dans ce navigateur.",
              );
              setLocalCopyTone("warning");
            } finally {
              setIsPreparingLocalCopy(false);
            }
          }}
        />
        <p className="text-xs leading-6 text-slate-700">
          Format PDF uniquement. Le document sera joint à la garde à vue et
          restera consultable directement depuis l&apos;application.
        </p>
        {demoStorageMode ? (
          <p className="text-xs leading-6 text-slate-700">
            En mode démo Vercel, une copie locale du PDF est aussi enregistrée
            dans ce navigateur quand c&apos;est possible pour éviter les pertes
            liées au stockage serveur éphémère.
          </p>
        ) : null}
        {localCopyMessage ? (
          <p
            className={
              localCopyTone === "success"
                ? "text-xs leading-6 text-emerald-800"
                : "text-xs leading-6 text-amber-900"
            }
          >
            {localCopyMessage}
          </p>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={isPreparingLocalCopy}
        className="md:col-span-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-500"
      >
        {isPreparingLocalCopy
          ? "Préparation du PDF..."
          : "Signaler la garde à vue"}
      </button>
    </>
  );
}
