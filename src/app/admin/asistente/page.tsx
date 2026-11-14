import { AssistantForm } from "@/components/admin/AssistantForm";
import { describeProvider } from "@/lib/ai/provider";
import { presetSummaries } from "@/lib/assistant/presets";
import { requireAdmin } from "@/lib/auth/session";
import { getAssistantSettings } from "@/lib/db/settings";
import { plain } from "@/lib/serialize";

export const metadata = { title: "Administración: asistente" };
export const dynamic = "force-dynamic";

export default async function AdminAssistantPage() {
  await requireAdmin("/admin/asistente");
  const settings = await getAssistantSettings();
  const provider = describeProvider();

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Asistente</h1>
        <p className="mt-2 text-slate-600">
          Configura la especialidad del asistente y cómo responde. Los cambios se aplican a las siguientes preguntas de todos los usuarios.
        </p>
      </div>
      <AssistantForm initial={plain(settings)} presets={presetSummaries()} providerModel={provider.defaultModel} providerLabel={provider.label} />
    </div>
  );
}
