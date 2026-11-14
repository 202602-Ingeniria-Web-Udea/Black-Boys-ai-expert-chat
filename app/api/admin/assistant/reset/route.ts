import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { resetAssistantSettings } from "@/lib/db/settings";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Restablece el asistente a la plantilla de especialidad activa (variable ASSISTANT_PRESET; ver src/lib/assistant/presets). */
export const POST = route(async (request: Request) => {
  const admin = await authorize(request, { admin: true });
  return NextResponse.json({ settings: await resetAssistantSettings(admin.id) });
});
