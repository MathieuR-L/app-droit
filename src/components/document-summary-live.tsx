"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SummarySource = "local" | "gemini";

export function DocumentSummaryLive({
  summaryApiUrl,
  initialSummary,
  initialSource,
  pendingGeminiSummary,
}: {
  summaryApiUrl: string;
  initialSummary?: string | null;
  initialSource: SummarySource;
  pendingGeminiSummary: boolean;
}) {
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [source, setSource] = useState<SummarySource>(initialSource);
  const [isLoading, setIsLoading] = useState(
    pendingGeminiSummary && initialSource !== "gemini",
  );

  useEffect(() => {
    setSummary(initialSummary ?? "");
    setSource(initialSource);
    setIsLoading(pendingGeminiSummary && initialSource !== "gemini");
  }, [initialSource, initialSummary, pendingGeminiSummary]);

  useEffect(() => {
    if (!pendingGeminiSummary || initialSource === "gemini") {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function generateSummary() {
      try {
        const response = await fetch(summaryApiUrl, {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok || cancelled) {
          return;
        }

        const payload = (await response.json()) as {
          source?: SummarySource;
          summary?: string | null;
        };

        if (cancelled) {
          return;
        }

        if (typeof payload.summary === "string") {
          setSummary(payload.summary);
        }

        if (payload.source === "gemini") {
          setSource("gemini");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void generateSummary();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [initialSource, pendingGeminiSummary, summaryApiUrl]);

  const footnote = useMemo(() => {
    if (source === "gemini") {
      return "Ce resume a ete affine par Gemini Flash-Lite a partir du texte extrait du PDF. Il doit etre verifie avec le document original avant usage.";
    }

    if (pendingGeminiSummary && isLoading) {
      return "Le resume local est deja disponible. Gemini Flash-Lite prepare une version plus concise et la carte se mettra a jour automatiquement.";
    }

    return "Ce resume est genere localement a partir du texte extrait du PDF. Il doit etre verifie avec le document original avant usage.";
  }, [isLoading, pendingGeminiSummary, source]);

  return (
    <div className="mt-4 rounded-[1.2rem] border border-white bg-white px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">
          {source === "gemini" ? "Resume Gemini Flash-Lite" : "Resume automatique"}
        </p>
        {pendingGeminiSummary && isLoading ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-900">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Generation en cours
          </span>
        ) : null}
        {source === "gemini" ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-900">
            <Sparkles className="h-3.5 w-3.5" />
            IA active
          </span>
        ) : null}
      </div>

      <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-900">
        {summary || "Aucun resume automatique n'est disponible pour ce document."}
      </p>
      <p className="mt-3 text-xs leading-6 text-slate-700">{footnote}</p>
    </div>
  );
}
