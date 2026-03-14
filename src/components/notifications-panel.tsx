import { markNotificationsReadAction } from "@/app/actions";
import { formatDateTime } from "@/lib/utils";

import { SectionCard } from "./section-card";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
};

export function NotificationsPanel({
  notifications,
  returnTo,
}: {
  notifications: NotificationItem[];
  returnTo: string;
}) {
  return (
    <SectionCard
      title="Notifications"
      description="Le flux des alertes et des reponses apparait ici en continu."
      className="h-full"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          {notifications.length} notification{notifications.length > 1 ? "s" : ""}
        </p>
        <form action={markNotificationsReadAction}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className="rounded-full border border-stone-400 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-800 transition hover:border-slate-950 hover:text-slate-950"
          >
            Tout marquer comme lu
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {notifications.length ? (
          notifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-3xl border p-4 ${
                notification.readAt
                  ? "border-stone-300 bg-stone-50"
                  : "border-sky-300 bg-sky-100/70"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-slate-950">
                  {notification.title}
                </h3>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-700">
                  {notification.readAt ? "Lu" : "Nouveau"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-800">
                {notification.message}
              </p>
              <p className="mt-3 text-xs text-slate-700">
                {formatDateTime(notification.createdAt)}
              </p>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-stone-400 bg-stone-50 p-5 text-sm text-slate-700">
            Aucune notification pour le moment.
          </div>
        )}
      </div>
    </SectionCard>
  );
}
