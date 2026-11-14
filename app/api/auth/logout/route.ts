import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth/session";
import { assertSameOrigin, route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  await endSession();
  return NextResponse.json({ ok: true });
});
