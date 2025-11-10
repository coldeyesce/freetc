-- freetc.sql
-- 初始化 FreeTC 所需的 Cloudflare D1 数据库对象

PRAGMA foreign_keys = ON;

/* -------------------------------------------------------------------------- */
/*  上传文件主表                                                              */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS imginfo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  referer TEXT,
  ip TEXT,
  rating INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  time TEXT,
  tags TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_imginfo_url ON imginfo (url);
CREATE INDEX IF NOT EXISTS idx_imginfo_tags ON imginfo (tags);
CREATE INDEX IF NOT EXISTS idx_imginfo_time ON imginfo (time);

/* -------------------------------------------------------------------------- */
/*  Telegram 访问日志                                                         */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS tgimglog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  referer TEXT,
  ip TEXT,
  time TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tgimglog_url ON tgimglog (url);
CREATE INDEX IF NOT EXISTS idx_tgimglog_time ON tgimglog (time);

/* -------------------------------------------------------------------------- */
/*  标签列表（自定义标签）                                                    */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS taglist (
  name TEXT PRIMARY KEY,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

/* -------------------------------------------------------------------------- */
/*  上传配额统计                                                               */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS upload_quota (
  identity TEXT NOT NULL,
  scope TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  role TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (identity, scope, day)
);

/* -------------------------------------------------------------------------- */
/*  上传行为日志（用于监控面板与风控）                                        */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS upload_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT,
  storage TEXT,
  ip TEXT,
  referer TEXT,
  rating INTEGER,
  compliant INTEGER NOT NULL DEFAULT 1,
  status TEXT,
  message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_upload_logs_ip ON upload_logs (ip);
CREATE INDEX IF NOT EXISTS idx_upload_logs_created_at ON upload_logs (created_at);

/* -------------------------------------------------------------------------- */
/*  手动 / 自动封禁 IP 表                                                     */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS upload_ip_blocklist (
  ip TEXT PRIMARY KEY,
  reason TEXT,
  blocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);

/* -------------------------------------------------------------------------- */
/*  Telegram 文件元数据（用于删除消息等）                                      */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS tg_file_meta (
  file_id TEXT PRIMARY KEY,
  file_name TEXT,
  message_id INTEGER,
  chat_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

/* -------------------------------------------------------------------------- */
/*  通用键值存储：布尔配置                                                    */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

/* -------------------------------------------------------------------------- */
/*  通用键值存储：配额配置                                                    */
/* -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS quota_config (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);
