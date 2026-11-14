import { NextResponse } from "next/server";
import { describeProvider } from "@/lib/ai/provider";
import { query } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

/** Estado del servicio (útil para verificar el despliegue). No expone secretos. */
export async function GET() {
  let db = false;
  try {
    await query("select 1");
    db = true;
  } catch {
    db = false;
  }
  const ai = describeProvider();
  return NextResponse.json(
    {
      status: db ? "ok" : "degraded",
      db,
      ai: { provider: ai.id, configured: ai.configured, mock: ai.isMock },
      time: new Date().toISOString(),
    },
    { status: db ? 200 : 503 },
  );
}
