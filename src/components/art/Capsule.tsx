import { cn } from "@/components/ui/cn";

/** Pares de colores (mitad intensa / mitad clara) de las cápsulas. Solo se usan en ilustraciones. */
export const CAPSULE_COLORS = [
  { id: "verde", a: "#00a67e", b: "#ffffff", label: "Verde" },
  { id: "azul", a: "#2e6bff", b: "#dce7ff", label: "Azul" },
  { id: "coral", a: "#ff6b57", b: "#ffffff", label: "Coral" },
  { id: "ambar", a: "#f2a33a", b: "#fff1d6", label: "Ámbar" },
  { id: "violeta", a: "#7a5af8", b: "#e7e0ff", label: "Violeta" },
  { id: "bosque", a: "#00835f", b: "#d3f1e6", label: "Bosque" },
] as const;

export type CapsuleColorId = (typeof CAPSULE_COLORS)[number]["id"];

export function capsuleColor(id: string | undefined) {
  return CAPSULE_COLORS.find((c) => c.id === id) ?? CAPSULE_COLORS[0];
}

/** Dibujo de una cápsula horizontal centrada en (0, 0): 80 × 36 unidades. */
export function CapsuleShape({ a, b }: { a: string; b: string }) {
  return (
    <>
      <rect x="-40" y="-18" width="80" height="36" rx="18" fill={b} />
      <path d="M0 -18H-22A18 18 0 0 0 -22 18H0Z" fill={a} />
      <rect x="-33" y="-12.5" width="40" height="5" rx="2.5" fill="#fff" opacity=".4" />
      <path d="M0 -18V18" stroke="#0d2b33" strokeOpacity=".14" strokeWidth="1.2" />
      <rect x="-40" y="-18" width="80" height="36" rx="18" fill="none" stroke="#0d2b33" strokeOpacity=".16" strokeWidth="1.4" />
    </>
  );
}

/** Cápsula como icono en línea (listas, tarjetas, pastillero). */
export function CapsuleIcon({ color, className }: { color?: string; className?: string }) {
  const c = capsuleColor(color);
  return (
    <svg viewBox="-44 -40 88 80" className={cn("size-8", className)} aria-hidden="true">
      <g transform="rotate(-35)">
        <CapsuleShape a={c.a} b={c.b} />
      </g>
    </svg>
  );
}

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const v = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** Color (blanco o tinta) que mejor se lee sobre el color intenso de una cápsula, por ejemplo para una marca de «tomada». */
export function onCapsule(id: string | undefined): "#ffffff" | "#0d2b33" {
  const l = luminance(capsuleColor(id).a);
  const withWhite = 1.05 / (l + 0.05);
  const withInk = (l + 0.05) / (luminance("#0d2b33") + 0.05);
  return withWhite >= withInk ? "#ffffff" : "#0d2b33";
}
