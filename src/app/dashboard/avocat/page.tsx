import { AssignmentStatus, Role } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";

import { acceptAlertAction, declineAlertAction } from "@/app/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { DashboardShell } from "@/components/dashboard-shell";
import { DocumentSummaryCard } from "@/components/document-summary-card";
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
import { formatDateTime, formatRelativeMinutes } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getMessage(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getResponseWindowLabel(notifiedAt: Date, responseDeadline: Date) {
  const minutes = Math.max(
    1,
    Math.round((responseDeadline.getTime() - notifiedAt.getTime()) / 60_000),
  );

  return formatRelativeMinutes(minutes);
}

export default async function AvocatDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  noStore();
  await processEscalations();
  const user = await requireRole(Role.AVOCAT);
  const params = await searchParams;
  const error = getMessage(params.error);
  const success = getMessage(params.success);

  const [notifications, dutyPosition, pendingAssignments, recentAssignments, acceptedAlerts] =
    await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      user.city
        ? prisma.dutyAssignment.findUnique({
            where: {
              city_lawyerId: {
                city: user.city,
                lawyerId: user.id,
              },
            },
          })
        : null,
      prisma.alertAssignment.findMany({
        where: {
          lawyerId: user.id,
          status: AssignmentStatus.PENDING,
          alert: {
            status: "PENDING",
          },
        },
        include: {
          alert: {
            include: {
              policeOfficer: {
                select: {
                  name: true,
                  city: true,
                },
              },
            },
          },
        },
        orderBy: { responseDeadline: "asc" },
      }),
      prisma.alertAssignment.findMany({
        where: {
          lawyerId: user.id,
          status: {
            in: [
              AssignmentStatus.ACCEPTED,
              AssignmentStatus.DECLINED,
              AssignmentStatus.EXPIRED,
            ],
          },
        },
        include: {
          alert: true,
        },
        orderBy: { notifiedAt: "desc" },
        take: 8,
      }),
      prisma.custodyAlert.findMany({
        where: { acceptedLawyerId: user.id },
        include: {
          policeOfficer: {
            select: {
              name: true,
              city: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  return (
    <DashboardShell
      user={user}
      title="Espace Avocat"
      subtitle="Recois les notifications de permanence, accepte ou refuse a temps, puis conserve un historique de tes interventions."
      accent="emerald"
    >
      <AutoRefresh intervalMs={15000} />

      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="space-y-4">
          <FeedbackBanner message={success} tone="success" />
          <FeedbackBanner message={error} tone="error" />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.6rem] bg-emerald-950 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">
                Ville
              </p>
              <p className="mt-4 font-[family-name:var(--font-heading)] text-4xl">
                {user.city ? CITY_LABELS[user.city] : "En attente"}
              </p>
            </div>
            <div className="rounded-[1.6rem] bg-emerald-50 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Priorite de garde
              </p>
              <p className="mt-4 font-[family-name:var(--font-heading)] text-4xl text-slate-950">
                {dutyPosition?.priority ?? "-"}
              </p>
            </div>
            <div className="rounded-[1.6rem] bg-stone-100 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Alertes en attente
              </p>
              <p className="mt-4 font-[family-name:var(--font-heading)] text-4xl text-slate-950">
                {pendingAssignments.length}
              </p>
            </div>
          </div>

          {!user.city ? (
            <SectionCard
              title="Affectation en attente"
              description="Ton compte avocat existe, mais le batonnier doit encore te rattacher a une ville pour que tu puisses etre de permanence."
            >
              <div className="rounded-[1.6rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-7 text-slate-600">
                Des que la ville sera attribuee, tu pourras etre ajoute a l&apos;ordre
                de permanence et recevoir les gardes a vue correspondantes.
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              title="Alertes actives"
              description="Chaque demande affiche l'heure limite. Si tu ne reponds pas, elle est transmise automatiquement a l'avocat suivant. Lorsqu'un PDF est joint, un resume local apparait ici puis Gemini Flash-Lite l'affine automatiquement."
            >
              <div className="space-y-4">
                {pendingAssignments.length ? (
                  pendingAssignments.map((assignment) => (
                    <article
                      key={assignment.id}
                      className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge label="A repondre" status="PENDING" />
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              {assignment.alert.reference}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-950">
                              {assignment.alert.suspectName}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {assignment.alert.policeStation} • {assignment.alert.policeOfficer.name}
                            </p>
                          </div>
                          <p className="text-sm leading-6 text-slate-700">
                            Echeance: <strong>{formatDateTime(assignment.responseDeadline)}</strong>
                          </p>
                          <p className="text-sm leading-6 text-slate-700">
                            Delai applique:{" "}
                            <strong>
                              {getResponseWindowLabel(
                                assignment.notifiedAt,
                                assignment.responseDeadline,
                              )}
                            </strong>
                          </p>
                          {assignment.alert.notes ? (
                            <p className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800">
                              {assignment.alert.notes}
                            </p>
                          ) : null}
                          <DocumentSummaryCard
                            alertId={assignment.alert.id}
                            extractedText={assignment.alert.custodyRecordExtract}
                            fileName={assignment.alert.custodyRecordFileName}
                            pageCount={assignment.alert.custodyRecordPageCount}
                            uploadedAt={assignment.alert.custodyRecordUploadedAt}
                            summary={assignment.alert.custodyRecordSummary}
                          />
                        </div>

                        <div className="flex gap-2">
                          <form action={acceptAlertAction}>
                            <input type="hidden" name="alertId" value={assignment.alertId} />
                            <button
                              type="submit"
                              className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                            >
                              Accepter
                            </button>
                          </form>
                          <form action={declineAlertAction}>
                            <input type="hidden" name="alertId" value={assignment.alertId} />
                            <button
                              type="submit"
                              className="rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                            >
                              Refuser
                            </button>
                          </form>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[1.6rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-7 text-slate-600">
                    Aucune alerte en attente pour le moment.
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          <SectionCard
            title="Interventions confirmees"
            description="Les dossiers que tu as acceptes restent visibles pour suivi rapide."
          >
            <div className="space-y-4">
              {acceptedAlerts.length ? (
                acceptedAlerts.map((alert) => (
                  <article
                    key={alert.id}
                    className="rounded-[1.6rem] border border-stone-200 bg-stone-50 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge
                        label={ALERT_STATUS_LABELS[alert.status]}
                        status={alert.status}
                      />
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {alert.reference}
                      </p>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">
                      {alert.suspectName}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {alert.policeStation} • {alert.policeOfficer.name} • Cree le{" "}
                      {formatDateTime(alert.createdAt)}
                    </p>
                    <div className="mt-4">
                      <DocumentSummaryCard
                        alertId={alert.id}
                        extractedText={alert.custodyRecordExtract}
                        fileName={alert.custodyRecordFileName}
                        pageCount={alert.custodyRecordPageCount}
                        uploadedAt={alert.custodyRecordUploadedAt}
                        summary={alert.custodyRecordSummary}
                      />
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.6rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-7 text-slate-600">
                  Aucune intervention acceptee pour le moment.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Historique des reponses"
            description="Tu retrouves ici tes decisions et les alertes expirees."
          >
            <div className="space-y-3">
              {recentAssignments.length ? (
                recentAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {assignment.alert.reference} • {assignment.alert.suspectName}
                        </p>
                        <p className="text-xs text-slate-500">
                          Notifie le {formatDateTime(assignment.notifiedAt)}
                        </p>
                      </div>
                      <StatusBadge
                        label={ASSIGNMENT_STATUS_LABELS[assignment.status]}
                        status={assignment.status}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.6rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-7 text-slate-600">
                  Aucun historique pour l&apos;instant.
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <NotificationsPanel
          notifications={notifications}
          returnTo="/dashboard/avocat"
        />
      </div>
    </DashboardShell>
  );
}
