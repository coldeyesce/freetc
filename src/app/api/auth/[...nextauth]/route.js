import { NextResponse } from "next/server";
import {
  auth,
  authenticateCredentials,
  createSessionToken,
  getSessionCookieName,
  getClientSessionCookieName,
  getSessionCookieOptions,
} from "@/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const credentialsProvider = {
  id: "credentials",
  name: "credentials",
  type: "credentials",
  signinUrl: "/api/auth/signin/credentials",
  callbackUrl: "/api/auth/callback/credentials",
};

function withNoStore(response) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  return response;
}

function getPathname(request) {
  return new URL(request.url).pathname;
}

async function handleProviders() {
  return withNoStore(NextResponse.json({ credentials: credentialsProvider }));
}

async function handleCsrf() {
  return withNoStore(NextResponse.json({ csrfToken: "legacy-compat-token" }));
}

async function handleSession(request) {
  const session = await auth(request);
  return withNoStore(NextResponse.json(session));
}

async function handleCredentialsCallback(request) {
  let body;
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await request.json().catch(() => ({}));
  } else {
    const form = await request.formData().catch(() => null);
    body = form
      ? Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, String(value)]))
      : {};
  }

  const callbackUrl = body.callbackUrl || "/";
  const result = await authenticateCredentials(body);

  if (!result.ok) {
    const errorUrl = `${callbackUrl}${callbackUrl.includes("?") ? "&" : "?"}error=${encodeURIComponent(result.code)}`;
    return withNoStore(NextResponse.json({ url: errorUrl }, { status: result.code === "Configuration" ? 500 : 401 }));
  }

  const token = await createSessionToken(result.user);
  const response = NextResponse.json({ url: callbackUrl }, { status: 200 });
  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
  response.cookies.set(getClientSessionCookieName(), token, {
    ...getSessionCookieOptions(),
    httpOnly: false,
  });
  return withNoStore(response);
}

async function handleSignOut(request) {
  let callbackUrl = "/";
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    callbackUrl = body.callbackUrl || callbackUrl;
  } else {
    const form = await request.formData().catch(() => null);
    callbackUrl = form?.get("callbackUrl")?.toString() || callbackUrl;
  }

  const response = NextResponse.json({ url: callbackUrl });
  response.cookies.set(getSessionCookieName(), "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
  response.cookies.set(getClientSessionCookieName(), "", {
    ...getSessionCookieOptions(),
    httpOnly: false,
    maxAge: 0,
  });
  return withNoStore(response);
}

export async function GET(request) {
  const pathname = getPathname(request);
  if (pathname.endsWith("/providers")) return handleProviders();
  if (pathname.endsWith("/csrf")) return handleCsrf();
  if (pathname.endsWith("/session")) return handleSession(request);
  return withNoStore(NextResponse.json({ ok: false, message: "Unsupported auth route" }, { status: 404 }));
}

export async function POST(request) {
  const pathname = getPathname(request);
  if (pathname.endsWith("/callback/credentials")) return handleCredentialsCallback(request);
  if (pathname.endsWith("/signout")) return handleSignOut(request);
  return withNoStore(NextResponse.json({ ok: false, message: "Unsupported auth route" }, { status: 404 }));
}
