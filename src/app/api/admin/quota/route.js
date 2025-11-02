import { getRequestContext } from "@cloudflare/next-on-pages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

export const runtime = "edge";

let quotaTableEnsured = false;

async function ensureQuotaTable(db) {
  if (quotaTableEnsured) return;
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS upload_quota (
          identity TEXT NOT NULL,
          scope TEXT NOT NULL,
          day TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 0,
          role TEXT,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (identity, scope, day)
        )`,
      )
      .run();
  } finally {
    quotaTableEnsured = true;
  }
}

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export async function GET() {
  const { env } = getRequestContext();

  if (!env?.IMG) {
    return Response.json(
      {
        success: false,
        message: "IMG 数据库未配置",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }

  await ensureQuotaTable(env.IMG);

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
  }).format(new Date());

  try {
    const lifetimeRow = await env.IMG
      .prepare("SELECT SUM(count) AS total FROM upload_quota WHERE scope = 'lifetime'")
      .first();
    const lifetimeAnonymous = toNumber(lifetimeRow?.total);

    const { results: todayRows = [] } = await env.IMG
      .prepare("SELECT role, SUM(count) AS total FROM upload_quota WHERE scope = 'daily' AND day = ? GROUP BY role")
      .bind(todayKey)
      .all();

    const {
      results: recentRows = [],
    } = await env.IMG
      .prepare(
        `SELECT day, role, SUM(count) AS total
         FROM upload_quota
         WHERE scope = 'daily'
         GROUP BY day, role
         ORDER BY day DESC
         LIMIT 60`,
      )
      .all();

    const recentMap = new Map();
    recentRows.forEach(({ day, role, total }) => {
      if (!day) return;
      const key = day.trim();
      const list = recentMap.get(key) ?? [];
      list.push({
        role: role || "unknown",
        total: toNumber(total),
      });
      recentMap.set(key, list);
    });

    const recent = Array.from(recentMap.entries())
      .sort(([a], [b]) => (a > b ? -1 : a < b ? 1 : 0))
      .slice(0, 14)
      .map(([day, records]) => ({
        day,
        records,
        total: records.reduce((sum, item) => sum + item.total, 0),
      }));

    const todaySummary = todayRows.reduce(
      (acc, row) => {
        const role = row?.role || "unknown";
        const count = toNumber(row?.total);
        if (role === "user") {
          acc.user = count;
        } else if (role === "admin") {
          acc.admin = count;
        } else {
          acc.anonymous = count;
        }
        acc.total += count;
        return acc;
      },
      { user: 0, admin: 0, anonymous: 0, total: 0 },
    );

    return Response.json(
      {
        success: true,
        data: {
          lifetimeAnonymous,
          today: {
            day: todayKey,
            ...todaySummary,
            limitUser: 15,
            limitAnonymous: 1,
          },
          recent,
        },
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}

