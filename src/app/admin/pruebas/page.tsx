import { EvaluationPanel } from "@/components/admin/EvaluationPanel";
import { Alert } from "@/components/ui/Alert";
import { describeProvider } from "@/lib/ai/provider";
import { requireAdmin } from "@/lib/auth/session";
import { getAssistantSettings } from "@/lib/db/settings";
import { batteryFor } from "@/lib/evaluation/battery";
import { publicQuestions } from "@/lib/evaluation/questions";

export const metadata = { title: "Administración: pruebas" };
export const dynamic = "force-dynamic";

export default async function AdminEvaluationPage() {
  await requireAdmin("/admin/pruebas");
  const settings = await getAssistantSettings();
  const provider = describeProvider();
  const battery = batteryFor(settings.specialty);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pruebas del asistente</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Ejecuta una batería de preguntas de dominio, fuera de la especialidad, de incertidumbre y de seguridad contra el asistente actual, con el mismo System Prompt y modelo
          del chat. Las pruebas no se guardan en el historial de nadie. Descarga el informe como evidencia.
        </p>
      </div>

      {battery.matched ? null : (
        <Alert kind="info">
          No hay una batería para la especialidad «{settings.specialty}», así que se usa la de «{battery.presetLabel}». Adapta las preguntas en{" "}
          <code className="font-mono text-[13px]">src/lib/assistant/presets/</code> (guía en <code className="font-mono text-[13px]">docs/PLANTILLAS_ESPECIALIDAD.md</code>) o elige una de las
          plantillas en Administración → Asistente.
        </Alert>
      )}

      <EvaluationPanel
        questions={publicQuestions(battery.questions)}
        provider={{
          id: provider.id,
          label: provider.label,
          isMock: provider.isMock,
          configured: provider.configured,
          problem: provider.problem,
          defaultModel: provider.defaultModel,
        }}
        assistant={{ name: settings.name, specialty: settings.specialty }}
      />
    </div>
  );
}
