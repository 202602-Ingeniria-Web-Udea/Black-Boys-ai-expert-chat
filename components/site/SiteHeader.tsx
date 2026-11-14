import { ButtonLink } from "@/components/ui/Button";
import type { SessionUser } from "@/lib/types";
import { Logo } from "./Logo";

const ANCHORS = [
  { href: "#preguntas", label: "Qué puedes preguntar" },
  { href: "#respuestas", label: "Cómo responde" },
  { href: "#pastillero", label: "Pastillero" },
  { href: "#faq", label: "Preguntas frecuentes" },
];

export function SiteHeader({ user, name }: { user: SessionUser | null; name?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Logo name={name} />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="En esta página">
          {ANCHORS.map((a) => (
            <a key={a.href} href={a.href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-ink">
              {a.label}
            </a>
          ))}
        </nav>
        <nav className="flex items-center gap-2" aria-label="Cuenta">
          {user ? (
            <>
              {user.role === "ADMIN" ? (
                <ButtonLink href="/admin" variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Administración
                </ButtonLink>
              ) : null}
              <ButtonLink href="/chat" size="sm">
                Ir al chat
              </ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Ingresar
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Crear cuenta
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
