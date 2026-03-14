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
        "rounded-3xl border px-4 py-3 text-sm",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-900",
      )}
    >
      {message}
    </div>
  );
}
