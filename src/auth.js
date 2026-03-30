import { cookies } from "next/headers";
import { getAuthConfig, getAuthDiagnostics, normalizeSubmittedCredentials } from "@/lib/auth-config";

const COOKIE_NAME = "freetc_session";
const SESSION_MAX_AGE = 24 * 60 * 60;
const FALLBACK_SECRET = "00Fv/YUm0enwy04IgP4KoNOWLODe2iJ1tvBzr+4kEZ8=";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSecret() {
  return getAuthConfig().secret || FALLBACK_SECRET;
}

function toBase64Url(input) {
  const buffer = input instanceof Uint8Array ? input : encoder.encode(String(input));
  if (typeof Buffer !== "undefined") {
    return Buffer.from(buffer)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  let binary = "";
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4 || 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signData(data) {
  const key = await importSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toBase64Url(new Uint8Array(signature));
}

async function verifySignature(data, signature) {
  const key = await importSigningKey();
  return crypto.subtle.verify("HMAC", key, fromBase64Url(signature), encoder.encode(data));
}

export async function createSessionToken(user) {
  const payload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = await signData(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function readSessionToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const valid = await verifySignature(payload, signature);
  if (!valid) return null;

  try {
    const data = JSON.parse(decoder.decode(fromBase64Url(payload)));
    if (!data?.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export async function auth(request) {
  const token = request?.cookies?.get?.(COOKIE_NAME)?.value ?? cookies().get(COOKIE_NAME)?.value;
  const session = await readSessionToken(token);
  if (!session) return null;
  return { user: session };
}

export async function authenticateCredentials(credentials) {
  const { adminUsername, adminPassword, regularUsername, regularPassword } = getAuthConfig();
  const { username, password } = normalizeSubmittedCredentials(credentials);

  if (!adminUsername || !adminPassword) {
    console.error("[auth] Missing BASIC_USER or BASIC_PASS in runtime environment", getAuthDiagnostics());
    return { ok: false, code: "Configuration" };
  }

  if (username === adminUsername && password === adminPassword) {
    return {
      ok: true,
      user: {
        id: 1,
        name: adminUsername,
        email: "admin@example.com",
        role: "admin",
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (regularUsername && regularPassword && username === regularUsername && password === regularPassword) {
    return {
      ok: true,
      user: {
        id: 2,
        name: regularUsername,
        email: "user@example.com",
        role: "user",
        createdAt: new Date().toISOString(),
      },
    };
  }

  console.warn("[auth] Credentials rejected", {
    usernameLength: username.length,
    hasAdminCredentials: Boolean(adminUsername && adminPassword),
    hasRegularCredentials: Boolean(regularUsername && regularPassword),
  });
  return { ok: false, code: "CredentialsSignin" };
}
