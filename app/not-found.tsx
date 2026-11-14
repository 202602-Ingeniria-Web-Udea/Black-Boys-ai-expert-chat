import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/site/Logo";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-start justify-center gap-6 px-6">
      <Logo />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">No encontramos esta página</h1>
        <p className="mt-3 text-slate-600">
          La dirección no existe o ya no está disponible. Vuelve al inicio o a tus conversaciones.
        </p>
      </div>
      <div className="flex gap-3">
        <ButtonLink href="/chat">Ir al chat</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Volver al inicio
        </ButtonLink>
      </div>
    </main>
  );
}
