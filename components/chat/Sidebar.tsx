"use client";

import { Pencil, Pill, Plus, Search, Shield, Trash2, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { Logo } from "@/components/site/Logo";
import { LogoutButton } from "@/components/site/LogoutButton";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Spinner } from "@/components/ui/Spinner";
import { dayBucket } from "@/lib/format";
import type { ConversationSummary, SessionUser } from "@/lib/types";

interface SidebarProps {
  user: SessionUser;
  assistantName: string;
  conversations: ConversationSummary[];
  isSearch: boolean;
  search: string;
  searching: boolean;
  activeId: string | null;
  onSearch: (value: string) => void;
  onClearSearch: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (conversation: ConversationSummary) => void;
  onDelete: (conversation: ConversationSummary) => void;
  /** Solo en móvil: cierra el panel deslizable */
  onClose?: () => void;
}

const BUCKET_ORDER = ["Hoy", "Ayer", "Últimos 7 días", "Anteriores"] as const;

function RowAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-ink"
    >
      {children}
    </button>
  );
}

export function Sidebar({
  user,
  assistantName,
  conversations,
  isSearch,
  search,
  searching,
  activeId,
  onSearch,
  onClearSearch,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onClose,
}: SidebarProps) {
  const groups = useMemo(() => {
    if (isSearch) return [{ label: "Resultados", items: conversations }];
    const map = new Map<string, ConversationSummary[]>();
    for (const conversation of conversations) {
      const key = dayBucket(conversation.updatedAt);
      map.set(key, [...(map.get(key) ?? []), conversation]);
    }
    return BUCKET_ORDER.filter((key) => map.has(key)).map((key) => ({ label: key, items: map.get(key) ?? [] }));
  }, [conversations, isSearch]);

  const initial = (user.name.trim()[0] ?? "?").toUpperCase();

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Logo href="/" name={assistantName} />
        {onClose ? (
          <button type="button" onClick={onClose} className="-mr-1 flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Cerrar menú">
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <div className="space-y-3 px-3 pb-3">
        <button
          type="button"
          onClick={onNew}
          className={buttonClasses({ variant: "primary", size: "md", className: "w-full justify-start" })}
        >
          <Plus className="size-[18px]" aria-hidden="true" />
          Nueva conversación
        </button>
        <Link href="/pastillero" className={buttonClasses({ variant: "soft", size: "md", className: "w-full justify-start" })}>
          <Pill className="size-[18px]" aria-hidden="true" />
          Mi pastillero
        </Link>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Buscar en tus conversaciones"
            aria-label="Buscar en tus conversaciones"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pr-9 pl-9 text-sm text-ink placeholder:text-slate-500 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {searching ? (
            <Spinner className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-500" />
          ) : search ? (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-ink"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <nav className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-3" aria-label="Historial de conversaciones">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-sm leading-relaxed text-slate-600">
            {isSearch
              ? searching
                ? "Buscando…"
                : `No hay conversaciones que coincidan con «${search.trim()}».`
              : "Todavía no tienes conversaciones. Escribe tu primera pregunta para empezar."}
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="mt-3 first:mt-0" aria-label={group.label}>
              <h2 className="px-2 pb-1 text-xs font-semibold text-slate-600">{group.label}</h2>
              <ul className="space-y-0.5">
                {group.items.map((conversation) => {
                  const active = conversation.id === activeId;
                  return (
                    <li key={conversation.id} className="group relative">
                      <button
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        aria-current={active ? "page" : undefined}
                        title={conversation.title}
                        className={cn(
                          "flex h-10 w-full items-center rounded-xl px-3 text-left text-sm transition-colors",
                          active ? "bg-brand-50 font-semibold text-brand-900" : "text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        <span className="truncate group-focus-within:pr-16 group-hover:pr-16 [@media(hover:none)]:pr-16">{conversation.title}</span>
                      </button>
                      <div
                        className={cn(
                          "absolute inset-y-0 right-1 items-center gap-0.5",
                          active ? "flex" : "hidden group-focus-within:flex group-hover:flex [@media(hover:none)]:flex",
                        )}
                      >
                        <RowAction label="Renombrar conversación" onClick={() => onRename(conversation)}>
                          <Pencil className="size-3.5" />
                        </RowAction>
                        <RowAction label="Eliminar conversación" onClick={() => onDelete(conversation)}>
                          <Trash2 className="size-3.5" />
                        </RowAction>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 px-1 pb-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700" aria-hidden="true">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-slate-600">{user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Link href="/account" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            <UserRound className="size-4" aria-hidden="true" />
            Mi cuenta
          </Link>
          {user.role === "ADMIN" ? (
            <Link href="/admin" className={buttonClasses({ variant: "ghost", size: "sm" })}>
              <Shield className="size-4" aria-hidden="true" />
              Administración
            </Link>
          ) : null}
          <LogoutButton label="Salir" />
        </div>
      </div>
    </div>
  );
}
