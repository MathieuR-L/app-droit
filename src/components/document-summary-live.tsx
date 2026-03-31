"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getDemoSummary, storeDemoSummary } from "@/lib/demo-browser-storage";

type SummarySource = "local" | "gemini";

export function DocumentSummaryLive({
  alertId,
  demoStorageMode,
  summaryApiUrl,
  initialSummary,
  initialSource,
  pendingGeminiSummary,
}: {
  alertId: string;
  demoStorageMode: boolean;
  summaryApiUrl: string;
  initialSummary?: string | null;
  initialSource: SummarySource;
  pendingGeminiSummary: boolean;
}) {
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [source, setSource] = useState<SummarySource>(initialSource);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const localSummary = demoStorageMode ? getDemoSummary(alertId) : null;
    const resolvedSummary = initialSummary ?? localSummary?.summary ?? "";
    const resolvedSource = initialSummary ? initialSource : (localSummary?.source ?? initialSource);
    const shouldStream = pendingGeminiSummary && resolvedSource !== "gemini";

    setSummary(shouldStream ? "" : resolvedSummary);
    setSource(resolvedSource);
    setIsLoading(shouldStream);
  }, [alertId, demoStorageMode, initialSource, initialSummary, pendingGeminiSummary]);

  useEffect(() => {
    if (!demoStorageMode || !initialSummary?.trim()) {
      return;
    }

    storeDemoSummary(alertId, initialSummary, initialSource);
  }, [alertId, demoStorageMode, initialSource, initialSummary]);

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
          signal: controller.signal,
        });

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          const localSummary = demoStorageMode ? getDemoSummary(alertId) : null;

          if (localSummary) {
            setSummary(localSummary.summary);
            setSource(localSummary.source);
          }

          return;
        }

        if (!response.body) {
          const text = await response.text();

          if (!cancelled) {
            setSummary(text);
            setSource(text.startsWith("Gemini n'a") ? "local" : "gemini");

            if (!text.startsWith("Gemini n'a")) {
              storeDemoSummary(alertId, text, "gemini");
            }
          }

          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let streamedSummary = "";

        while (!cancelled) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value ?? new Uint8Array(), {
            stream: true,
          });

          if (!chunk) {
            continue;
          }

          streamedSummary += chunk;
          setSummary(streamedSummary);

          if (!streamedSummary.startsWith("Gemini n'a")) {
            setSource("gemini");
            storeDemoSummary(alertId, streamedSummary, "gemini");
          }
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
  }, [alertId, demoStorageMode, initialSource, pendingGeminiSummary, summaryApiUrl]);

  const footnote = useMemo(() => {
    if (pendingGeminiSummary && isLoading) {
      return "Le PDF est envoye directement a Gemini Flash-Lite. Le resume apparait ici progressivement au fil de la reponse.";
    }

    if (source === "gemini") {
      return "Ce resume a ete produit par Gemini Flash-Lite directement a partir du PDF. Il doit etre verifie avec le document original avant usage.";
    }

    return "Le PDF original reste disponible et doit rester la reference si aucun resume IA n'a encore ete produit.";
  }, [isLoading, pendingGeminiSummary, source]);

  const summaryLabel =
    source === "gemini" || pendingGeminiSummary
      ? "Resume Gemini Flash-Lite"
      : "Resume automatique";

  return (
    <div className="mt-4 rounded-[1.2rem] border border-white bg-white px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">
          {summaryLabel}
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
        {summary ||
          (isLoading
            ? "Analyse du PDF en cours..."
            : "Aucun resume automatique n'est disponible pour ce document.")}
      </p>
      <p className="mt-3 text-xs leading-6 text-slate-700">{footnote}</p>
    </div>
  );
}
