import { NextResponse } from "next/server";
import { authorize } from "@/lib/api";
import { route } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  const user = await authorize(request);
  return NextResponse.json({ user });
});
