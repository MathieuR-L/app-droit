import { City, Role } from "@prisma/client";

import { logoutAction } from "@/app/actions";
import { CITY_LABELS, ROLE_LABELS } from "@/lib/constants";
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
    shell:
      "from-slate-950 via-slate-900 to-sky-950 text-white ring-sky-300/40",
    pill: "bg-sky-200/18 text-sky-50 ring-1 ring-inset ring-sky-100/40",
    highlight: "text-sky-100",
  },
  emerald: {
    shell:
      "from-stone-950 via-emerald-950 to-teal-950 text-white ring-emerald-300/40",
    pill: "bg-emerald-200/18 text-emerald-50 ring-1 ring-inset ring-emerald-100/40",
    highlight: "text-emerald-100",
  },
  amber: {
    shell:
      "from-stone-950 via-amber-950 to-orange-950 text-white ring-amber-300/45",
    pill: "bg-amber-100/18 text-amber-50 ring-1 ring-inset ring-amber-100/40",
    highlight: "text-amber-50",
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_30%),linear-gradient(180deg,#f9f6ef_0%,#f2ece3_52%,#ece5da_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div
        className={cn(
          "mx-auto max-w-7xl overflow-hidden rounded-[2rem] shadow-[0_30px_120px_rgba(30,25,16,0.15)] ring-1",
          palette.shell,
        )}
      >
        <header className="border-b border-white/15 px-6 py-6 sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className={cn("text-sm uppercase tracking-[0.35em]", palette.highlight)}>
                Plateforme de permanence penale
              </p>
              <div className="space-y-2">
                <h1 className="font-[family-name:var(--font-heading)] text-4xl leading-none sm:text-5xl">
                  {title}
                </h1>
                <p className="max-w-3xl text-sm text-white/88 sm:text-base">
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className={cn("rounded-full px-4 py-2 text-sm font-semibold", palette.pill)}>
                {ROLE_LABELS[user.role]}
                {user.city ? ` • ${CITY_LABELS[user.city] ?? user.city}` : ""}
              </div>

              <div className="rounded-3xl border border-white/20 bg-white/12 px-4 py-3 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-white/80">{user.email}</p>
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-full border border-white/25 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/14"
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
