import { cn } from "@/lib/utils";

const styles = {
  PENDING: "bg-amber-100 text-amber-900",
  ACCEPTED: "bg-emerald-100 text-emerald-900",
  UNANSWERED: "bg-rose-100 text-rose-900",
  CLOSED: "bg-slate-200 text-slate-800",
  DECLINED: "bg-rose-100 text-rose-900",
  EXPIRED: "bg-orange-100 text-orange-900",
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
