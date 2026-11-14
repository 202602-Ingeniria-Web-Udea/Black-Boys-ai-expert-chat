import { NextResponse } from "next/server";
import { AIError } from "@/lib/ai/errors";
import { getProvider, resolveModel } from "@/lib/ai/provider";
import { authorize } from "@/lib/api";
import { composeSystemPrompt } from "@/lib/assistant/prompt";
import { getAssistantSettings } from "@/lib/db/settings";
import { batteryFor } from "@/lib/evaluation/battery";
import { runChecks } from "@/lib/evaluation/questions";
import { HttpError } from "@/lib/errors";
import { parseBody, route } from "@/lib/http";
import { detectUrgency } from "@/lib/safety/urgency";
import { evaluationRunSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Ejecuta UNA pregunta de prueba contra el asistente actual (mismo System Prompt, modelo y parámetros
 * que el chat) y evalúa la respuesta con las verificaciones automáticas. No guarda nada en el historial.
 * El panel la llama una vez por pregunta para no exceder el tiempo máximo de la función.
 */
export const POST = route(async (request: Request) => {
  await authorize(request, { admin: true });
  const { questionId } = await parseBody(request, evaluationRunSchema);
  const settings = await getAssistantSettings();
  const question = batteryFor(settings.specialty).questions.find((q) => q.id === questionId);
  if (!question) throw new HttpError(404, "NOT_FOUND", "Pregunta de prueba no encontrada.");

  const provider = getProvider();
  const model = resolveModel(provider, settings.model);
  const startedAt = Date.now();

  let answer = "";
  let error: string | null = null;
  try {
    answer = await provider.complete(
      [
        { role: "system", content: composeSystemPrompt(settings, new Date(), detectUrgency(question.prompt)) },
        { role: "user", content: question.prompt },
      ],
      { model, temperature: settings.temperature, maxTokens: settings.maxTokens, signal: request.signal },
    );
  } catch (err) {
    const aiError = err instanceof AIError ? err : new AIError("UNKNOWN", String(err));
    error = aiError.message;
  }

  const result = error ? { checks: [], verdict: "ERROR" as const } : runChecks(question, answer);
  return NextResponse.json({
    questionId: question.id,
    answer,
    error,
    model,
    provider: provider.id,
    latencyMs: Date.now() - startedAt,
    ...result,
  });
});
