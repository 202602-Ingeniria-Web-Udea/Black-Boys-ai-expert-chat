import { UsersManager } from "@/components/admin/UsersManager";
import { requireAdmin } from "@/lib/auth/session";
import { listUsersAdmin } from "@/lib/db/users";
import { plain } from "@/lib/serialize";

export const metadata = { title: "Administración: usuarios" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin("/admin/usuarios");
  const users = await listUsersAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Usuarios</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Crea cuentas, cambia roles y desactiva o elimina usuarios. Un cambio de rol o de estado cierra de inmediato las sesiones de esa persona.
        </p>
      </div>
      <UsersManager initialUsers={plain(users)} currentUserId={admin.id} />
    </div>
  );
}
