import { NextResponse } from "next/server";
import { describeProvider } from "@/lib/ai/provider";
import { authorize } from "@/lib/api";
import { getAdminStats } from "@/lib/db/stats";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Estadísticas generales (solo ADMIN). Son agregados: no incluyen el contenido de las conversaciones. */
export const GET = route(async (request: Request) => {
  await authorize(request, { admin: true });
  return NextResponse.json({ ...(await getAdminStats()), provider: describeProvider() });
});
