"use client";

import { LayoutTemplate, Plus, RotateCcw, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { FieldShell, SelectField, TextField, TextareaField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api, errorMessage } from "@/lib/client/api";
import { formatDateTime } from "@/lib/format";

export interface AssistantSettingsDto {
  name: string;
  specialty: string;
  systemPrompt: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  model: string | null;
  temperature: number;
  maxTokens: number;
  contextMessages: number;
  updatedAt: string;
}

type FormState = Omit<AssistantSettingsDto, "updatedAt" | "model"> & { model: string };

/** Plantilla de especialidad (viene del servidor ya serializada). */
export interface PresetOption {
  id: string;
  label: string;
  scope: string;
  assistant: {
    name: string;
    specialty: string;
    systemPrompt: string;
    welcomeMessage: string;
    suggestedQuestions: string[];
    temperature: number;
    maxTokens: number;
    contextMessages: number;
  };
}

const MAX_PROMPT = 12000;
const MAX_QUESTIONS = 6;

function toForm(s: AssistantSettingsDto): FormState {
  return {
    name: s.name,
    specialty: s.specialty,
    systemPrompt: s.systemPrompt,
    welcomeMessage: s.welcomeMessage,
    suggestedQuestions: s.suggestedQuestions,
    model: s.model ?? "",
    temperature: s.temperature,
    maxTokens: s.maxTokens,
    contextMessages: s.contextMessages,
  };
}

const textInput =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-[15px] hover:border-slate-400 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-none";
const numberInput = `${textInput} tabular-nums`;

export function AssistantForm({
  initial,
  presets,
  providerModel,
  providerLabel,
}: {
  initial: AssistantSettingsDto;
  presets: PresetOption[];
  providerModel: string;
  providerLabel: string;
}) {
  const { toast } = useToast();
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState<FormState>(toForm(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [presetId, setPresetId] = useState("");
  const [presetToLoad, setPresetToLoad] = useState<PresetOption | null>(null);
  const [loadedPreset, setLoadedPreset] = useState<string | null>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(saved));

  /** Rellena el formulario con la plantilla; no guarda nada hasta que se pulse «Guardar cambios». */
  function applyPreset(preset: PresetOption) {
    const a = preset.assistant;
    setForm((f) => ({
      ...f,
      name: a.name,
      specialty: a.specialty,
      systemPrompt: a.systemPrompt,
      welcomeMessage: a.welcomeMessage,
      suggestedQuestions: [...a.suggestedQuestions],
      temperature: a.temperature,
      maxTokens: a.maxTokens,
      contextMessages: a.contextMessages,
    }));
    setErrors({});
    setFormError(null);
    setPresetToLoad(null);
    setPresetId("");
    setLoadedPreset(preset.label);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setQuestion(index: number, value: string) {
    setForm((f) => ({ ...f, suggestedQuestions: f.suggestedQuestions.map((q, i) => (i === index ? value : q)) }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving || !dirty) return;
    setFormError(null);
    setErrors({});
    setSaving(true);
    try {
      const body = {
        ...form,
        model: form.model.trim() || null,
        suggestedQuestions: form.suggestedQuestions.map((q) => q.trim()).filter(Boolean),
      };
      const data = await api<{ settings: AssistantSettingsDto }>("/api/admin/assistant", { method: "PUT", body });
      setSaved(data.settings);
      setForm(toForm(data.settings));
      setLoadedPreset(null);
      toast("Asistente actualizado. Los cambios ya aplican a las nuevas respuestas.", "success");
    } catch (err) {
      if (err instanceof ApiError && err.details) {
        setErrors(err.details);
        setFormError("Revisa los campos marcados en rojo.");
      } else {
        setFormError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setResetting(true);
    try {
      const data = await api<{ settings: AssistantSettingsDto }>("/api/admin/assistant/reset", { method: "POST" });
      setSaved(data.settings);
      setForm(toForm(data.settings));
      setErrors({});
      setFormError(null);
      setConfirmReset(false);
      setLoadedPreset(null);
      toast("Se restablecieron los valores por defecto", "success");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setResetting(false);
    }
  }

  const questionError = Object.entries(errors).find(([key]) => key.startsWith("suggestedQuestions"))?.[1];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-10">
      {formError ? <Alert kind="error">{formError}</Alert> : null}

      <section className="space-y-3 rounded-xl border border-line bg-slate-50/60 p-4 sm:p-5" aria-labelledby="preset-title">
        <div>
          <h2 id="preset-title" className="text-base font-semibold tracking-tight">
            Empezar desde una plantilla
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Cada plantilla trae la identidad, el System Prompt, las preguntas sugeridas y su propia batería de pruebas. Rellena el formulario; no se guarda hasta que
            pulses «Guardar cambios».
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-80">
            <SelectField id="a-preset" label="Especialidad" value={presetId} onChange={(e) => setPresetId(e.target.value)}>
              <option value="">Elige una plantilla…</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} · {p.assistant.name}
                </option>
              ))}
            </SelectField>
          </div>
          <Button
            variant="secondary"
            disabled={!presetId}
            onClick={() => {
              const preset = presets.find((p) => p.id === presetId);
              if (!preset) return;
              if (dirty) setPresetToLoad(preset);
              else applyPreset(preset);
            }}
          >
            <LayoutTemplate className="size-4" aria-hidden="true" />
            Cargar plantilla
          </Button>
        </div>
        {presetId ? <p className="text-sm text-slate-500">{presets.find((p) => p.id === presetId)?.scope}</p> : null}
        {loadedPreset ? (
          <Alert kind="info">
            {dirty
              ? `Plantilla «${loadedPreset}» cargada en el formulario. Revisa los campos y pulsa «Guardar cambios» para aplicarla.`
              : `La plantilla «${loadedPreset}» coincide con lo que ya está guardado.`}
          </Alert>
        ) : null}
      </section>

      <section className="space-y-5" aria-labelledby="identity-title">
        <div>
          <h2 id="identity-title" className="text-lg font-semibold tracking-tight">
            Identidad
          </h2>
          <p className="mt-1 text-sm text-slate-600">Lo que ven las personas en la landing, el login y el chat.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="a-name" label="Nombre del asistente" value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} maxLength={60} />
          <TextField
            id="a-specialty"
            label="Especialidad"
            value={form.specialty}
            onChange={(e) => set("specialty", e.target.value)}
            error={errors.specialty}
            maxLength={60}
            hint="Por ejemplo: Salud y medicamentos, Nutrición deportiva, Mecánica automotriz."
          />
        </div>
        <TextareaField
          id="a-welcome"
          label="Mensaje de bienvenida"
          rows={3}
          value={form.welcomeMessage}
          onChange={(e) => set("welcomeMessage", e.target.value)}
          error={errors.welcomeMessage}
          maxLength={600}
          hint="Se muestra al abrir una conversación vacía. Texto simple, sin formato."
        />

        <FieldShell id="a-questions" label="Preguntas sugeridas" error={questionError} hint="Aparecen como atajos cuando la conversación está vacía. Hasta 6.">
          <div className="space-y-2">
            {form.suggestedQuestions.map((question, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  id={index === 0 ? "a-questions" : undefined}
                  value={question}
                  onChange={(e) => setQuestion(index, e.target.value)}
                  aria-label={`Pregunta sugerida ${index + 1}`}
                  maxLength={140}
                  className={cn(textInput, "h-10 flex-1")}
                />
                <button
                  type="button"
                  onClick={() => set("suggestedQuestions", form.suggestedQuestions.filter((_, i) => i !== index))}
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label={`Quitar la pregunta sugerida ${index + 1}`}
                >
                  <X className="size-[18px]" />
                </button>
              </div>
            ))}
            {form.suggestedQuestions.length < MAX_QUESTIONS ? (
              <Button variant="secondary" size="sm" onClick={() => set("suggestedQuestions", [...form.suggestedQuestions, ""])}>
                <Plus className="size-4" aria-hidden="true" />
                Agregar pregunta
              </Button>
            ) : null}
          </div>
        </FieldShell>
      </section>

      <section className="space-y-5 border-t border-line pt-8" aria-labelledby="prompt-title">
        <div>
          <h2 id="prompt-title" className="text-lg font-semibold tracking-tight">
            System Prompt
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Define quién es el asistente, de qué temas habla, cómo se comporta, qué no debe hacer y cómo formatea sus respuestas. Es la instrucción que recibe el
            modelo en cada pregunta; las personas no la ven.
          </p>
        </div>
        <TextareaField
          id="a-prompt"
          label="Instrucciones del asistente"
          rows={20}
          value={form.systemPrompt}
          onChange={(e) => set("systemPrompt", e.target.value)}
          error={errors.systemPrompt}
          className="font-mono text-[13.5px] leading-relaxed"
          spellCheck={false}
          action={
            <span className={cn("text-xs tabular-nums", form.systemPrompt.length > MAX_PROMPT ? "font-medium text-red-600" : "text-slate-500")}>
              {form.systemPrompt.length.toLocaleString("es-CO")} / {MAX_PROMPT.toLocaleString("es-CO")}
            </span>
          }
          hint="Estructura recomendada: IDENTIDAD, DOMINIO, COMPORTAMIENTO, LÍMITES y FORMATO DE RESPUESTA."
        />
      </section>

      <section className="space-y-5 border-t border-line pt-8" aria-labelledby="model-title">
        <div>
          <h2 id="model-title" className="text-lg font-semibold tracking-tight">
            Modelo y parámetros
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Proveedor activo: {providerLabel}. La clave de la API se define en las variables de entorno y nunca llega al navegador.
          </p>
        </div>
        <TextField
          id="a-model"
          label="Modelo (opcional)"
          value={form.model}
          onChange={(e) => set("model", e.target.value)}
          error={errors.model}
          placeholder={providerModel || "Modelo del proveedor"}
          maxLength={100}
          hint={`Si lo dejas vacío se usa ${providerModel || "el modelo por defecto del proveedor"}.`}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <FieldShell id="a-temp" label="Creatividad (temperatura)" error={errors.temperature} hint="0 = muy consistente, 2 = muy variado.">
              <input
                id="a-temp"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={form.temperature}
                onChange={(e) => set("temperature", e.target.value === "" ? 0 : Number(e.target.value))}
                className={numberInput}
              />
            </FieldShell>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={form.temperature}
              onChange={(e) => set("temperature", Number(e.target.value))}
              className="mt-3 w-full accent-brand-600"
              aria-label="Ajustar la temperatura"
            />
          </div>
          <FieldShell id="a-tokens" label="Longitud máxima de respuesta" error={errors.maxTokens} hint="En tokens (entre 64 y 8192).">
            <input
              id="a-tokens"
              type="number"
              min={64}
              max={8192}
              step={64}
              value={form.maxTokens}
              onChange={(e) => set("maxTokens", Number(e.target.value))}
              className={numberInput}
            />
          </FieldShell>
          <FieldShell id="a-context" label="Mensajes de contexto" error={errors.contextMessages} hint="Cuántos mensajes previos recuerda (2 a 50).">
            <input
              id="a-context"
              type="number"
              min={2}
              max={50}
              step={1}
              value={form.contextMessages}
              onChange={(e) => set("contextMessages", Number(e.target.value))}
              className={numberInput}
            />
          </FieldShell>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse items-stretch gap-3 border-t border-line bg-white/95 px-4 py-4 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:px-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Restablecer valores por defecto
          </Button>
        </div>
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <p className="text-sm text-slate-500">{dirty ? "Hay cambios sin guardar" : `Guardado el ${formatDateTime(saved.updatedAt)}`}</p>
          <Button type="submit" loading={saving} disabled={!dirty}>
            Guardar cambios
          </Button>
        </div>
      </div>

      <Modal
        open={presetToLoad !== null}
        onClose={() => setPresetToLoad(null)}
        title={presetToLoad ? `¿Cargar la plantilla «${presetToLoad.label}»?` : "¿Cargar la plantilla?"}
        description="Hay cambios sin guardar en el formulario. Se reemplazarán el nombre, la especialidad, el mensaje de bienvenida, las preguntas sugeridas, el System Prompt y los parámetros."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPresetToLoad(null)} data-autofocus>
              Cancelar
            </Button>
            <Button onClick={() => presetToLoad && applyPreset(presetToLoad)}>Cargar plantilla</Button>
          </>
        }
      />

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="¿Restablecer el asistente?"
        description="Se reemplazarán el nombre, la especialidad, el System Prompt y los parámetros por los de la plantilla activa del proyecto (variable ASSISTANT_PRESET, por defecto Salud y medicamentos)."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)} data-autofocus>
              Cancelar
            </Button>
            <Button variant="danger" onClick={reset} loading={resetting}>
              Restablecer
            </Button>
          </>
        }
      />
    </form>
  );
}
