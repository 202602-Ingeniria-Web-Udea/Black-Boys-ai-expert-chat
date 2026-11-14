import Link from "next/link";
import { HelpLines } from "@/components/safety/HelpLines";
import { TRUSTED_SOURCES } from "@/lib/safety/resources";
import { Logo } from "./Logo";

export function SiteFooter({ name }: { name?: string }) {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo name={name} />
          <p className="max-w-sm text-sm leading-relaxed text-slate-600">
            Información educativa sobre salud y medicamentos. No reemplaza la consulta con un profesional de la salud, no diagnostica y no receta.
          </p>
          <p className="text-sm text-slate-500">Proyecto integrador de Ingeniería Web · Next.js, Tailwind CSS y PostgreSQL.</p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-ink">Ayuda inmediata en Colombia</h2>
          <HelpLines className="mt-3 flex-col items-start gap-y-1" />
        </div>

        <div>
          <h2 className="text-sm font-bold text-ink">Fuentes oficiales</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {TRUSTED_SOURCES.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-ink">
                  {s.name}
                </a>
              </li>
            ))}
            <li className="pt-2">
              <Link href="/login" className="font-semibold text-brand-700 underline underline-offset-4">
                Ingresar
              </Link>
              <span className="mx-2 text-slate-300" aria-hidden="true">
                |
              </span>
              <Link href="/register" className="font-semibold text-brand-700 underline underline-offset-4">
                Crear cuenta
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
