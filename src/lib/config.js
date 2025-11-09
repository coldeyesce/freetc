const DEFAULT_QUOTA_LIMITS = {
  anonymous: 1,
  user: 15,
};

let booleanConfigTableEnsured = false;
let quotaConfigTableEnsured = false;

async function ensureBooleanConfigTable(db) {
  if (booleanConfigTableEnsured || !db) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
    )
    .run();
  booleanConfigTableEnsured = true;
}

async function ensureQuotaConfigTable(db) {
  if (quotaConfigTableEnsured || !db) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS quota_config (
        key TEXT PRIMARY KEY,
        value INTEGER NOT NULL DEFAULT 0
      )`,
    )
    .run();
  quotaConfigTableEnsured = true;
}

export async function getBooleanConfig(db, key, fallback = false) {
  if (!db || !key) return Boolean(fallback);
  await ensureBooleanConfigTable(db);
  const row = await db.prepare('SELECT value FROM app_config WHERE key = ?').bind(key).first();
  if (!row || typeof row.value === 'undefined' || row.value === null) {
    return Boolean(fallback);
  }
  const normalized = String(row.value).trim();
  if (!normalized) return Boolean(fallback);
  if (normalized === '1' || normalized.toLowerCase() === 'true') return true;
  if (normalized === '0' || normalized.toLowerCase() === 'false') return false;
  return Boolean(fallback);
}

export async function setBooleanConfig(db, key, value) {
  if (!db || !key) return false;
  await ensureBooleanConfigTable(db);
  const storedValue = value ? '1' : '0';
  await db
    .prepare(
      `INSERT INTO app_config (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .bind(key, storedValue)
    .run();
  return true;
}

export async function getQuotaLimits(db) {
  const limits = { ...DEFAULT_QUOTA_LIMITS };
  if (!db) return limits;
  await ensureQuotaConfigTable(db);
  const result = await db.prepare('SELECT key, value FROM quota_config').all();
  for (const row of result?.results ?? []) {
    if (!row?.key) continue;
    const key = String(row.key).trim();
    const val = Number(row.value);
    if (key === 'anonymous_limit' && Number.isFinite(val) && val >= 0) {
      limits.anonymous = Math.floor(val);
    }
    if (key === 'user_limit' && Number.isFinite(val) && val >= 0) {
      limits.user = Math.floor(val);
    }
  }
  return limits;
}

export async function setQuotaLimits(db, { anonymous, user }) {
  if (!db) return DEFAULT_QUOTA_LIMITS;
  await ensureQuotaConfigTable(db);
  const anon = Number.isFinite(anonymous) && anonymous >= 0 ? Math.floor(anonymous) : DEFAULT_QUOTA_LIMITS.anonymous;
  const usr = Number.isFinite(user) && user >= 0 ? Math.floor(user) : DEFAULT_QUOTA_LIMITS.user;
  const stmt = await db.prepare(
    `INSERT INTO quota_config (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );
  await stmt.bind('anonymous_limit', anon).run();
  await stmt.bind('user_limit', usr).run();
  return { anonymous: anon, user: usr };
}
