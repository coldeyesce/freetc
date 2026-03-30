import { NextResponse } from "next/server";
import { getAuthDiagnostics, getAuthConfig } from "@/lib/auth-config";

export const runtime = "edge";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const headerToken = request.headers.get("x-auth-debug-token") || "";
  const queryToken = searchParams.get("token") || "";
  const providedToken = headerToken || queryToken;

  const { debugToken } = getAuthConfig();
  if (!debugToken) {
    return NextResponse.json({ ok: false, message: "Auth diagnostics disabled" }, { status: 404 });
  }

  if (providedToken !== debugToken) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    diagnostics: getAuthDiagnostics(),
  });
}
