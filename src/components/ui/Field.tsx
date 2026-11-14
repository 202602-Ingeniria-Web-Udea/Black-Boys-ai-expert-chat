"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

const control =
  "w-full rounded-xl border bg-white text-base text-ink placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-4 disabled:bg-slate-50 disabled:text-slate-500";

function controlClasses(invalid?: boolean) {
  return invalid
    ? "border-red-400 hover:border-red-500 focus:border-red-500 focus:ring-red-100"
    : "border-slate-300 hover:border-slate-400 focus:border-brand-600 focus:ring-brand-100";
}

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

/** Etiqueta + control + ayuda/error, con los atributos de accesibilidad conectados. */
export function FieldShell({ id, label, error, hint, action, children }: FieldShellProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800">
          {label}
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
};

export function TextField({ id, label, error, hint, className, ...props }: InputProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        className={cn(control, "h-11 px-3.5", controlClasses(!!error), className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      />
    </FieldShell>
  );
}

export function PasswordField({ id, label, error, hint, className, ...props }: InputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={cn(control, "h-11 pr-11 pl-3.5", controlClasses(!!error), className)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-800"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
    </FieldShell>
  );
}

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  action?: ReactNode;
};

export function TextareaField({ id, label, error, hint, action, className, ...props }: TextareaProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} action={action}>
      <textarea
        id={id}
        className={cn(control, "px-3.5 py-2.5 leading-relaxed", controlClasses(!!error), className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      />
    </FieldShell>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
};

export function SelectField({ id, label, error, hint, className, children, ...props }: SelectProps) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        className={cn(control, "h-11 px-3", controlClasses(!!error), className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
