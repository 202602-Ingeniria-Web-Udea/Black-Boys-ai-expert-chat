import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "brand" | "success" | "danger" | "warning";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  brand: "bg-brand-50 text-brand-700",
  success: "bg-brand-50 text-brand-700",
  danger: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-800",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}
