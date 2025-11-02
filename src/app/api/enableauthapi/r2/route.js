export const runtime = "edge";

import { auth } from "@/auth";
import { getRequestContext } from "@cloudflare/next-on-pages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

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
let quotaTableEnsured = false;

async function ensureTagsColumn(db) {
  if (tagsColumnEnsured) return;
  try {
    await db.prepare("ALTER TABLE imginfo ADD COLUMN tags TEXT DEFAULT ''").run();
  } catch (error) {
    // 列可能已经存在，忽略错误
  } finally {
    tagsColumnEnsured = true;
  }
}

async function ensureQuotaTable(db) {
  if (quotaTableEnsured) return;
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS upload_quota (
          identity TEXT NOT NULL,
          scope TEXT NOT NULL,
          day TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 0,
          role TEXT,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (identity, scope, day)
        )`,
      )
      .run();
  } finally {
    quotaTableEnsured = true;
  }
}

const normaliseTags = (customTags, kindTag) => {
  const tagSet = new Set(
    customTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
  );
  if (kindTag) tagSet.add(kindTag);
  const tagArray = Array.from(tagSet);
  const storageString = tagArray.length > 0 ? `,${tagArray.join(",")},` : "";
  return { tagArray, storageString };
};

const determineKindTag = (fileType, filename) => {
  const lowerType = (fileType || "").toLowerCase();
  if (lowerType.startsWith("image/")) return "image";
  if (lowerType.startsWith("video/")) return "video";
  const lowerName = (filename || "").toLowerCase();
  const extension = lowerName.includes(".") ? lowerName.split(".").pop() : "";
  if (IMAGE_EXTENSIONS.includes(extension)) return "image";
  if (VIDEO_EXTENSIONS.includes(extension)) return "video";
  return "file";
};

export async function POST(request) {
  const { env } = getRequestContext();

  if (!env.IMGRS) {
    return Response.json(
      {
        status: 500,
        message: "IMGRS is not Set",
        success: false,
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }

  const reqUrl = new URL(request.url);
  const ipHeader =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.socket?.remoteAddress ||
    "";
  const clientIp = ipHeader ? ipHeader.split(",")[0].trim() : "IP not found";
  const referer = request.headers.get("Referer") || "Referer";
  const session = await auth();
  const role = session?.user?.role ?? "anonymous";
  const isAdmin = role === "admin";
  const isRegular = role === "user";
  const userIdentifier =
    (session?.user?.email || session?.user?.id || session?.user?.name || "").toString().trim() || clientIp || "unknown";
  const anonymousIdentity = `anon:${clientIp || "unknown"}`;
  const regularIdentity = `user:${userIdentifier}`;
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
  }).format(new Date());

  const formData = await request.formData();
  const fileEntries = formData.getAll("file").filter(Boolean);
  const fileField = fileEntries[0];
  if (!fileField) {
    return Response.json(
      {
        status: 400,
        message: "file is required",
        success: false,
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  if (!isAdmin && env.IMG) {
    await ensureQuotaTable(env.IMG);

    if (!isRegular && fileEntries.length > 1) {
      return Response.json(
        {
          status: 400,
          message: "未登录用户每次仅允许上传一个文件",
          success: false,
        },
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    if (!isRegular) {
      const quota = await env.IMG
        .prepare("SELECT count FROM upload_quota WHERE identity = ? AND scope = 'lifetime' AND day = 'all'")
        .bind(anonymousIdentity)
        .first();
      if (quota && Number(quota.count) >= 1) {
        return Response.json(
          {
            status: 429,
            message: "未登录用户仅可体验一次上传，请登录后继续使用。",
            success: false,
          },
          {
            status: 429,
            headers: corsHeaders,
          },
        );
      }
    } else {
      const quota = await env.IMG
        .prepare("SELECT count FROM upload_quota WHERE identity = ? AND scope = 'daily' AND day = ?")
        .bind(regularIdentity, dayKey)
        .first();
      if (quota && Number(quota.count) >= 15) {
        return Response.json(
          {
            status: 429,
            message: "今日上传次数已达上限，请明天再试或升级权限。",
            success: false,
          },
          {
            status: 429,
            headers: corsHeaders,
          },
        );
      }
    }
  }

  const fileType = fileField.type || "";
  const filename = fileField.name || `upload-${Date.now()}`;
  const customTags = formData.get("tags") || "";

  const kindTag = determineKindTag(fileType, filename);
  const { tagArray, storageString } = normaliseTags(customTags, kindTag);

  const header = new Headers();
  header.set("content-type", fileType);
  header.set("content-length", `${fileField.size}`);

  try {
    await ensureTagsColumn(env.IMG);

    const object = await env.IMGRS.put(filename, fileField, {
      httpMetadata: header,
    });

    if (!object) {
      return Response.json(
        {
          status: 404,
          message: "上传失败",
          success: false,
        },
        {
          status: 404,
          headers: corsHeaders,
        },
      );
    }

    const fileUrl = `${reqUrl.origin}/api/rfile/${filename}`;
    const responsePayload = {
      url: fileUrl,
      code: 200,
      name: filename,
      tags: tagArray,
    };

    if (!env.IMG) {
      return Response.json(
        {
          ...responsePayload,
          env_img: "null",
          msg: "1",
        },
        {
          status: 200,
          headers: corsHeaders,
        },
      );
    }

    const nowTime = await get_nowTime();
    try {
      const ratingIndex = await getRating(env, fileUrl);
      await insertImageData(env.IMG, `/rfile/${filename}`, referer, clientIp, ratingIndex, nowTime, storageString);
      if (!isAdmin && env.IMG) {
        if (isRegular) {
          await env.IMG
            .prepare(
              `INSERT INTO upload_quota (identity, scope, day, count, role, updated_at)
               VALUES (?, 'daily', ?, 1, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(identity, scope, day)
               DO UPDATE SET count = upload_quota.count + 1, updated_at = CURRENT_TIMESTAMP`,
            )
            .bind(regularIdentity, dayKey, role)
            .run();
        } else {
          await env.IMG
            .prepare(
              `INSERT INTO upload_quota (identity, scope, day, count, role, updated_at)
               VALUES (?, 'lifetime', 'all', 1, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(identity, scope, day)
               DO UPDATE SET count = upload_quota.count + 1, updated_at = CURRENT_TIMESTAMP`,
            )
            .bind(anonymousIdentity, role)
            .run();
        }
      }

      return Response.json(
        {
          ...responsePayload,
          msg: "2",
          Referer: referer,
          clientIp,
          rating_index: ratingIndex,
          nowTime,
        },
        {
          status: 200,
          headers: corsHeaders,
        },
      );
    } catch (error) {
      console.error("Insert image data failed:", error);
      await insertImageData(env.IMG, `/rfile/${filename}`, referer, clientIp, -1, nowTime, storageString);
      return Response.json(
        {
          ...responsePayload,
          msg: error.message,
        },
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }
  } catch (error) {
    return Response.json(
      {
        status: 500,
        message: error.message,
        success: false,
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
}

async function insertImageData(db, src, referer, ip, rating, time, tags) {
  try {
    await db
      .prepare(
        `INSERT INTO imginfo (url, referer, ip, rating, total, time, tags)
         VALUES (?, ?, ?, ?, 1, ?, ?)`,
      )
      .bind(src, referer, ip, rating, time, tags)
      .run();
  } catch (error) {
    console.error("insertImageData error:", error);
  }
}

async function get_nowTime() {
  const options = {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  const timedata = new Date();
  return new Intl.DateTimeFormat("zh-CN", options).format(timedata);
}

async function getRating(env, url) {
  try {
    const apikey = env.ModerateContentApiKey;
    const moderateContentUrl = apikey ? `https://api.moderatecontent.com/moderate/?key=${apikey}&` : "";
    const ratingApi = env.RATINGAPI ? `${env.RATINGAPI}?` : moderateContentUrl;

    if (ratingApi) {
      const res = await fetch(`${ratingApi}url=${url}`);
      const data = await res.json();
      return Object.prototype.hasOwnProperty.call(data, "rating_index") ? data.rating_index : -1;
    }
    return 0;
  } catch (error) {
    return -1;
  }
}
