import { Role } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";

import { closeAlertAction, createAlertAction } from "@/app/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { DashboardShell } from "@/components/dashboard-shell";
import { DemoPendingDocumentSync } from "@/components/demo-pending-document-sync";
import { DocumentSummaryCard } from "@/components/document-summary-card";
import { FeedbackBanner } from "@/components/feedback-banner";
import { NotificationsPanel } from "@/components/notifications-panel";
import { PolicierAlertFileFields } from "@/components/policier-alert-file-fields";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { processEscalations } from "@/lib/alerts";
import { requireRole } from "@/lib/auth";
import {
  ALERT_STATUS_LABELS,
  ASSIGNMENT_STATUS_LABELS,
  CITY_LABELS,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { isVercelDemoStorageMode } from "@/lib/runtime-database";
import { formatDateTime } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getMessage(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PolicierDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  noStore();
  await processEscalations();
  const user = await requireRole(Role.POLICIER);
  const params = await searchParams;
  const error = getMessage(params.error);
  const success = getMessage(params.success);
  const demoStorageMode = isVercelDemoStorageMode();

  const [alerts, notifications] = await Promise.all([
    prisma.custodyAlert.findMany({
      where: { policeOfficerId: user.id },
      include: {
        currentLawyer: {
          select: { name: true },
        },
        acceptedLawyer: {
          select: { name: true },
        },
        assignments: {
          include: {
            lawyer: {
              select: { name: true },
            },
          },
          orderBy: { priority: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const pendingCount = alerts.filter((alert) => alert.status === "PENDING").length;
  const acceptedCount = alerts.filter((alert) => alert.status === "ACCEPTED").length;
  const closedCount = alerts.filter((alert) => alert.status === "CLOSED").length;

  return (
    <DashboardShell
      user={user}
      title="Espace Policier"
      subtitle="Déclare une garde à vue, visualise qui a été notifié et suis l'escalade en temps réel sur ta ville."
      accent="blue"
    >
      <AutoRefresh intervalMs={15000} />
      <DemoPendingDocumentSync
        demoStorageMode={demoStorageMode}
        alerts={alerts.map((alert) => ({
          id: alert.id,
          fileName: alert.custodyRecordFileName,
          uploadedAt: alert.custodyRecordUploadedAt?.toISOString() ?? null,
        }))}
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <FeedbackBanner message={success} tone="success" />
          <FeedbackBanner message={error} tone="error" />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.6rem] bg-slate-950 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-200/75">
                Ville
              </p>
              <p className="mt-4 font-[family-name:var(--font-heading)] text-4xl">
                {user.city ? CITY_LABELS[user.city] : "À définir"}
              </p>
            </div>
            <div className="rounded-[1.6rem] bg-sky-50 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                En attente
              </p>
              <p className="mt-4 font-[family-name:var(--font-heading)] text-4xl text-slate-950">
                {pendingCount}
              </p>
            </div>
            <div className="rounded-[1.6rem] bg-emerald-50 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Acceptées / clôturées
              </p>
              <p className="mt-4 font-[family-name:var(--font-heading)] text-4xl text-slate-950">
                {acceptedCount + closedCount}
              </p>
            </div>
          </div>

          <SectionCard
            title="Nouvelle garde à vue"
            description="Le dossier est automatiquement envoyé à l'avocat de permanence de la même ville. Tu peux joindre un PDF pour que l'avocat puisse le consulter directement."
          >
            <form
              action={createAlertAction}
              className="grid gap-4 md:grid-cols-2"
              encType="multipart/form-data"
            >
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-800">
                  Nom du garde à vue
                </span>
                <input
                  type="text"
                  name="suspectName"
                  required
                  className="w-full rounded-2xl border border-stone-400 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-slate-950"
                  placeholder="Nom ou référence interne"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-800">
                  Service / commissariat
                </span>
                <input
                  type="text"
                  name="policeStation"
                  required
                  className="w-full rounded-2xl border border-stone-400 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-slate-950"
                  placeholder="Commissariat central"
                />
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-800">Notes</span>
                <textarea
                  name="notes"
                  rows={4}
                  className="w-full rounded-2xl border border-stone-400 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-slate-950"
                  placeholder="Éléments utiles pour l'avocat de permanence"
                />
              </label>

              <PolicierAlertFileFields demoStorageMode={demoStorageMode} />
            </form>
          </SectionCard>

          <SectionCard
            title="Demandes récentes"
            description="Chaque dossier affiche le statut courant, l'avocat contacté et l'historique des notifications."
          >
            <div className="space-y-4">
              {alerts.length ? (
                alerts.map((alert) => {
                  const activeLawyer =
                    alert.acceptedLawyer?.name ??
                    alert.currentLawyer?.name ??
                    "En attente d'affectation";

                  return (
                    <article
                      key={alert.id}
                      className="rounded-[1.6rem] border border-stone-200 bg-stone-50 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge
                              label={ALERT_STATUS_LABELS[alert.status]}
                              status={alert.status}
                            />
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              {alert.reference}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-950">
                              {alert.suspectName}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {alert.policeStation} • Créée le {formatDateTime(alert.createdAt)}
                            </p>
                          </div>
                          <p className="text-sm leading-6 text-slate-700">
                            Avocat contacté: <strong>{activeLawyer}</strong>
                            {alert.responseDeadline
                              ? ` • Échéance: ${formatDateTime(alert.responseDeadline)}`
                              : ""}
                          </p>
                          {alert.notes ? (
                            <p className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800">
                              {alert.notes}
                            </p>
                          ) : null}
                          <DocumentSummaryCard
                            alertId={alert.id}
                            fileName={alert.custodyRecordFileName}
                            pageCount={alert.custodyRecordPageCount}
                            uploadedAt={alert.custodyRecordUploadedAt}
                          />
                        </div>

                        {alert.status === "ACCEPTED" ? (
                          <form action={closeAlertAction}>
                            <input type="hidden" name="alertId" value={alert.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                            >
                              Clôturer le dossier
                            </button>
                          </form>
                        ) : null}
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {alert.assignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="rounded-2xl border border-stone-200 bg-white px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-950">
                                Priorité {assignment.priority} • {assignment.lawyer.name}
                              </p>
                              <StatusBadge
                                label={ASSIGNMENT_STATUS_LABELS[assignment.status]}
                                status={assignment.status}
                              />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                              Notifié le {formatDateTime(assignment.notifiedAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[1.6rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-7 text-slate-600">
                  Aucune garde à vue enregistrée pour le moment.
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <NotificationsPanel
          notifications={notifications}
          returnTo="/dashboard/policier"
        />
      </div>
    </DashboardShell>
  );
}
