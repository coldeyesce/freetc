
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

let tgMetaTableEnsured = false;

async function ensureTelegramMetaTable(db) {
  if (tgMetaTableEnsured) return;
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS tg_file_meta (
          file_id TEXT PRIMARY KEY,
          file_name TEXT,
          message_id INTEGER,
          chat_id TEXT
        )`,
      )
      .run();
  } finally {
    tgMetaTableEnsured = true;
  }
}

async function getTelegramMeta(db, fileId) {
  if (!db || !fileId) return null;
  await ensureTelegramMetaTable(db);
  const stmt = db.prepare("SELECT file_id, file_name, message_id, chat_id FROM tg_file_meta WHERE file_id = ?").bind(fileId);
  return stmt.first();
}

async function deleteTelegramMeta(db, fileId) {
  if (!db || !fileId) return;
  await ensureTelegramMetaTable(db);
  await db.prepare("DELETE FROM tg_file_meta WHERE file_id = ?").bind(fileId).run();
}

async function deleteTelegramMessage(env, chatId, messageId) {
  if (!env?.TG_BOT_TOKEN) {
    throw new Error("未配置 Telegram Bot Token，无法删除远程文件");
  }
  const response = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/deleteMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
    }),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    // ignore parse error
  }

  if (!response.ok || payload?.ok === false) {
    const reason = payload?.description || `Telegram 删除消息失败（HTTP ${response.status}）`;
    throw new Error(reason);
  }
}

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
      const isTelegram = url.startsWith("/cfile/");
      if (isTelegram) {
        if (!env.TG_CHAT_ID) {
          throw new Error("未配置 Telegram Chat ID，无法删除远程文件");
        }
        const fileId = url.replace("/cfile/", "");
        const meta = await getTelegramMeta(env.IMG, fileId);
        const chatId = meta?.chat_id || env.TG_CHAT_ID;
        const messageId = meta?.message_id;
        if (!messageId) {
          throw new Error("缺少 Telegram 消息 ID，无法删除频道文件");
        }
        await deleteTelegramMessage(env, chatId, messageId);
        await deleteTelegramMeta(env.IMG, fileId);
      }

      const result = await env.IMG.prepare("DELETE FROM imginfo WHERE url = ?").bind(url).run();
      const success = Boolean(result?.success);

      if (success) {
        if (!isTelegram && env.IMGRS) {
          const key = resolveR2Key(url);
          if (key) {
            try {
              await env.IMGRS.delete(key);
            } catch (r2Error) {
              console.warn("Failed to delete R2 object:", r2Error);
            }
          }
        }
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

