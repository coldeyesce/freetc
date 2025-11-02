import { getRequestContext } from "@cloudflare/next-on-pages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

let tagsColumnEnsured = false;
async function ensureTagsColumn(db) {
  if (tagsColumnEnsured) return;
  try {
    await db.prepare("ALTER TABLE imginfo ADD COLUMN tags TEXT DEFAULT ''").run();
  } catch (error) {
    // ignore if column exists
  } finally {
    tagsColumnEnsured = true;
  }
}

export const runtime = "edge";

export async function POST(request) {
  const { env } = getRequestContext();

  if (!env?.IMG) {
    return Response.json(
      {
        code: 500,
        success: false,
        message: "IMG 数据库未配置",
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }

  await ensureTagsColumn(env.IMG);

  try {
    let { page = 0, query = "", size = 5, tag = "" } = await request.json();
    const pageIndex = Number(page) || 0;
    const pageSize = Math.min(Math.max(Number(size) || 5, 1), 50);
    const offset = pageIndex * pageSize;
    const tagValue = (tag || "").trim();

    const conditions = [];
    const params = [];

    if (query) {
      conditions.push("url LIKE ?");
      params.push(`%${query}%`);
    }

    if (tagValue) {
      conditions.push("tags LIKE ?");
      params.push(`%,${tagValue},%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const listSql = `SELECT * FROM imginfo ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
    const totalSql = `SELECT COUNT(*) as total FROM imginfo ${whereClause}`;

    const listParams = [...params, pageSize, offset];
    const listStmt = env.IMG.prepare(listSql).bind(...listParams);
    const { results } = await listStmt.all();

    const totalStmt = env.IMG.prepare(totalSql).bind(...params);
    const totalRow = await totalStmt.first();

    return Response.json(
      {
        code: 200,
        success: true,
        message: "success",
        data: results,
        page: pageIndex,
        total: totalRow?.total ?? 0,
        size: pageSize,
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    return Response.json(
      {
        code: 500,
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

