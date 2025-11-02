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

let tgMetaTableEnsured = false;
async function ensureTelegramMetaTable(db) {
  if (tgMetaTableEnsured) return;
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS tg_file_meta (
          file_id TEXT PRIMARY KEY,
          file_name TEXT,
          message_id INTEGER,
          chat_id TEXT
        )`,
      )
      .run();
  } finally {
    tgMetaTableEnsured = true;
  }
}

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
    let { results } = await listStmt.all();

    if (Array.isArray(results) && results.length > 0) {
      const telegramRecords = results.filter((item) => typeof item?.url === "string" && item.url.startsWith("/cfile/"));
      if (telegramRecords.length > 0) {
        await ensureTelegramMetaTable(env.IMG);
        const fileIds = telegramRecords
          .map((item) => item.url.replace("/cfile/", "").trim())
          .filter(Boolean);
        if (fileIds.length > 0) {
          const placeholders = fileIds.map(() => "?").join(",");
          const metaStmt = env.IMG
            .prepare(`SELECT file_id, file_name FROM tg_file_meta WHERE file_id IN (${placeholders})`)
            .bind(...fileIds);
          const metaRows = await metaStmt.all();
          const metaMap = new Map((metaRows?.results ?? []).map((row) => [row.file_id, row.file_name]));
          results = results.map((item) => {
            if (typeof item?.url === "string" && item.url.startsWith("/cfile/")) {
              const fileId = item.url.replace("/cfile/", "").trim();
              const fileName = metaMap.get(fileId);
              if (fileName) {
                return { ...item, filename: fileName };
              }
            }
            return item;
          });
        }
      }
    }

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

