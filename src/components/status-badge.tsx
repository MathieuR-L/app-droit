import { cn } from "@/lib/utils";

const styles = {
  PENDING: "border border-amber-300 bg-amber-100 text-amber-950",
  ACCEPTED: "border border-emerald-300 bg-emerald-100 text-emerald-950",
  UNANSWERED: "border border-rose-300 bg-rose-100 text-rose-950",
  CLOSED: "border border-slate-300 bg-slate-200 text-slate-900",
  DECLINED: "border border-rose-300 bg-rose-100 text-rose-950",
  EXPIRED: "border border-orange-300 bg-orange-100 text-orange-950",
} as const;

export function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: keyof typeof styles;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
        styles[status],
      )}
    >
      {label}
    </span>
  );
}
