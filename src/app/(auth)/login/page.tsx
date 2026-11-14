import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeNext } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { getAssistantSettingsSafe, toPublicAssistant } from "@/lib/db/settings";

export const metadata = { title: "Ingresar" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNext((await searchParams).next);
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect(next ?? "/chat");
  const assistant = toPublicAssistant(await getAssistantSettingsSafe());

  return (
    <AuthShell
      title="Ingresa a tu cuenta"
      subtitle="Retoma tus conversaciones donde las dejaste."
      assistant={assistant}
      footer={
        <>
          ¿Aún no tienes cuenta?{" "}
          <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-brand-700 underline underline-offset-2">
            Crear cuenta
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
