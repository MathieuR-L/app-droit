import { Role } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";

import { closeAlertAction, createAlertAction } from "@/app/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { DashboardShell } from "@/components/dashboard-shell";
import { FeedbackBanner } from "@/components/feedback-banner";
import { NotificationsPanel } from "@/components/notifications-panel";
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
      subtitle="Declare une garde a vue, visualise qui a ete notifie et suis l'escalade en temps reel sur ta ville."
      accent="blue"
    >
      <AutoRefresh intervalMs={15000} />

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
                {user.city ? CITY_LABELS[user.city] : "A definir"}
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
                Acceptees / cloturees
              </p>
              <p className="mt-4 font-[family-name:var(--font-heading)] text-4xl text-slate-950">
                {acceptedCount + closedCount}
              </p>
            </div>
          </div>

          <SectionCard
            title="Nouvelle garde a vue"
            description="Le dossier est automatiquement envoye a l'avocat de permanence de la meme ville."
          >
            <form action={createAlertAction} className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Nom du garde a vue
                </span>
                <input
                  type="text"
                  name="suspectName"
                  required
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-slate-900"
                  placeholder="Nom ou reference interne"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">
                  Service / commissariat
                </span>
                <input
                  type="text"
                  name="policeStation"
                  required
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-slate-900"
                  placeholder="Commissariat central"
                />
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Notes</span>
                <textarea
                  name="notes"
                  rows={4}
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-slate-900"
                  placeholder="Elements utiles pour l'avocat de permanence"
                />
              </label>

              <button
                type="submit"
                className="md:col-span-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-slate-800"
              >
                Signaler la garde a vue
              </button>
            </form>
          </SectionCard>

          <SectionCard
            title="Demandes recentes"
            description="Chaque dossier affiche le statut courant, l'avocat contacte et l'historique des notifications."
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
                              {alert.policeStation} • Creee le {formatDateTime(alert.createdAt)}
                            </p>
                          </div>
                          <p className="text-sm leading-6 text-slate-700">
                            Avocat contacte: <strong>{activeLawyer}</strong>
                            {alert.responseDeadline
                              ? ` • Echeance: ${formatDateTime(alert.responseDeadline)}`
                              : ""}
                          </p>
                          {alert.notes ? (
                            <p className="rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                              {alert.notes}
                            </p>
                          ) : null}
                        </div>

                        {alert.status === "ACCEPTED" ? (
                          <form action={closeAlertAction}>
                            <input type="hidden" name="alertId" value={alert.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                            >
                              Cloturer le dossier
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
                                Priorite {assignment.priority} • {assignment.lawyer.name}
                              </p>
                              <StatusBadge
                                label={ASSIGNMENT_STATUS_LABELS[assignment.status]}
                                status={assignment.status}
                              />
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                              Notifie le {formatDateTime(assignment.notifiedAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[1.6rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-7 text-slate-600">
                  Aucune garde a vue enregistree pour le moment.
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
