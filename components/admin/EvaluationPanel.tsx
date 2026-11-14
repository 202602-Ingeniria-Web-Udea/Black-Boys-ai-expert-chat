"use client";

import { Check, Download, Play, Square, X } from "lucide-react";
import { useRef, useState } from "react";
import { Markdown } from "@/components/chat/Markdown";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { api, downloadText, errorMessage } from "@/lib/client/api";
import { fileSlug } from "@/lib/client/export";
import { formatDateTime, formatDuration } from "@/lib/format";

export interface PublicQuestion {
  id: string;
  category: string;
  categoryLabel: string;
  prompt: string;
  expected: string;
  checkLabels: string[];
}

interface RunResult {
  questionId: string;
  answer: string;
  error: string | null;
  model: string;
  provider: string;
  latencyMs: number;
  checks: Array<{ label: string; pass: boolean }>;
  verdict: "PASS" | "REVIEW" | "ERROR";
}

interface Rating {
  pertinente: boolean;
  coherente: boolean;
  seguro: boolean;
}

const RATING_LABELS: Array<{ key: keyof Rating; label: string }> = [
  { key: "pertinente", label: "Pertinente" },
  { key: "coherente", label: "Coherente" },
  { key: "seguro", label: "Seguro" },
];

const VERDICT_BADGE: Record<RunResult["verdict"], { tone: "success" | "warning" | "danger"; label: string }> = {
  PASS: { tone: "success", label: "Cumple" },
  REVIEW: { tone: "warning", label: "Revisar" },
  ERROR: { tone: "danger", label: "Error" },
};

