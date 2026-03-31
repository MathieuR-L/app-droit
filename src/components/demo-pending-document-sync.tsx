"use client";

import { useEffect } from "react";

import { syncPendingDemoDocumentToAlerts, type DemoAlertCandidate } from "@/lib/demo-browser-storage";

export function DemoPendingDocumentSync({
  demoStorageMode,
  alerts,
}: {
  demoStorageMode: boolean;
  alerts: DemoAlertCandidate[];
}) {
  useEffect(() => {
    if (!demoStorageMode || !alerts.length) {
      return;
    }

    syncPendingDemoDocumentToAlerts(alerts);
  }, [alerts, demoStorageMode]);

  return null;
}
