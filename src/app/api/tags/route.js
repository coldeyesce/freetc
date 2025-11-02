import { getRequestContext } from "@cloudflare/next-on-pages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

export const runtime = "edge";

const RESERVED_TAGS = ["all", "image", "video", "file"];

async function ensureTagRegistry(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS taglist (
        name TEXT PRIMARY KEY,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
    )
    .run();
}

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
    await ensureTagRegistry(env.IMG);

    const baseTags = new Set(["image", "video", "file"]);
    const tagSet = new Set(["image", "video", "file"]);

    const customQuery = await env.IMG.prepare("SELECT name FROM taglist ORDER BY name COLLATE NOCASE").all();
    customQuery?.results?.forEach(({ name }) => {
      if (!name) return;
      const trimmed = String(name).trim();
      if (!trimmed || RESERVED_TAGS.includes(trimmed)) return;
      tagSet.add(trimmed);
    });

    const { results } = await env.IMG.prepare("SELECT tags FROM imginfo").all();

    results?.forEach(({ tags }) => {
      if (!tags) return;
      String(tags)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag) => {
          if (!tag || RESERVED_TAGS.includes(tag)) return;
          tagSet.add(tag);
        });
    });

    return Response.json(
      {
        success: true,
        tags: Array.from(new Set([...baseTags, ...tagSet])).sort((a, b) => a.localeCompare(b, "zh-CN")),
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


