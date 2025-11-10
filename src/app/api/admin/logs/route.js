export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";
import { ensureUploadLogsTable } from "@/lib/uploadLogs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

const clampPage = (value, fallback = 1) => {
  const num = Number(value);
  if (!Number.isFinite(num) || Number.isNaN(num) || num <= 0) return fallback;
  return Math.floor(num);
};

const clampPageSize = (value, fallback = 20) => {
  const num = Number(value);
  if (!Number.isFinite(num) || Number.isNaN(num) || num <= 0) return fallback;
  return Math.max(5, Math.min(100, Math.floor(num)));
};

const toBoolFilter = (value) => {
  if (value === undefined || value === null) return null;
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  return null;
};

const sanitizeLike = (value) => `%${value.replace(/%/g, "").replace(/_/g, "")}%`;

export async function GET(request) {
  const { env } = getRequestContext();

  if (!env?.IMG) {
    return Response.json(
      { success: false, message: "IMG 数据库未配置" },
      { status: 500, headers: corsHeaders },
    );
  }

  await ensureUploadLogsTable(env.IMG);

  const { searchParams } = new URL(request.url);
  const page = clampPage(searchParams.get("page"), 1);
  const pageSize = clampPageSize(searchParams.get("pageSize"), 20);
  const offset = (page - 1) * pageSize;

  const search = (searchParams.get("search") || "").trim();
  const ipFilter = (searchParams.get("ip") || "").trim();
  const statusFilter = (searchParams.get("status") || "").trim();
  const complianceFilter = toBoolFilter(searchParams.get("compliant"));
  const start = (searchParams.get("start") || "").trim();
  const end = (searchParams.get("end") || "").trim();

  const whereParts = [];
  const bindings = [];

  if (ipFilter) {
    whereParts.push("ip = ?");
    bindings.push(ipFilter);
  }

  if (statusFilter) {
    whereParts.push("status = ?");
    bindings.push(statusFilter);
  }

  if (typeof complianceFilter === "boolean") {
    whereParts.push("compliant = ?");
    bindings.push(complianceFilter ? 1 : 0);
  }

  if (search) {
    whereParts.push("(file_name LIKE ? OR message LIKE ? OR referer LIKE ?)");
    const pattern = sanitizeLike(search);
    bindings.push(pattern, pattern, pattern);
  }

  if (start) {
    whereParts.push("datetime(created_at) >= datetime(?)");
    bindings.push(start);
  }

  if (end) {
    whereParts.push("datetime(created_at) <= datetime(?)");
    bindings.push(end);
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  try {
    const totalRow = await env.IMG.prepare(`SELECT COUNT(*) AS total FROM upload_logs ${whereClause}`).bind(...bindings).first();
    const total = Number(totalRow?.total) || 0;

    const logsStmt = env.IMG
      .prepare(
        `SELECT id, file_name, storage, ip, referer, rating, compliant, status, message, created_at
         FROM upload_logs
         ${whereClause}
         ORDER BY datetime(created_at) DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(...bindings, pageSize, offset);
    const { results: logRows = [] } = await logsStmt.all();

    const logs = logRows.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      storage: row.storage,
      ip: row.ip,
      referer: row.referer,
      rating: row.rating,
      compliant: Boolean(row.compliant),
      status: row.status,
      message: row.message,
      createdAt: row.created_at,
    }));

    const statsRow = await env.IMG
      .prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN compliant = 0 THEN 1 ELSE 0 END) AS violations,
           SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked,
           SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS failed
         FROM upload_logs`)
      .first();

    const recentRows = await env.IMG
      .prepare(
        `SELECT strftime('%Y-%m-%d', created_at) AS day,
                COUNT(*) AS total,
                SUM(CASE WHEN compliant = 0 THEN 1 ELSE 0 END) AS violations
         FROM upload_logs
         WHERE created_at >= datetime('now', '-14 days')
         GROUP BY day
         ORDER BY day DESC`)
      .all();

    const topIpRows = await env.IMG
      .prepare(
        `SELECT ip,
                COUNT(*) AS total,
                SUM(CASE WHEN compliant = 0 THEN 1 ELSE 0 END) AS violations
         FROM upload_logs
         WHERE ip IS NOT NULL AND ip != ''
         GROUP BY ip
         ORDER BY violations DESC, total DESC
         LIMIT 10`)
      .all();

    return Response.json(
      {
        success: true,
        data: {
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
          },
          logs,
          stats: {
            total: Number(statsRow?.total) || 0,
            violations: Number(statsRow?.violations) || 0,
            blocked: Number(statsRow?.blocked) || 0,
            failed: Number(statsRow?.failed) || 0,
          },
          recent: recentRows.results?.map((row) => ({
            day: row.day,
            total: Number(row.total) || 0,
            violations: Number(row.violations) || 0,
          })) || [],
          topIps: topIpRows.results?.map((row) => ({
            ip: row.ip,
            total: Number(row.total) || 0,
            violations: Number(row.violations) || 0,
          })) || [],
        },
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error("logs GET error:", error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500, headers: corsHeaders },
    );
  }
}
