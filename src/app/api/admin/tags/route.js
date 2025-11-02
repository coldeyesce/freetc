import { getRequestContext } from "@cloudflare/next-on-pages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

export const runtime = "edge";

const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "bmp",
  "tiff",
  "tif",
  "webp",
  "svg",
  "ico",
  "heic",
  "heif",
  "raw",
  "psd",
  "ai",
  "eps",
];

const VIDEO_EXTENSIONS = [
  "mp4",
  "mkv",
  "avi",
  "mov",
  "wmv",
  "flv",
  "webm",
  "ogg",
  "ogv",
  "m4v",
  "3gp",
  "3g2",
  "mpg",
  "mpeg",
  "mxf",
  "vob",
];

let tagsColumnEnsured = false;
let tagRegistryEnsured = false;

async function ensureTagsColumn(db) {
  if (tagsColumnEnsured) return;
  try {
    await db.prepare("ALTER TABLE imginfo ADD COLUMN tags TEXT DEFAULT ''").run();
  } catch (error) {
    // ignore if already exists
  } finally {
    tagsColumnEnsured = true;
  }
}

async function ensureTagRegistry(db) {
  if (tagRegistryEnsured) return;
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS taglist (
          name TEXT PRIMARY KEY,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`,
      )
      .run();
  } finally {
    tagRegistryEnsured = true;
  }
}

const sanitizeTag = (tag) => {
  if (typeof tag !== "string") return "";
  const trimmed = tag.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase() === "all") return "";
  return trimmed.length > 48 ? trimmed.slice(0, 48) : trimmed;
};

const normalizeUrl = (value) => {
  if (!value) return "";
  let key = value;
  if (key.startsWith("http://") || key.startsWith("https://")) {
    try {
      const parsed = new URL(key);
      key = parsed.pathname;
    } catch (error) {
      // fallback to original value
    }
  }
  if (key.startsWith("/api/rfile/")) {
    key = key.replace("/api", "");
  }
  if (!key.startsWith("/")) {
    key = `/${key}`;
  }
  return key;
};

const detectKindFromUrl = (url) => {
  const path = (url || "").toLowerCase();
  const filePath = path.split("?")[0];
  const filename = filePath.split("/").pop() || "";
  const extension = filename.includes(".") ? filename.split(".").pop() : "";
  if (IMAGE_EXTENSIONS.includes(extension)) return "image";
  if (VIDEO_EXTENSIONS.includes(extension)) return "video";
  return "file";
};

const RESERVED_TAGS = new Set(["all", "image", "video", "file"]);

const buildStorageString = (tags) => (tags.length > 0 ? `,${tags.join(",")},` : "");

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

  await ensureTagsColumn(env.IMG);
  await ensureTagRegistry(env.IMG);
  await ensureTagRegistry(env.IMG);

  let body;
  try {
    body = await request.json();
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

  const originalUrl = typeof body?.url === "string" ? body.url : "";
  const url = normalizeUrl(originalUrl);
  const tagsInput = Array.isArray(body?.tags) ? body.tags : [];

  if (!url) {
    return Response.json(
      {
        success: false,
        message: "缺少文件标识",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  try {
    const existing = await env.IMG.prepare("SELECT url FROM imginfo WHERE url = ? LIMIT 1").bind(url).first();
    if (!existing) {
      return Response.json(
        {
          success: false,
          message: "记录不存在",
        },
        {
          status: 404,
          headers: corsHeaders,
        },
      );
    }

    const detectedKind = detectKindFromUrl(existing.url);
    const normalizedTags = [
      ...tagsInput.map(sanitizeTag).filter(Boolean),
      detectedKind,
    ];
    const uniqueTags = Array.from(new Set(normalizedTags));
    const storageString = buildStorageString(uniqueTags);

    for (const tag of uniqueTags) {
      if (!tag || RESERVED_TAGS.has(tag)) continue;
      await env.IMG.prepare("INSERT OR IGNORE INTO taglist (name) VALUES (?)").bind(tag).run();
    }

    const result = await env.IMG.prepare("UPDATE imginfo SET tags = ? WHERE url = ?").bind(storageString, url).run();
    if (!result?.success) {
      return Response.json(
        {
          success: false,
          message: "更新标签失败",
        },
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    return Response.json(
      {
        success: true,
        tags: uniqueTags,
        storage: storageString,
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



export async function POST(request) {
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

  await ensureTagRegistry(env.IMG);

  let body;
  try {
    body = await request.json();
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

  const tag = sanitizeTag(body?.tag);
  if (!tag) {
    return Response.json(
      {
        success: false,
        message: "无效的标签",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  if (RESERVED_TAGS.has(tag)) {
    return Response.json(
      {
        success: true,
        tag,
        reserved: true,
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  }

  try {
    await env.IMG.prepare("INSERT OR IGNORE INTO taglist (name) VALUES (?)").bind(tag).run();
    return Response.json(
      {
        success: true,
        tag,
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
export async function DELETE(request) {
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

  await ensureTagsColumn(env.IMG);

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

  const rawTag = sanitizeTag(payload?.tag);
  const force = Boolean(payload?.force);

  if (!rawTag) {
    return Response.json(
      {
        success: false,
        message: "无效的标签",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  if (RESERVED_TAGS.has(rawTag)) {
    return Response.json(
      {
        success: false,
        message: "系统默认标签不可删除",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  try {
    const pattern = `%,${rawTag},%`;
    const { results } = await env.IMG.prepare("SELECT url, tags FROM imginfo WHERE tags LIKE ?").bind(pattern).all();
    const rows = Array.isArray(results) ? results : [];
    const count = rows.length;

    if (count > 0 && !force) {
      return Response.json(
        {
          success: false,
          requireConfirmation: true,
          count,
        },
        {
          status: 409,
          headers: corsHeaders,
        },
      );
    }

    for (const row of rows) {
      const parts = String(row.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((tag) => tag !== rawTag);
      const detectedKind = detectKindFromUrl(row.url);
      if (detectedKind && !parts.includes(detectedKind)) {
        parts.push(detectedKind);
      }
      const unique = Array.from(new Set(parts));
      const updated = buildStorageString(unique);
      await env.IMG.prepare("UPDATE imginfo SET tags = ? WHERE url = ?").bind(updated, row.url).run();
    }

    await env.IMG.prepare("DELETE FROM taglist WHERE name = ?").bind(rawTag).run();

    return Response.json(
      {
        success: true,
        removed: rawTag,
        affected: count,
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
