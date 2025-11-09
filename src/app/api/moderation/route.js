export const runtime = "edge";

import { getRequestContext } from "@cloudflare/next-on-pages";
import { getBooleanConfig } from "@/lib/config";

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
