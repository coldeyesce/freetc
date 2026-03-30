export async function loginWithPassword({ username, password }) {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    ...data,
  };
}

export async function logoutAndRedirect(callbackUrl = "/") {
  await fetch("/api/logout", {
    method: "POST",
    credentials: "same-origin",
  }).catch(() => null);
  if (typeof window !== "undefined") {
    window.location.href = callbackUrl;
  }
}
