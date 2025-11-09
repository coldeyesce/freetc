export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";
import { getBooleanConfig, setBooleanConfig } from "@/lib/config";

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
      {
        success: true,
        data: { enabled: false },
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  }

  const enabled = await getBooleanConfig(env.IMG, "moderation_enabled", false);
  return Response.json(
    {
      success: true,
      data: { enabled },
    },
    {
      status: 200,
      headers: corsHeaders,
    },
  );
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

  const enabled = Boolean(payload?.enabled);
  await setBooleanConfig(env.IMG, "moderation_enabled", enabled);

  return Response.json(
    {
      success: true,
      message: `内容检测已${enabled ? "开启" : "关闭"}`,
      data: { enabled },
    },
    {
      status: 200,
      headers: corsHeaders,
    },
  );
}
