import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { getAssistantSettings, toPublicAssistant } from "@/lib/db/settings";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Datos públicos del asistente (nombre, especialidad, bienvenida). El System Prompt NO se expone. */
export const GET = route(async (request: Request) => {
  await authorize(request);
  return NextResponse.json({ assistant: toPublicAssistant(await getAssistantSettings()) });
});
