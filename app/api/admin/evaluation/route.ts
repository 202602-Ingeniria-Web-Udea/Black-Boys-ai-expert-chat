import { NextResponse } from "next/server";
import { describeProvider } from "@/lib/ai/provider";
import { authorize } from "@/lib/api";
import { getAssistantSettings } from "@/lib/db/settings";
import { batteryFor } from "@/lib/evaluation/battery";
import { publicQuestions } from "@/lib/evaluation/questions";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Batería de preguntas de prueba (según la especialidad guardada) + estado del proveedor. */
export const GET = route(async (request: Request) => {
  await authorize(request, { admin: true });
  const settings = await getAssistantSettings();
  const battery = batteryFor(settings.specialty);
  return NextResponse.json({
    questions: publicQuestions(battery.questions),
    battery: { preset: battery.presetId, label: battery.presetLabel, matched: battery.matched },
    provider: describeProvider(),
    assistant: { name: settings.name, specialty: settings.specialty },
  });
});
