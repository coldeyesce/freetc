const AUTO_BLOCK_THRESHOLD = 3;
const AUTO_BLOCK_WINDOW_HOURS = 12;

let logsTableEnsured = false;
let blockTableEnsured = false;

export async function ensureUploadLogsTable(db) {
  if (!db || logsTableEnsured) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS upload_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT,
        storage TEXT,
        ip TEXT,
        referer TEXT,
        rating INTEGER,
        compliant INTEGER NOT NULL DEFAULT 1,
        status TEXT,
        message TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
    )
    .run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_upload_logs_ip ON upload_logs (ip)`).run();
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_upload_logs_created_at ON upload_logs (created_at)`).run();
  logsTableEnsured = true;
}

export async function ensureIpBlockTable(db) {
  if (!db || blockTableEnsured) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS upload_ip_blocklist (
        ip TEXT PRIMARY KEY,
        reason TEXT,
        blocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT
      )`,
    )
    .run();
  blockTableEnsured = true;
}

export async function recordUploadLog(
  db,
  {
    fileName = "unknown",
    storage = "r2",
    ip = "",
    referer = "",
    rating = null,
    compliant = true,
    status = "success",
    message = "",
  } = {},
) {
  if (!db) return;
  try {
    await ensureUploadLogsTable(db);
    await db
      .prepare(
        `INSERT INTO upload_logs (file_name, storage, ip, referer, rating, compliant, status, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
      )
      .bind(fileName, storage, ip, referer, rating ?? null, compliant ? 1 : 0, status, message)
      .run();
  } catch (error) {
    console.error("recordUploadLog error:", error);
  }
}

export async function isIpBlocked(db, ip) {
  if (!db || !ip) return null;
  try {
    await ensureIpBlockTable(db);
    const row = await db
      .prepare(`SELECT ip, reason, blocked_at, expires_at FROM upload_ip_blocklist WHERE ip = ?`)
      .bind(ip)
      .first();
    if (!row) return null;
    if (row.expires_at) {
      const expiresAt = new Date(row.expires_at);
      const now = new Date();
      if (Number.isFinite(expiresAt.getTime()) && expiresAt < now) {
        await removeIpBlock(db, ip);
        return null;
      }
    }
    return {
      ip: row.ip,
      reason: row.reason || "",
      blockedAt: row.blocked_at,
      expiresAt: row.expires_at,
    };
  } catch (error) {
    console.error("isIpBlocked error:", error);
    return null;
  }
}

export async function upsertIpBlock(db, ip, reason = "", expiresAt = null) {
  if (!db || !ip) return;
  try {
    await ensureIpBlockTable(db);
    await db
      .prepare(
        `INSERT INTO upload_ip_blocklist (ip, reason, blocked_at, expires_at)
         VALUES (?, ?, datetime('now', 'localtime'), ?)
         ON CONFLICT(ip) DO UPDATE SET reason = excluded.reason, expires_at = excluded.expires_at, blocked_at = excluded.blocked_at`,
      )
      .bind(ip, reason, expiresAt)
      .run();
  } catch (error) {
    console.error("upsertIpBlock error:", error);
  }
}

export async function removeIpBlock(db, ip) {
  if (!db || !ip) return;
  try {
    await ensureIpBlockTable(db);
    await db.prepare(`DELETE FROM upload_ip_blocklist WHERE ip = ?`).bind(ip).run();
  } catch (error) {
    console.error("removeIpBlock error:", error);
  }
}

export async function maybeAutoBlockIp(db, ip, { threshold = AUTO_BLOCK_THRESHOLD, windowHours = AUTO_BLOCK_WINDOW_HOURS } = {}) {
  if (!db || !ip) return;
  try {
    await ensureUploadLogsTable(db);
    await ensureIpBlockTable(db);
    const windowClause = `-${Math.max(1, windowHours)} hours`;
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS violations
         FROM upload_logs
         WHERE ip = ?
           AND compliant = 0
           AND created_at >= datetime('now', ?)`,
      )
      .bind(ip, windowClause)
      .first();
    const violations = Number(row?.violations) || 0;
    if (violations >= Math.max(1, threshold)) {
      await upsertIpBlock(db, ip, `自动风控：${violations} 次违规上传`, null);
    }
  } catch (error) {
    console.error("maybeAutoBlockIp error:", error);
  }
}

export async function listIpBlocks(db) {
  if (!db) return [];
  try {
    await ensureIpBlockTable(db);
    const { results = [] } = await db
      .prepare(`SELECT ip, reason, blocked_at, expires_at FROM upload_ip_blocklist ORDER BY blocked_at DESC`)
      .all();
    return results;
  } catch (error) {
    console.error("listIpBlocks error:", error);
    return [];
  }
}
