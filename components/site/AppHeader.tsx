import Link from "next/link";
import type { SessionUser } from "@/lib/types";
import { cn } from "@/components/ui/cn";
import { Logo } from "./Logo";
import { LogoutButton } from "./LogoutButton";

type Section = "chat" | "pastillero" | "account" | "admin";

/** Cabecera de las páginas internas (cuenta y administración). El chat tiene su propia barra lateral. */
export function AppHeader({ user, current }: { user: SessionUser; current: Section }) {
  const links: Array<{ href: string; label: string; key: Section; admin?: boolean }> = [
    { href: "/chat", label: "Chat", key: "chat" },
    { href: "/pastillero", label: "Mi pastillero", key: "pastillero" },
    { href: "/account", label: "Mi cuenta", key: "account" },
    { href: "/admin", label: "Administración", key: "admin", admin: true },
  ];

  return (
    <header className="no-print sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
        <div className="flex h-10 items-center">
          <Logo href="/chat" />
        </div>
        <nav className="order-last -mx-1 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:mx-0 sm:w-auto" aria-label="Secciones">
          {links
            .filter((l) => !l.admin || user.role === "ADMIN")
            .map((l) => (
              <Link
                key={l.key}
                href={l.href}
                aria-current={current === l.key ? "page" : undefined}
                className={cn(
                  "rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
                  current === l.key ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-48 truncate text-sm font-medium text-slate-700 md:block" title={user.email}>
            {user.name}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
