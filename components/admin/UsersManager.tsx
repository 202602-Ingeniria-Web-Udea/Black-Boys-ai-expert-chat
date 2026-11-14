"use client";

import { Plus, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PasswordField, SelectField, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api, errorMessage } from "@/lib/client/api";
import { formatDateTime } from "@/lib/format";
import type { Role } from "@/lib/types";

export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  conversationCount: number;
  messageCount: number;
}

const nf = new Intl.NumberFormat("es-CO");
const GRID = "md:grid md:grid-cols-[minmax(0,2fr)_9.5rem_9rem_7rem_9rem_5rem] md:items-center md:gap-4";

export function UsersManager({ initialUsers, currentUserId }: { initialUsers: AdminUserDto[]; currentUserId: string }) {
  const { toast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminUserDto | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, query]);

  async function update(user: AdminUserDto, patch: { role?: Role; isActive?: boolean }, success: string) {
    setBusyId(user.id);
    try {
      const data = await api<{ user: Pick<AdminUserDto, "role" | "isActive" | "name"> }>(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: patch,
      });
      // El servidor no recalcula los contadores en esta respuesta: se conservan los que ya teníamos
      setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, role: data.user.role, isActive: data.user.isActive, name: data.user.name } : u)));
      toast(success, "success");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete(user: AdminUserDto) {
    setBusyId(user.id);
    try {
      await api(`/api/admin/users/${user.id}`, { method: "DELETE" });
      setUsers((list) => list.filter((u) => u.id !== user.id));
      toast(`Se eliminó a ${user.name}`, "success");
      setDeleting(null);
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar usuarios por nombre o correo"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-none"
          />
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Crear usuario
        </Button>
      </div>

      <p className="mt-4 text-sm text-slate-500" aria-live="polite">
        {visible.length === users.length
          ? `${nf.format(users.length)} ${users.length === 1 ? "usuario" : "usuarios"}`
          : `${nf.format(visible.length)} de ${nf.format(users.length)} usuarios`}
      </p>

      <div className="mt-2 border-t border-line">
        <div className={`${GRID} hidden border-b border-line py-2.5 text-sm font-medium text-slate-500`} aria-hidden="true">
          <span>Usuario</span>
          <span>Rol</span>
          <span>Estado</span>
          <span>Actividad</span>
          <span>Último acceso</span>
          <span className="text-right">Acciones</span>
        </div>

        {visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">No hay usuarios que coincidan con la búsqueda.</p>
        ) : (
          <ul>
            {visible.map((user) => {
              const isSelf = user.id === currentUserId;
              const busy = busyId === user.id;
              return (
                <li key={user.id} className={`${GRID} flex flex-col gap-3 border-b border-line py-4`}>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-slate-900">
                      <span className="truncate">{user.name}</span>
                      {isSelf ? <Badge tone="brand">Tú</Badge> : null}
                    </p>
                    <p className="truncate text-sm text-slate-500">{user.email}</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-500 md:sr-only" htmlFor={`role-${user.id}`}>
                      Rol
                    </label>
                    <select
                      id={`role-${user.id}`}
                      value={user.role}
                      disabled={isSelf || busy}
                      onChange={(e) => update(user, { role: e.target.value as Role }, `${user.name} ahora es ${e.target.value === "ADMIN" ? "administrador" : "usuario"}`)}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                      title={isSelf ? "No puedes cambiar tu propio rol" : undefined}
                    >
                      <option value="USER">Usuario</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>

                  <div>
                    <Badge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Activo" : "Desactivado"}</Badge>
                  </div>

                  <p className="text-sm text-slate-600 tabular-nums">
                    {nf.format(user.conversationCount)} {user.conversationCount === 1 ? "conversación" : "conversaciones"}
                    <span className="block text-slate-500">
                      {nf.format(user.messageCount)} {user.messageCount === 1 ? "pregunta" : "preguntas"}
                    </span>
                  </p>

                  <p className="text-sm text-slate-600">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca ha ingresado"}</p>

                  <div className="flex items-center gap-1 md:justify-end">
                    <button
                      type="button"
                      disabled={isSelf || busy}
                      onClick={() =>
                        update(
                          user,
                          { isActive: !user.isActive },
                          user.isActive ? `Se desactivó la cuenta de ${user.name}` : `Se activó la cuenta de ${user.name}`,
                        )
                      }
                      className="flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40"
                      aria-label={user.isActive ? `Desactivar a ${user.name}` : `Activar a ${user.name}`}
                      title={isSelf ? "No puedes desactivar tu propia cuenta" : user.isActive ? "Desactivar cuenta" : "Activar cuenta"}
                    >
                      {user.isActive ? <UserX className="size-[18px]" /> : <UserCheck className="size-[18px]" />}
                    </button>
                    <button
                      type="button"
                      disabled={isSelf || busy}
                      onClick={() => setDeleting(user)}
                      className="flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40"
                      aria-label={`Eliminar a ${user.name}`}
                      title={isSelf ? "No puedes eliminar tu propia cuenta" : "Eliminar usuario"}
                    >
                      <Trash2 className="size-[18px]" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CreateUserDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(user) => {
          setUsers((list) => [user, ...list]);
          toast(`Se creó la cuenta de ${user.name}`, "success");
          setCreating(false);
        }}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="¿Eliminar este usuario?"
        description={deleting ? `Se eliminará la cuenta de ${deleting.name} junto con todas sus conversaciones y mensajes. Esta acción no se puede deshacer.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} data-autofocus>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting !== null && busyId === deleting.id} onClick={() => deleting && confirmDelete(deleting)}>
              Eliminar usuario
            </Button>
          </>
        }
      />
    </div>
  );
}

function CreateUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (user: AdminUserDto) => void }) {
  if (!open) return null;
  return <CreateUserForm onClose={onClose} onCreated={onCreated} />;
}

function CreateUserForm({ onClose, onCreated }: { onClose: () => void; onCreated: (user: AdminUserDto) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setFormError(null);
    setErrors({});
    setLoading(true);
    try {
      const data = await api<{ user: AdminUserDto }>("/api/admin/users", { method: "POST", body: { name, email, password, role } });
      onCreated(data.user);
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_TAKEN") setErrors({ email: err.message });
      else if (err instanceof ApiError && err.details) setErrors(err.details);
      else setFormError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Crear usuario" description="La persona podrá ingresar de inmediato con el correo y la contraseña que definas.">
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError ? <Alert kind="error">{formError}</Alert> : null}
        <TextField id="new-name" label="Nombre" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="off" data-autofocus />
        <TextField id="new-email" label="Correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="off" />
        <PasswordField
          id="new-password"
          label="Contraseña inicial"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="Mínimo 8 caracteres, con una letra y un número."
          autoComplete="new-password"
        />
        <SelectField id="new-role" label="Rol" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="USER">Usuario: solo gestiona sus propias conversaciones</option>
          <option value="ADMIN">Administrador: gestiona usuarios y el asistente</option>
        </SelectField>
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Crear usuario
          </Button>
        </div>
      </form>
    </Modal>
  );
}
