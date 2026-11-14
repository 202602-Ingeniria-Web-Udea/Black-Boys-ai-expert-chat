"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/components/site/Logo";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-6 px-6">
      <LogoMark />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Algo salió mal</h1>
        <p className="mt-3 text-slate-600">
          No pudimos cargar esta pantalla. Inténtalo de nuevo; si el problema continúa, vuelve al inicio.
        </p>
        {error.digest ? <p className="mt-3 text-xs text-slate-500">Referencia: {error.digest}</p> : null}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>Reintentar</Button>
        <ButtonLink href="/" variant="secondary">
          Ir al inicio
        </ButtonLink>
      </div>
    </main>
  );
}
