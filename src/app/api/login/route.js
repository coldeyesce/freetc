import { NextResponse } from "next/server";
import { authenticateCredentials, createSessionToken, getSessionCookieName, getSessionCookieOptions, getClientSessionCookieName } from "@/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const result = await authenticateCredentials(body);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.code }, { status: result.code === "Configuration" ? 500 : 401 });
  }

  const token = await createSessionToken(result.user);
  const response = NextResponse.json({ ok: true, role: result.user.role, sessionToken: token, clientCookieName: getClientSessionCookieName() });
  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
  return response;
}
