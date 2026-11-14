import Link from "next/link";
import { cn } from "@/components/ui/cn";

/**
 * Marca: una cápsula en diagonal sobre un cuadrado verde. La mitad clara de la cápsula repite
 * el motivo bicolor que usan las ilustraciones, los apartados de las respuestas y el pastillero.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 text-brand-600", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <g transform="rotate(-45 16 16)">
        <rect x="5" y="10.2" width="22" height="11.6" rx="5.8" fill="#fff" />
        <path d="M16 10.2h5.2a5.8 5.8 0 0 1 0 11.6H16z" fill="#a9e3ce" />
        <rect x="8.2" y="12.4" width="7" height="1.9" rx=".95" fill="#00835f" opacity=".16" />
      </g>
    </svg>
  );
}

export function Logo({ href = "/", name = "Botiquín", className }: { href?: string; name?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-xl", className)} aria-label={`${name}, ir al inicio`}>
      <LogoMark />
      <span className="text-[19px] font-bold tracking-tight text-ink">{name}</span>
    </Link>
  );
}
