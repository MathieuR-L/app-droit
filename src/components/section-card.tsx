import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.75rem] border border-stone-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(44,33,16,0.08)] backdrop-blur-sm",
        className,
      )}
    >
      <div className="mb-5 space-y-1">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
