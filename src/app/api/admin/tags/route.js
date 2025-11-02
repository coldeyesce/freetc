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


