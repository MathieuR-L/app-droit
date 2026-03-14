import { cn } from "@/lib/utils";

export function FeedbackBanner({
  message,
  tone,
}: {
  message?: string;
  tone: "success" | "error";
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-3xl border px-4 py-3 text-sm font-medium",
        tone === "success"
          ? "border-emerald-300 bg-emerald-100 text-emerald-950"
          : "border-rose-300 bg-rose-100 text-rose-950",
      )}
    >
      {message}
    </div>
  );
}
