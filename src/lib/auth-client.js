export async function loginWithPassword({ username, password }) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    ...data,
  };
}

export function writeClientSessionCookie(name, token) {
  if (typeof document === "undefined" || !name || !token) return;
  document.cookie = `${name}=${token}; Path=/; Max-Age=${24 * 60 * 60}; SameSite=Lax; Secure`;
}

export function clearClientSessionCookie(name) {
  if (typeof document === "undefined" || !name) return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
}

export async function logoutAndRedirect(callbackUrl = "/") {
  await fetch("/api/logout", {
    method: "POST",
    credentials: "include",
  }).catch(() => null);
  clearClientSessionCookie("freetc_session_client");
  if (typeof window !== "undefined") {
    window.location.href = callbackUrl;
  }
}
