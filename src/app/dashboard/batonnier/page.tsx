import { Role } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";

import {
  addLawyerToDutyAction,
  assignLawyerCityAction,
  moveDutyDownAction,
  moveDutyUpAction,
  removeDutyAssignmentAction,
  updateResponseWindowAction,
} from "@/app/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { DashboardShell } from "@/components/dashboard-shell";
import { DemoPendingDocumentSync } from "@/components/demo-pending-document-sync";
import { DocumentSummaryCard } from "@/components/document-summary-card";
import { FeedbackBanner } from "@/components/feedback-banner";
import { NotificationsPanel } from "@/components/notifications-panel";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { processEscalations } from "@/lib/alerts";
import { requireRole } from "@/lib/auth";
import { ALERT_STATUS_LABELS, CITY_LABELS, CITY_OPTIONS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { isVercelDemoStorageMode } from "@/lib/runtime-database";
import { formatDateTime } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getMessage(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BatonnierDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  noStore();
  await processEscalations();
  const user = await requireRole(Role.BATONNIER);
  const params = await searchParams;
  const error = getMessage(params.error);
  const success = getMessage(params.success);
  const demoStorageMode = isVercelDemoStorageMode();

  const [lawyers, responseSettings, dutyAssignments, recentAlerts, notifications] =
    await Promise.all([
      prisma.user.findMany({
        where: { role: Role.AVOCAT },
        include: {
          dutyAssignments: {
            orderBy: { priority: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.responseSetting.findMany({
        orderBy: { city: "asc" },
      }),
      prisma.dutyAssignment.findMany({
        include: {
          lawyer: {
            select: {
              id: true,
              name: true,
              email: true,
              city: true,
            },
          },
        },
        orderBy: [{ city: "asc" }, { priority: "asc" }],
      }),
      prisma.custodyAlert.findMany({
        include: {
          policeOfficer: {
            select: {
              name: true,
            },
          },
          currentLawyer: {
            select: {
              name: true,
            },
          },
          acceptedLawyer: {
            select: {
              name: true,
            },
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

  const dutyByCity = Object.fromEntries(
    CITY_OPTIONS.map((city) => [
      city.value,
      dutyAssignments.filter((assignment) => assignment.city === city.value),
    ]),
  ) as Record<(typeof CITY_OPTIONS)[number]["value"], typeof dutyAssignments>;

  const settingsMap = new Map(
    responseSettings.map((setting) => [setting.city, setting.responseWindowMinutes]),
  );

  return (
    <DashboardShell
      user={user}
      title="Espace Bâtonnier"
      subtitle="Assigne les villes, règle les délais de réponse et compose l'ordre de permanence sur chaque ressort."
      accent="amber"
    >
      <AutoRefresh intervalMs={20000} />
      <DemoPendingDocumentSync
        demoStorageMode={demoStorageMode}
        alerts={recentAlerts.map((alert) => ({
          id: alert.id,
          fileName: alert.custodyRecordFileName,
          uploadedAt: alert.custodyRecordUploadedAt?.toISOString() ?? null,
        }))}
      />

      <div className="space-y-4">
        <FeedbackBanner message={success} tone="success" />
        <FeedbackBanner message={error} tone="error" />

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <SectionCard
            title="Attribuer une ville à un avocat"
            description="Le rattachement à une ville conditionne ensuite l'intégration dans l'ordre de permanence."
          >
            <form action={assignLawyerCityAction} className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Avocat</span>
                <select
                  name="lawyerId"
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-slate-900"
                >
                  {lawyers.map((lawyer) => (
                    <option key={lawyer.id} value={lawyer.id}>
                      {lawyer.name}
                      {lawyer.city ? ` • ${CITY_LABELS[lawyer.city]}` : " • Sans ville"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Ville</span>
                <select
                  name="city"
                  className="w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 outline-none transition focus:border-slate-900"
                >
                  {CITY_OPTIONS.map((city) => (
                    <option key={city.value} value={city.value}>
                      {city.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="md:col-span-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-slate-800"
              >
                Enregistrer la ville
              </button>
            </form>

            <div className="mt-6 grid gap-3">
              {lawyers.map((lawyer) => (
                <div
                  key={lawyer.id}
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-slate-950">{lawyer.name}</p>
                  <p className="text-xs text-slate-500">
                    {lawyer.email} • {lawyer.city ? CITY_LABELS[lawyer.city] : "Sans ville assignée"}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          <NotificationsPanel
            notifications={notifications}
            returnTo="/dashboard/batonnier"
          />
        </div>

        <SectionCard
          title="Permanences par ville"
          description="Chaque ville dispose de son propre délai de réponse et de son ordre de priorité."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            {CITY_OPTIONS.map((city) => {
              const assignments = dutyByCity[city.value];
              const assignedLawyerIds = new Set(
                assignments.map((assignment) => assignment.lawyer.id),
              );
              const availableLawyers = lawyers.filter(
                (lawyer) =>
                  lawyer.city === city.value && !assignedLawyerIds.has(lawyer.id),
              );

              return (
                <article
                  key={city.value}
                  className="rounded-[1.6rem] border border-stone-200 bg-stone-50 p-5"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Ressort
                      </p>
                      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-3xl text-slate-950">
                        {city.label}
                      </h3>
                    </div>

                    <form action={updateResponseWindowAction} className="flex items-end gap-2">
                      <input type="hidden" name="city" value={city.value} />
                      <label className="block space-y-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Délai
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          name="responseWindowMinutes"
                          defaultValue={settingsMap.get(city.value) ?? 10}
                          className="w-24 rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-slate-900"
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded-full border border-slate-900 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white"
                      >
                        Mettre à jour
                      </button>
                    </form>
                  </div>

                  <form action={addLawyerToDutyAction} className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <input type="hidden" name="city" value={city.value} />
                    <select
                      name="lawyerId"
                      className="min-w-0 flex-1 rounded-2xl border border-stone-300 bg-white px-4 py-3 outline-none transition focus:border-slate-900"
                    >
                      {availableLawyers.length ? (
                        availableLawyers.map((lawyer) => (
                          <option key={lawyer.id} value={lawyer.id}>
                            {lawyer.name}
                          </option>
                        ))
                      ) : (
                        <option value="">Aucun avocat disponible pour cette ville</option>
                      )}
                    </select>
                    <button
                      type="submit"
                      disabled={!availableLawyers.length}
                      className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Ajouter à la permanence
                    </button>
                  </form>

                  <div className="mt-5 space-y-3">
                    {assignments.length ? (
                      assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="rounded-2xl border border-stone-200 bg-white p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-950">
                                Priorité {assignment.priority} • {assignment.lawyer.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {assignment.lawyer.email}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <form action={moveDutyUpAction}>
                                <input
                                  type="hidden"
                                  name="assignmentId"
                                  value={assignment.id}
                                />
                                <button
                                  type="submit"
                                  className="rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                                >
                                  Monter
                                </button>
                              </form>
                              <form action={moveDutyDownAction}>
                                <input
                                  type="hidden"
                                  name="assignmentId"
                                  value={assignment.id}
                                />
                                <button
                                  type="submit"
                                  className="rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
                                >
                                  Descendre
                                </button>
                              </form>
                              <form action={removeDutyAssignmentAction}>
                                <input
                                  type="hidden"
                                  name="assignmentId"
                                  value={assignment.id}
                                />
                                <button
                                  type="submit"
                                  className="rounded-full border border-rose-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 transition hover:bg-rose-50"
                                >
                                  Retirer
                                </button>
                              </form>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-5 text-sm leading-7 text-slate-600">
                        Aucun avocat de permanence n&apos;est configuré pour cette ville.
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          title="Vue système des alertes"
          description="Le bâtonnier peut vérifier l'état des sollicitations sur l'ensemble des villes et consulter les PDF joints."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {recentAlerts.length ? (
              recentAlerts.map((alert) => (
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
                    {CITY_LABELS[alert.city]} • {alert.policeStation}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Policier: {alert.policeOfficer.name}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Avocat courant:{" "}
                    {alert.acceptedLawyer?.name ??
                      alert.currentLawyer?.name ??
                      "Aucun"}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">
                    Créée le {formatDateTime(alert.createdAt)}
                  </p>
                  <div className="mt-4">
                    <DocumentSummaryCard
                      alertId={alert.id}
                      fileName={alert.custodyRecordFileName}
                      pageCount={alert.custodyRecordPageCount}
                      uploadedAt={alert.custodyRecordUploadedAt}
                    />
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.6rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-7 text-slate-600">
                Aucune alerte en base pour l&apos;instant.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </DashboardShell>
  );
}
