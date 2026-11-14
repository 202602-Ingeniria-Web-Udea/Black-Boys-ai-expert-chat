import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

type Kind = "error" | "success" | "info";

const styles: Record<Kind, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-brand-200 bg-brand-50 text-brand-800",
  info: "border-sky-200 bg-sky-50 text-slate-800",
};

export function Alert({ kind = "info", children, className, action }: { kind?: Kind; children: ReactNode; className?: string; action?: ReactNode }) {
  const Icon = kind === "error" ? AlertCircle : kind === "success" ? CheckCircle2 : Info;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed", styles[kind], className)}
    >
      <Icon className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}
