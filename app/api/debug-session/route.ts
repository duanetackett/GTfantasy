import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  const cookieHeader = request.headers.get("cookie") ?? "(none)";
  const cookieNames = cookieHeader
    .split(";")
    .map((c) => c.trim().split("=")[0]);

  return NextResponse.json({
    session,
    cookieNames,
    hasSessionCookie: cookieNames.some((n) => n.includes("session-token")),
  });
}
