import { getRequestContext } from "@cloudflare/next-on-pages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

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

  try {
    let { page = 0, query = "", size = 5 } = await request.json();
    const pageIndex = Number(page) || 0;
    const pageSize = Math.min(Math.max(Number(size) || 5, 1), 50);
    const offset = pageIndex * pageSize;

    let results;
    let total;

    if (query) {
      const likeValue = `%${query}%`;
      const listStmt = env.IMG.prepare(
        "SELECT * FROM imginfo WHERE url LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?",
      ).bind(likeValue, pageSize, offset);
      const totalStmt = env.IMG.prepare(
        "SELECT COUNT(*) as total FROM imginfo WHERE url LIKE ?",
      ).bind(likeValue);
      ({ results } = await listStmt.all());
      total = await totalStmt.first();
    } else {
      const listStmt = env.IMG.prepare(
        "SELECT * FROM imginfo ORDER BY id DESC LIMIT ? OFFSET ?",
      ).bind(pageSize, offset);
      const totalStmt = env.IMG.prepare("SELECT COUNT(*) as total FROM imginfo");
      ({ results } = await listStmt.all());
      total = await totalStmt.first();
    }

    return Response.json({
      code: 200,
      success: true,
      message: "success",
      data: results,
      page: pageIndex,
      total: total?.total ?? 0,
      size: pageSize,
    });
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
