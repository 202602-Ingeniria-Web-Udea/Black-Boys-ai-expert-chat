import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { setFeedback } from "@/lib/db/messages";
import { HttpError } from "@/lib/errors";
import { parseBody, parseId, route } from "@/lib/http";
import { feedbackSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** 👍 (1) / 👎 (-1) / quitar (0) sobre una respuesta del asistente propia. */
export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const user = await authorize(request);
  const id = parseId((await ctx.params).id);
  const { value } = await parseBody(request, feedbackSchema);
  const message = await setFeedback(user.id, id, value === 0 ? null : value);
  if (!message) throw new HttpError(404, "NOT_FOUND", "Mensaje no encontrado.");
  return NextResponse.json({ message });
});
