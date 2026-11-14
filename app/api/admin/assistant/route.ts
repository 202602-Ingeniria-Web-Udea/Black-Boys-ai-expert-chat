import { NextResponse } from "next/server";
import { describeProvider } from "@/lib/ai/provider";
import { authorize } from "@/lib/api";
import { getAssistantSettings, saveAssistantSettings } from "@/lib/db/settings";
import { parseBody, route } from "@/lib/http";
import { assistantSettingsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await authorize(request, { admin: true });
  return NextResponse.json({ settings: await getAssistantSettings(), provider: describeProvider() });
});

/** Guarda la configuración del asistente (System Prompt, modelo, temperatura, etc.). */
export const PUT = route(async (request: Request) => {
  const admin = await authorize(request, { admin: true });
  const input = await parseBody(request, assistantSettingsSchema);
  return NextResponse.json({ settings: await saveAssistantSettings(input, admin.id) });
});
