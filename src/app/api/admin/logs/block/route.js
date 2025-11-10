export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";
import { ensureIpBlockTable, listIpBlocks, upsertIpBlock, removeIpBlock } from "@/lib/uploadLogs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

export async function GET() {
  const { env } = getRequestContext();

  if (!env?.IMG) {
    return Response.json(
      { success: false, message: "IMG 数据库未配置" },
      { status: 500, headers: corsHeaders },
    );
  }

  try {
    await ensureIpBlockTable(env.IMG);
    const items = await listIpBlocks(env.IMG);
    return Response.json(
      { success: true, data: items },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("block GET error:", error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function POST(request) {
  const { env } = getRequestContext();
  if (!env?.IMG) {
    return Response.json(
      { success: false, message: "IMG 数据库未配置" },
      { status: 500, headers: corsHeaders },
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return Response.json(
      { success: false, message: "请求体需要为 JSON" },
      { status: 400, headers: corsHeaders },
    );
  }

  const ip = (payload?.ip || "").trim();
  const reason = (payload?.reason || "手动封禁").trim();
  const durationHours = Number(payload?.hours);
  const expiresAt = Number.isFinite(durationHours) && durationHours > 0 ? new Date(Date.now() + durationHours * 3600000) : null;

  if (!ip) {
    return Response.json(
      { success: false, message: "IP 不能为空" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    await ensureIpBlockTable(env.IMG);
    await upsertIpBlock(env.IMG, ip, reason || "手动封禁", expiresAt ? expiresAt.toISOString() : null);
    const items = await listIpBlocks(env.IMG);
    return Response.json(
      { success: true, message: "封禁已更新", data: items },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("block POST error:", error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function DELETE(request) {
  const { env } = getRequestContext();
  if (!env?.IMG) {
    return Response.json(
      { success: false, message: "IMG 数据库未配置" },
      { status: 500, headers: corsHeaders },
    );
  }

  const { searchParams } = new URL(request.url);
  const ip = (searchParams.get("ip") || "").trim();
  if (!ip) {
    return Response.json(
      { success: false, message: "需要提供 ip 参数" },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    await ensureIpBlockTable(env.IMG);
    await removeIpBlock(env.IMG, ip);
    const items = await listIpBlocks(env.IMG);
    return Response.json(
      { success: true, message: "已解除封禁", data: items },
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("block DELETE error:", error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500, headers: corsHeaders },
    );
  }
}
