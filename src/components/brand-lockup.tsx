import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandLockupProps = {
  href?: string;
  className?: string;
  textClassName?: string;
  subtitle?: string;
  theme?: "light" | "dark";
};

export function BrandLockup({
  href = "/",
  className,
  textClassName,
  subtitle = "Plateforme de garde à vue",
  theme = "light",
}: BrandLockupProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden p-1">
        <Image
          src="/gavence-logo.png"
          alt="Logo GAVence"
          width={96}
          height={96}
          className="h-full w-full object-contain"
          priority
        />
      </span>
      <span className={cn("flex flex-col", textClassName)}>
        <span className="font-[family-name:var(--font-heading)] text-3xl leading-none">
          GAVence
        </span>
        <span
          className={cn(
            "text-xs uppercase tracking-[0.28em]",
            theme === "dark" ? "text-white/70" : "text-slate-600",
          )}
        >
          {subtitle}
        </span>
      </span>
    </span>
  );

  return (
    <Link href={href} className="inline-flex w-fit items-center">
      {content}
    </Link>
  );
}
