import { notFound } from "next/navigation";
import { PasswordForm, ProfileForm } from "@/components/account/AccountForms";
import { AppHeader } from "@/components/site/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { requireUser } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Mi cuenta" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await requireUser("/account");
  const user = await findUserById(session.id);
  if (!user) notFound();

  return (
    <>
      <AppHeader user={session} current="account" />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Mi cuenta</h1>
          <Badge tone={user.role === "ADMIN" ? "brand" : "neutral"}>{user.role === "ADMIN" ? "Administrador" : "Usuario"}</Badge>
        </div>
        <p className="mt-2 text-slate-600">Cuenta creada el {formatDate(user.createdAt)}.</p>

        <section className="mt-10 border-t border-line pt-8" aria-labelledby="profile-title">
          <h2 id="profile-title" className="text-lg font-semibold tracking-tight">
            Perfil
          </h2>
          <div className="mt-5">
            <ProfileForm initialName={user.name} email={user.email} />
          </div>
        </section>

        <section className="mt-10 border-t border-line pt-8" aria-labelledby="password-title">
          <h2 id="password-title" className="text-lg font-semibold tracking-tight">
            Contraseña
          </h2>
          <p className="mt-1 text-sm text-slate-600">Al cambiarla se cierran las sesiones abiertas en otros dispositivos.</p>
          <div className="mt-5">
            <PasswordForm />
          </div>
        </section>
      </main>
    </>
  );
}
