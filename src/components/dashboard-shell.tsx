import { City, Role } from "@prisma/client";

import { logoutAction } from "@/app/actions";
import { CITY_LABELS, ROLE_LABELS } from "@/lib/constants";
import { isVercelDemoStorageMode } from "@/lib/runtime-database";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  user: {
    name: string;
    email: string;
    role: Role;
    city: City | null;
  };
  title: string;
  subtitle: string;
  accent: "blue" | "emerald" | "amber";
  children: React.ReactNode;
};

const accentMap = {
  blue: {
    shell: "from-slate-950 via-slate-900 to-sky-950 ring-sky-300/40",
    pill: "bg-sky-100 text-sky-950 ring-1 ring-inset ring-sky-300/70",
    highlight: "text-sky-900",
  },
  emerald: {
    shell: "from-stone-950 via-emerald-950 to-teal-950 ring-emerald-300/40",
    pill: "bg-emerald-100 text-emerald-950 ring-1 ring-inset ring-emerald-300/70",
    highlight: "text-emerald-900",
  },
  amber: {
    shell: "from-stone-950 via-amber-950 to-orange-950 ring-amber-300/45",
    pill: "bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-300/70",
    highlight: "text-amber-900",
  },
} as const;

export function DashboardShell({
  user,
  title,
  subtitle,
  accent,
  children,
}: DashboardShellProps) {
  const palette = accentMap[accent];
  const showPersistenceWarning = isVercelDemoStorageMode();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_30%),linear-gradient(180deg,#f9f6ef_0%,#f2ece3_52%,#ece5da_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div
        className={cn(
          "mx-auto max-w-7xl overflow-hidden rounded-[2rem] shadow-[0_30px_120px_rgba(30,25,16,0.15)] ring-1",
          palette.shell,
        )}
      >
        <header className="border-b border-stone-300 bg-[#f2ece3] px-6 py-6 text-slate-950 sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className={cn("text-sm uppercase tracking-[0.35em]", palette.highlight)}>
                Plateforme GAVence
              </p>
              <div className="space-y-2">
                <h1 className="font-[family-name:var(--font-heading)] text-4xl leading-none text-slate-950 sm:text-5xl">
                  {title}
                </h1>
                <p className="max-w-3xl text-sm text-slate-800 sm:text-base">
                  {subtitle}
                </p>
                {showPersistenceWarning ? (
                  <p className="max-w-3xl rounded-2xl border border-amber-300 bg-amber-100/90 px-4 py-3 text-sm font-medium text-slate-950">
                    Mode demo Vercel detecte: sans base persistante configuree,
                    les gardes a vue et leurs PDF peuvent devenir introuvables
                    entre deux requetes.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className={cn("rounded-full px-4 py-2 text-sm font-semibold", palette.pill)}>
                {ROLE_LABELS[user.role]}
                {user.city ? ` • ${CITY_LABELS[user.city] ?? user.city}` : ""}
              </div>

              <div className="rounded-3xl border border-stone-300 bg-white/90 px-4 py-3 backdrop-blur-sm">
                <p className="text-sm font-semibold text-slate-950">{user.name}</p>
                <p className="text-xs text-slate-700">{user.email}</p>
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-full border border-stone-400 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-slate-950 hover:bg-stone-100"
                >
                  Se deconnecter
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="bg-white px-6 py-8 text-slate-900 sm:px-10">{children}</main>
      </div>
    </div>
  );
}
