"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api, errorMessage } from "@/lib/client/api";

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const unchanged = name.trim() === initialName;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading || unchanged) return;
    setError(null);
    setLoading(true);
    try {
      await api("/api/account", { method: "PATCH", body: { name } });
      toast("Perfil actualizado", "success");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError && err.details?.name ? err.details.name : errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <TextField id="profile-name" label="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" error={error ?? undefined} />
      <TextField id="profile-email" label="Correo electrónico" value={email} readOnly disabled hint="El correo identifica tu cuenta y no se puede cambiar." />
      <Button type="submit" loading={loading} disabled={unchanged}>
        Guardar cambios
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setFormError(null);
    const local: Record<string, string> = {};
    if (!current) local.currentPassword = "Ingresa tu contraseña actual";
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      local.newPassword = "Usa al menos 8 caracteres, con una letra y un número";
    }
    if (confirm !== next) local.confirm = "Las contraseñas no coinciden";
    setErrors(local);
    if (Object.keys(local).length > 0) return;

    setLoading(true);
    try {
      await api("/api/account/password", { method: "POST", body: { currentPassword: current, newPassword: next } });
      toast("Contraseña actualizada. Se cerraron tus otras sesiones.", "success");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      if (err instanceof ApiError && err.code === "WRONG_PASSWORD") setErrors({ currentPassword: err.message });
      else if (err instanceof ApiError && err.details) setErrors(err.details);
      else setFormError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError ? <Alert kind="error">{formError}</Alert> : null}
      <PasswordField
        id="current-password"
        label="Contraseña actual"
        autoComplete="current-password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        error={errors.currentPassword}
      />
      <PasswordField
        id="new-password"
        label="Contraseña nueva"
        autoComplete="new-password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        error={errors.newPassword}
        hint="Mínimo 8 caracteres, con al menos una letra y un número."
      />
      <PasswordField
        id="confirm-password"
        label="Confirma la contraseña nueva"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errors.confirm}
      />
      <Button type="submit" loading={loading}>
        Cambiar contraseña
      </Button>
    </form>
  );
}
