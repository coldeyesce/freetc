import { getRequestContext } from "@cloudflare/next-on-pages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

export const runtime = "edge";

export async function GET() {
  const { env } = getRequestContext();

  if (!env?.IMG) {
    return Response.json(
      {
        success: false,
        message: "IMG 数据库未配置",
        tags: [],
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }

  try {
    const { results } = await env.IMG.prepare("SELECT tags FROM imginfo").all();
    const tagSet = new Set(["image", "video", "file"]);

    results?.forEach(({ tags }) => {
      if (!tags) return;
      String(tags)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag) => tagSet.add(tag));
    });

    return Response.json(
      {
        success: true,
        tags: Array.from(tagSet).sort(),
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
        tags: [],
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}


