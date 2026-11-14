"use client";

import { Check, Circle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { PasswordField, TextField } from "@/components/ui/Field";
import { ApiError, api, errorMessage } from "@/lib/client/api";

const RULES = [
  { label: "Al menos 8 caracteres", test: (v: string) => v.length >= 8 },
  { label: "Una letra", test: (v: string) => /[A-Za-z]/.test(v) },
  { label: "Un número", test: (v: string) => /\d/.test(v) },
];

export function RegisterForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setFormError(null);
    const local: Record<string, string> = {};
    if (name.trim().length < 2) local.name = "El nombre debe tener al menos 2 caracteres";
    if (!email.trim()) local.email = "Ingresa tu correo";
    if (!RULES.every((rule) => rule.test(password))) local.password = "La contraseña no cumple los requisitos";
    if (confirm !== password) local.confirm = "Las contraseñas no coinciden";
    setErrors(local);
    if (Object.keys(local).length > 0) return;

    setLoading(true);
    try {
      await api("/api/auth/register", { method: "POST", body: { name, email, password } });
      router.replace(next ?? "/chat");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      else if (err instanceof ApiError && err.code === "EMAIL_TAKEN") setErrors({ email: err.message });
      setFormError(err instanceof ApiError && err.code === "EMAIL_TAKEN" ? null : errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError ? <Alert kind="error">{formError}</Alert> : null}
      <TextField
        id="name"
        name="name"
        label="Nombre"
        autoComplete="name"
        placeholder="Tu nombre y apellido"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        autoFocus
      />
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
      />
      <div>
        <PasswordField
          id="password"
          name="password"
          label="Contraseña"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1" aria-label="Requisitos de la contraseña">
          {RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <li key={rule.label} className={cn("flex items-center gap-1.5 text-xs", ok ? "text-brand-700" : "text-slate-500")}>
                {ok ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3 opacity-60" aria-hidden="true" />}
                {rule.label}
              </li>
            );
          })}
        </ul>
      </div>
      <PasswordField
        id="confirm"
        name="confirm"
        label="Confirma la contraseña"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errors.confirm}
      />
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {loading ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
    </form>
  );
}
