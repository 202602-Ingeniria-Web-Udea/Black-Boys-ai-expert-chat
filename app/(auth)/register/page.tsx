import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { safeNext } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { getAssistantSettingsSafe, toPublicAssistant } from "@/lib/db/settings";

export const metadata = { title: "Crear cuenta" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const next = safeNext((await searchParams).next);
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect(next ?? "/chat");
  const assistant = toPublicAssistant(await getAssistantSettingsSafe());

  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Es lo único que necesitas para empezar a preguntar."
      assistant={assistant}
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-brand-700 underline underline-offset-2">
            Ingresar
          </Link>
        </>
      }
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