function quote(text: string): string {
  return text
    .trim()
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

interface Props {
  questions: PublicQuestion[];
  provider: { id: string; label: string; isMock: boolean; configured: boolean; problem?: string; defaultModel: string };
  assistant: { name: string; specialty: string };
}

export function EvaluationPanel({ questions, provider, assistant }: Props) {
  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const cancelRef = useRef(false);

  const executed = questions.filter((q) => results[q.id]);
  const counts = {
    pass: executed.filter((q) => results[q.id].verdict === "PASS").length,
    review: executed.filter((q) => results[q.id].verdict === "REVIEW").length,
    error: executed.filter((q) => results[q.id].verdict === "ERROR").length,
  };

  const groups = questions.reduce<Array<{ label: string; items: PublicQuestion[] }>>((acc, q) => {
    const group = acc.find((g) => g.label === q.categoryLabel);
    if (group) group.items.push(q);
    else acc.push({ label: q.categoryLabel, items: [q] });
    return acc;
  }, []);

  async function runOne(id: string) {
    setRunning(id);
    try {
      const result = await api<RunResult>("/api/admin/evaluation/run", { method: "POST", body: { questionId: id } });
      setResults((r) => ({ ...r, [id]: result }));
    } catch (err) {
      setResults((r) => ({
        ...r,
        [id]: { questionId: id, answer: "", error: errorMessage(err), model: "", provider: provider.id, latencyMs: 0, checks: [], verdict: "ERROR" },
      }));
    } finally {
      setRunning(null);
    }
  }

  async function runAll() {
    cancelRef.current = false;
    setRunningAll(true);
    for (const question of questions) {
      if (cancelRef.current) break;
      await runOne(question.id);
    }
    setRunningAll(false);
  }

  function toggleRating(id: string, key: keyof Rating) {
    setRatings((r) => {
      const current = r[id] ?? { pertinente: false, coherente: false, seguro: false };
      return { ...r, [id]: { ...current, [key]: !current[key] } };
    });
  }

  function downloadReport() {
    const models = [...new Set(executed.map((q) => results[q.id].model).filter(Boolean))];
    const mark = (value: boolean | undefined) => (value ? "Sí" : "Pendiente");
    const lines: string[] = [
      "# Informe de pruebas del asistente",
      "",
      `- **Fecha:** ${formatDateTime(new Date())}`,
      `- **Asistente:** ${assistant.name} (${assistant.specialty})`,
      `- **Proveedor:** ${provider.label} (\`${provider.id}\`)${provider.isMock ? " — respuestas simuladas, no es un modelo real" : ""}`,
      `- **Modelo:** ${models.join(", ") || "—"}`,
      `- **Preguntas ejecutadas:** ${executed.length} de ${questions.length}`,
      `- **Verificación automática:** ${counts.pass} cumplen, ${counts.review} por revisar, ${counts.error} con error`,
      "",
      "La verificación automática es una ayuda (busca señales en el texto). La evaluación de pertinencia, coherencia y seguridad la confirma una persona leyendo cada respuesta.",
      "",
      "## Resumen",
      "",
      "| ID | Categoría | Automática | Pertinente | Coherente | Seguro | Tiempo |",
      "|---|---|---|---|---|---|---|",
    ];
    for (const q of executed) {
      const r = results[q.id];
      const rating = ratings[q.id];
      lines.push(
        `| ${q.id} | ${q.categoryLabel} | ${VERDICT_BADGE[r.verdict].label} | ${mark(rating?.pertinente)} | ${mark(rating?.coherente)} | ${mark(rating?.seguro)} | ${r.latencyMs ? formatDuration(r.latencyMs) : "—"} |`,
      );
    }
    lines.push("", "## Detalle", "");
    for (const q of executed) {
      const r = results[q.id];
      lines.push(`### ${q.id}. ${q.categoryLabel}`, "", "**Pregunta**", "", quote(q.prompt), "", `**Comportamiento esperado:** ${q.expected}`, "");
      if (r.error) {
        lines.push(`**Error al consultar al modelo:** ${r.error}`, "");
        continue;
      }
      lines.push("**Respuesta del asistente**", "", quote(r.answer), "", "**Verificaciones automáticas**", "");
      for (const check of r.checks) lines.push(`- ${check.pass ? "[x]" : "[ ]"} ${check.label}`);
      lines.push("");
    }
    downloadText(`informe-pruebas-${fileSlug(assistant.name)}.md`, lines.join("\n"));
  }

  const disabled = !provider.configured;

  return (
    <div className="space-y-8">
      {provider.isMock ? (
        <Alert kind="info">
          <p className="font-medium">Estás usando el proveedor simulado.</p>
          <p className="mt-0.5">
            Sirve para probar el flujo, pero las respuestas no vienen de un modelo real. Para la evidencia final, configura <code className="font-mono text-[13px]">AI_PROVIDER</code> y su clave,
            reinicia y vuelve a ejecutar las pruebas.
          </p>
        </Alert>
      ) : !provider.configured ? (
        <Alert kind="error">
          <p className="font-medium">El proveedor de IA no está configurado.</p>
          <p className="mt-0.5">{provider.problem}</p>
        </Alert>
      ) : (
        <Alert kind="success">
          Se usará {provider.label} con el modelo <span className="font-mono text-[13px]">{provider.defaultModel}</span>, a menos que hayas indicado otro en la pestaña Asistente.
        </Alert>
      )}

      <div className="flex flex-col gap-4 border-y border-line py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-600">
            {executed.length === 0 ? `${questions.length} preguntas listas para ejecutar.` : `Ejecutadas ${executed.length} de ${questions.length}.`}
          </p>
          {executed.length > 0 ? (
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="text-brand-700">{counts.pass} cumplen</span>
              <span className="text-amber-700">{counts.review} por revisar</span>
              {counts.error > 0 ? <span className="text-red-700">{counts.error} con error</span> : null}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {runningAll ? (
            <Button variant="secondary" onClick={() => (cancelRef.current = true)}>
              <Square className="size-4 fill-current" aria-hidden="true" />
              Detener tras esta pregunta
            </Button>
          ) : (
            <Button onClick={runAll} disabled={disabled || running !== null}>
              <Play className="size-4 fill-current" aria-hidden="true" />
              {executed.length > 0 ? "Ejecutar todas de nuevo" : `Ejecutar las ${questions.length} pruebas`}
            </Button>
          )}
          <Button variant="secondary" onClick={downloadReport} disabled={executed.length === 0}>
            <Download className="size-4" aria-hidden="true" />
            Descargar informe (.md)
          </Button>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.label} aria-labelledby={`group-${group.items[0].category}`}>
          <h2 id={`group-${group.items[0].category}`} className="text-lg font-semibold tracking-tight">
            {group.label}
          </h2>
          <div className="mt-3">
            {group.items.map((question) => {
              const result = results[question.id];
              const rating = ratings[question.id];
              const busy = running === question.id;
              return (
                <article key={question.id} className="border-t border-line py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">{question.id}</span>
                        {result ? <Badge tone={VERDICT_BADGE[result.verdict].tone}>{VERDICT_BADGE[result.verdict].label}</Badge> : null}
                        {result?.latencyMs ? <span className="text-xs text-slate-500">{formatDuration(result.latencyMs)}</span> : null}
                      </p>
                      <p className="mt-2 text-[15px] leading-relaxed font-medium whitespace-pre-wrap text-slate-900">{question.prompt}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        <span className="font-medium text-slate-700">Se espera: </span>
                        {question.expected}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" loading={busy} disabled={disabled || (running !== null && !busy)} onClick={() => runOne(question.id)}>
                      {result ? "Repetir" : "Ejecutar"}
                    </Button>
                  </div>

                  {result ? (
                    <div className="mt-4 space-y-4">
                      {result.error ? (
                        <Alert kind="error">{result.error}</Alert>
                      ) : (
                        <>
                          <div className="rounded-xl border border-line p-4">
                            <Markdown content={result.answer} />
                          </div>
                          <ul className="space-y-1.5 text-sm" aria-label="Verificaciones automáticas">
                            {result.checks.map((check) => (
                              <li key={check.label} className={cn("flex items-center gap-2", check.pass ? "text-brand-700" : "text-amber-700")}>
                                {check.pass ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
                                {check.label}
                                <span className="sr-only">{check.pass ? ": cumple" : ": no se detectó"}</span>
                              </li>
                            ))}
                          </ul>
                          <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
                            <legend className="sr-only">Tu evaluación de la respuesta</legend>
                            <span className="text-sm text-slate-600">Tu evaluación:</span>
                            {RATING_LABELS.map(({ key, label }) => (
                              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                                <input
                                  type="checkbox"
                                  checked={rating?.[key] ?? false}
                                  onChange={() => toggleRating(question.id, key)}
                                  className="size-4 rounded border-slate-300 accent-brand-600"
                                />
                                {label}
                              </label>
                            ))}
                          </fieldset>
                        </>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
