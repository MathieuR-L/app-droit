"use client";

export const DEMO_LOCAL_DOCUMENT_LIMIT_BYTES = 3 * 1024 * 1024;

const PENDING_DOCUMENT_KEY = "gavence.demo.pending-document";
const DOCUMENTS_KEY = "gavence.demo.documents";

export type PendingDemoDocument = {
  fileName: string;
  mimeType: string;
  dataUrl: string;
  size: number;
  createdAt: string;
};

export type StoredDemoDocument = PendingDemoDocument & {
  alertId: string;
  linkedAt: string;
};

export type DemoAlertCandidate = {
  id: string;
  fileName?: string | null;
  uploadedAt?: Date | string | null;
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T) {
  if (!canUseLocalStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseLocalStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeKey(key: string) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {}
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Impossible de lire le fichier dans le navigateur."));
    };

    reader.onerror = () => {
      reject(new Error("Impossible de lire le fichier dans le navigateur."));
    };

    reader.readAsDataURL(file);
  });
}

function getStoredDocuments() {
  return readJson<Record<string, StoredDemoDocument>>(DOCUMENTS_KEY, {});
}

function setStoredDocuments(documents: Record<string, StoredDemoDocument>) {
  return writeJson(DOCUMENTS_KEY, documents);
}

export function formatDemoLocalStorageLimit() {
  return `${Math.round(DEMO_LOCAL_DOCUMENT_LIMIT_BYTES / 1024 / 1024)} Mo`;
}

export function getPendingDemoDocument() {
  return readJson<PendingDemoDocument | null>(PENDING_DOCUMENT_KEY, null);
}

export function clearPendingDemoDocument() {
  removeKey(PENDING_DOCUMENT_KEY);
}

export async function stagePendingDemoDocument(file: File) {
  if (!canUseLocalStorage()) {
    return {
      ok: false as const,
      message:
        "Le stockage local du navigateur n'est pas disponible sur cet appareil.",
    };
  }

  if (file.size > DEMO_LOCAL_DOCUMENT_LIMIT_BYTES) {
    clearPendingDemoDocument();
    return {
      ok: false as const,
      message: `En mode démo Vercel, la copie locale du PDF est limitée à ${formatDemoLocalStorageLimit()}. Le document sera envoyé, mais il risque de ne pas pouvoir être rouvert ensuite depuis ce navigateur.`,
    };
  }

  const dataUrl = await readFileAsDataUrl(file);
  const pendingDocument: PendingDemoDocument = {
    fileName: file.name,
    mimeType: file.type || "application/pdf",
    dataUrl,
    size: file.size,
    createdAt: new Date().toISOString(),
  };

  if (!writeJson(PENDING_DOCUMENT_KEY, pendingDocument)) {
    return {
      ok: false as const,
      message:
        "Le navigateur n'a pas pu enregistrer la copie locale du PDF. Le document sera envoyé, mais son ouverture ultérieure pourra dépendre du serveur.",
    };
  }

  return {
    ok: true as const,
    message:
      "Une copie locale du PDF sera conservée dans ce navigateur pour la démo Vercel.",
  };
}

export function matchPendingDocumentToAlert(
  pendingDocument: PendingDemoDocument | null,
  alerts: DemoAlertCandidate[],
) {
  if (!pendingDocument) {
    return null;
  }

  const sameNameAlerts = alerts.filter(
    (alert) => alert.fileName?.trim() === pendingDocument.fileName.trim(),
  );

  if (!sameNameAlerts.length) {
    return null;
  }

  const pendingTimestamp = new Date(pendingDocument.createdAt).getTime();

  return sameNameAlerts
    .slice()
    .sort((left, right) => {
      const leftTime = left.uploadedAt ? new Date(left.uploadedAt).getTime() : 0;
      const rightTime = right.uploadedAt ? new Date(right.uploadedAt).getTime() : 0;

      return Math.abs(leftTime - pendingTimestamp) - Math.abs(rightTime - pendingTimestamp);
    })[0] ?? null;
}

export function syncPendingDemoDocumentToAlerts(alerts: DemoAlertCandidate[]) {
  const pendingDocument = getPendingDemoDocument();
  const matchedAlert = matchPendingDocumentToAlert(pendingDocument, alerts);

  if (!pendingDocument || !matchedAlert) {
    return null;
  }

  const documents = getStoredDocuments();

  documents[matchedAlert.id] = {
    ...pendingDocument,
    alertId: matchedAlert.id,
    linkedAt: new Date().toISOString(),
  };

  if (!setStoredDocuments(documents)) {
    return null;
  }

  clearPendingDemoDocument();

  return matchedAlert.id;
}

export function getDemoDocument(alertId: string) {
  const documents = getStoredDocuments();
  return documents[alertId] ?? null;
}

export function openDemoDocument(alertId: string) {
  const document = getDemoDocument(alertId);

  if (!document || typeof window === "undefined") {
    return false;
  }

  window.open(document.dataUrl, "_blank", "noopener,noreferrer");
  return true;
}
