"use client";

import { useEffect } from "react";

import { syncPendingDemoDocumentToAlerts, type DemoAlertCandidate } from "@/lib/demo-browser-storage";

export function DemoPendingDocumentSync({
  demoStorageMode,
  alerts,
  successMessage,
}: {
  demoStorageMode: boolean;
  alerts: DemoAlertCandidate[];
  successMessage?: string | null;
}) {
  useEffect(() => {
    if (!demoStorageMode || !successMessage) {
      return;
    }

    syncPendingDemoDocumentToAlerts(alerts);
  }, [alerts, demoStorageMode, successMessage]);

  return null;
}
