function normalizeEnvValue(value, { trim = true } = {}) {
  if (value == null) return "";
  const normalized = String(value).replace(/\r/g, "").replace(/\n/g, "");
  return trim ? normalized.trim() : normalized;
}

export function getAuthConfig() {
  const adminUsername = normalizeEnvValue(process.env.BASIC_USER);
  const adminPassword = normalizeEnvValue(process.env.BASIC_PASS);
  const regularUsername = normalizeEnvValue(process.env.REGULAR_USER);
  const regularPassword = normalizeEnvValue(process.env.REGULAR_PASS);
  const secret = normalizeEnvValue(process.env.SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET);
  const debugToken = normalizeEnvValue(process.env.AUTH_DEBUG_TOKEN, { trim: false });

  return {
    adminUsername,
    adminPassword,
    regularUsername,
    regularPassword,
    secret,
    debugToken,
    hasAdminCredentials: Boolean(adminUsername && adminPassword),
    hasRegularCredentials: Boolean(regularUsername && regularPassword),
    hasSecret: Boolean(secret),
  };
}

export function getAuthDiagnostics() {
  const config = getAuthConfig();
  return {
    hasAdminUser: Boolean(config.adminUsername),
    hasAdminPass: Boolean(config.adminPassword),
    hasRegularUser: Boolean(config.regularUsername),
    hasRegularPass: Boolean(config.regularPassword),
    hasSecret: Boolean(config.secret),
    hasAuthDebugToken: Boolean(config.debugToken),
    adminUserLength: config.adminUsername.length,
    adminPassLength: config.adminPassword.length,
    regularUserLength: config.regularUsername.length,
    regularPassLength: config.regularPassword.length,
    runtime: process.env.NODE_ENV || "unknown",
  };
}

export function normalizeSubmittedCredentials(credentials = {}) {
  return {
    username: normalizeEnvValue(credentials.username),
    password: normalizeEnvValue(credentials.password),
  };
}
