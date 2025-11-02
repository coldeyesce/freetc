
import { getRequestContext } from "@cloudflare/next-on-pages";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400", // 24 hours
  "Content-Type": "application/json",
};

export const runtime = "edge";

const sanitizeKey = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const resolveR2Key = (raw) => {
  if (!raw) return "";
  let key = raw;
  if (key.startsWith("http")) {
    try {
      const url = new URL(key);
      key = url.pathname;
    } catch (error) {
      return "";
    }
  }
  if (key.startsWith("/api/rfile/")) {
    key = key.replace("/api/rfile/", "");
  }
  if (key.startsWith("/rfile/")) {
    key = key.replace("/rfile/", "");
  }
  if (key.startsWith("/")) {
    key = key.slice(1);
  }
  return key;
};

export async function DELETE(request) {
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

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return Response.json(
      {
        code: 400,
        success: false,
        message: "请求体需要为 JSON",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  const names = [];
  if (Array.isArray(payload?.names)) {
    payload.names.forEach((item) => {
      const sanitized = sanitizeKey(item);
      if (sanitized) names.push(sanitized);
    });
  }
  const singleName = sanitizeKey(payload?.name);
  if (singleName) {
    names.push(singleName);
  }

  const uniqueNames = Array.from(new Set(names));
  if (uniqueNames.length === 0) {
    return Response.json(
      {
        code: 400,
        success: false,
        message: "缺少有效的删除目标",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  const deleted = [];
  const failed = [];

  for (const url of uniqueNames) {
    try {
      const result = await env.IMG.prepare("DELETE FROM imginfo WHERE url = ?").bind(url).run();
      const success = Boolean(result?.success);

      if (success && env.IMGRS) {
        const key = resolveR2Key(url);
        if (key) {
          try {
            await env.IMGRS.delete(key);
          } catch (r2Error) {
            console.warn("Failed to delete R2 object:", r2Error);
          }
        }
      }

      if (success) {
        deleted.push(url);
      } else {
        failed.push({ url, reason: "记录不存在或已被删除" });
      }
    } catch (error) {
      failed.push({ url, reason: error.message });
    }
  }

  const success = failed.length === 0;

  return Response.json(
    {
      code: success ? 200 : 207,
      success,
      deleted,
      failed,
    },
    {
      status: success ? 200 : 207,
      headers: corsHeaders,
    },
  );
}

