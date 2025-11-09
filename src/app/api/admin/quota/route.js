import { getRequestContext } from "@cloudflare/next-on-pages";
import { getQuotaLimits, setQuotaLimits } from "@/lib/config";

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

const toSafeInteger = (value, fallback = 0) => {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return fallback;
  return parsed;
};

async function collectQuotaSnapshot(db) {
  await ensureQuotaTable(db);
  const limits = await getQuotaLimits(db);

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
  }).format(new Date());

  const lifetimeRow = await db.prepare("SELECT SUM(count) AS total FROM upload_quota WHERE scope = 'lifetime'").first();
  const lifetimeAnonymous = toNumber(lifetimeRow?.total);

  const { results: todayRows = [] } = await db
    .prepare("SELECT role, SUM(count) AS total FROM upload_quota WHERE scope = 'daily' AND day = ? GROUP BY role")
    .bind(todayKey)
    .all();

  const {
    results: recentRows = [],
  } = await db
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

  return {
    lifetimeAnonymous,
    limits,
    today: {
      day: todayKey,
      ...todaySummary,
      limitUser: limits.user,
      limitAnonymous: limits.anonymous,
    },
    recent,
  };
}

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

  try {
    const snapshot = await collectQuotaSnapshot(env.IMG);
    return Response.json(
      {
        success: true,
        data: snapshot,
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

export async function PATCH(request) {
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

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "请求体需要为 JSON",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  const anonymousLimit = toSafeInteger(payload?.anonymousLimit, 1);
  const userLimit = toSafeInteger(payload?.userLimit, 15);

  if (anonymousLimit < 0 || userLimit < 0) {
    return Response.json(
      {
        success: false,
        message: "配额数值必须为大于等于 0 的整数",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  try {
    await setQuotaLimits(env.IMG, { anonymous: anonymousLimit, user: userLimit });
    const snapshot = await collectQuotaSnapshot(env.IMG);
    return Response.json(
      {
        success: true,
        message: "配额已更新",
        data: snapshot,
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

