"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { ApiError, api, errorMessage } from "@/lib/client/api";

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setFormError(null);
    const local: Record<string, string> = {};
    if (!email.trim()) local.email = "Ingresa tu correo";
    if (!password) local.password = "Ingresa tu contraseña";
    setErrors(local);
    if (Object.keys(local).length > 0) return;

    setLoading(true);
    try {
      await api("/api/auth/login", { method: "POST", body: { email, password } });
      router.replace(next ?? "/chat");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setFormError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError ? <Alert kind="error">{formError}</Alert> : null}
      <TextField
        id="email"
        name="email"
        type="email"
        label="Correo electrónico"
        autoComplete="email"
        inputMode="email"
        placeholder="tu@correo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        autoFocus
      />
      <PasswordField
        id="password"
        name="password"
        label="Contraseña"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {loading ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
