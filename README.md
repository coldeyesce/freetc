# FreeTC 部署与运维指南

FreeTC 是一套基于 **Next.js (App Router)** + **Cloudflare Pages / Workers** 的多端图床与文件托管系统，内置以下能力：

- R2 对象存储与 Telegram Channel 双通道上传
- D1 数据库存储元数据、配额、标签与风控日志
- 明暗双主题首页、可视化上传监控面板与后台素材管理
- 标签分类、自定义标签、批量删除、内容安全检测（NSFW）
- IP 配额与自动封禁机制，防止恶意滥用

本文将引导你从零开始完成部署，并提供数据库结构与常见排障建议。

---

## 1. 环境要求

| 组件 | 版本 / 说明 |
| ---- | ------------ |
| Node.js | ≥ 18.18（本地开发、构建使用） |
| npm / pnpm | 推荐 npm 9+（仓库内使用 npm scripts） |
| Cloudflare 账号 | 需具备 Pages、Workers、R2、D1 使用权限 |
| Wrangler CLI | `npm install -g wrangler`，用于本地调试与数据库操作 |
| Telegram Bot | 若需使用 Telegram 上传/删除功能，请提前创建 Bot 并获取 Chat ID |

---

## 2. 获取代码与依赖

```bash
# 克隆仓库
git clone https://github.com/<your-org>/freetc.git
cd freetc

# 安装依赖
npm install
```

> 如果你使用的是 Cloudflare Pages Git 集成，只需推送到 GitHub / GitLab，Pages 会自动安装依赖并构建。

---

## 3. 初始化 Cloudflare D1 数据库

1. **创建 D1 实例**
   ```bash
   wrangler d1 create freetc-db
   ```
   记下输出中的数据库名称，例如 `freetc-db`。

2. **导入数据表结构**（仓库已提供 `freetc.sql`）
   ```bash
   wrangler d1 execute freetc-db --file=./freetc.sql
   ```
   表结构涵盖：
   - `imginfo`：上传文件主表（含 tags）
   - `tgimglog`：Telegram 访问日志
   - `taglist`：自定义标签
   - `upload_logs` / `upload_ip_blocklist`：上传监控与 IP 风控
   - `upload_quota`：配额计数
   - `tg_file_meta`：Telegram 消息元数据
   - `app_config` / `quota_config`：布尔配置与配额配置

3. **在 Cloudflare Pages/Workers 绑定 D1**
   - 绑定名称需为 `IMG`（与代码保持一致）。
   - Pages 控制台 → Functions → D1 Databases → Add binding → 选择刚创建的数据库。

---

## 4. 配置 Cloudflare R2

1. 在 Cloudflare 控制台创建 R2 Bucket，例如 `freetc-bucket`。
2. 为 Pages 项目添加 R2 Binding：名称必须为 `IMGRS`。
3. 根据需要设置自定义域名或开启公有读（默认通过 `/api/rfile/[name]` 代理访问）。

---

## 5. Telegram 上传（可选）

若要启用 Telegram Channel 上传：

1. 创建一个 Bot，并将其加入你的频道，赋予发布权限。
2. 获取 Bot Token 与频道 Chat ID。
3. 在环境变量中设置 `TG_BOT_TOKEN` 与 `TG_CHAT_ID`。
4. 当后台执行批量删除时，系统会使用 `tg_file_meta` 表记录的 `message_id` 删除对应消息。

---

## 6. 必需 / 可选环境变量

将变量配置在 Cloudflare Pages 项目设置（Build > Environment variables）以及本地 `.env.local` 中。

| 变量 | 是否必填 | 说明 |
| ---- | -------- | ---- |
| `IMG` | ✅ | D1 绑定名称（Cloudflare 自动注入） |
| `IMGRS` | ✅ | R2 绑定名称（Cloudflare 自动注入） |
| `BASIC_USER` / `BASIC_PASS` | ✅ | 管理员登录账号/密码（NextAuth） |
| `REGULAR_USER` / `REGULAR_PASS` | ✅ | 受限普通用户账号/密码（上传配额 15 次/天） |
| `SECRET` | ✅ | NextAuth/加密密钥，建议使用 `openssl rand -base64 32` 生成 |
| `ENABLE_AUTH_API` | ⚙️ | `true/false`，控制是否强制登录后才能使用上传 API |
| `TG_BOT_TOKEN` / `TG_CHAT_ID` | ⚙️ | Telegram Bot Token 与频道 ID，启用 TG 上传/删除功能必填 |
| `PROXYALLIMG` | ⚙️ | `true` 时 `/api/file/*` 会代理 Telegraph，并缓存到本地 R2 |
| `CUSTOM_DOMAIN` | ⚙️ | 自定义对外访问域名（在部分 API 返回中使用） |
| `ModerateContentApiKey` | ⚙️ | [ModerateContent](https://moderatecontent.com/) API Key，用于内容检测 |
| `RATINGAPI` | ⚙️ | 自建 NSFW API（返回含 `className`/`probability` 的 JSON）；填写后优先于 ModerateContent |
| `TG_UPLOAD_LIMIT` 等 | ⚙️ | 若需扩展其他自定义变量，可参考 `src` 目录中的调用方式 |

> Cloudflare Pages 中的绑定（IMG/IMGRS）不需要写在 `.env` 文件。其余变量建议同时在 `.env.local`（本地）与 Pages 控制台保持一致。

示例 `.env.local`：

```ini
BASIC_USER=admin
BASIC_PASS=super-secret
REGULAR_USER=user
REGULAR_PASS=user123
SECRET=00Fv/YUm0enwy04IgP4KoNOWLODe2iJ1tvBzr+4kEZ8=
ENABLE_AUTH_API=true
TG_BOT_TOKEN=123456:ABC-DEF
TG_CHAT_ID=-1001234567890
RATINGAPI=https://nsfwapi.example.com/api/nsfw/classify
```

---

## 7. 本地开发与调试

1. 安装依赖后，执行：
   ```bash
   npm run dev
   ```
   默认在 `http://localhost:3000` 运行。

2. 需要 D1/R2 本地绑定时，可在 `wrangler.toml` 中添加：
   ```toml
   [[d1_databases]]
   binding = "IMG"
   database_name = "freetc-db"
   database_id = "<id-from-cloudflare>"

   [[r2_buckets]]
   binding = "IMGRS"
   bucket_name = "freetc-bucket"
   ```
   然后使用 `npx wrangler pages dev ./out` 或 `wrangler dev` 进行联调。

3. 常用脚本
   | 命令 | 说明 |
   | ---- | ---- |
   | `npm run dev` | 本地开发，带 HMR |
   | `npm run lint` | ESLint 校验 |
   | `npm run build` | 生产构建（Cloudflare Pages 构建同此） |

---

## 8. 部署到 Cloudflare Pages

1. **新建项目**：Cloudflare Pages 控制台 → Create project → 选择 Git 仓库。
2. **Build 设置**：
   - Framework preset：`Next.js`
   - Build command：`npm run build`
   - Build output：`.vercel/output/static`（由 Pages 自动填入）
3. **Functions 设置**：开启 “Use the Pages Functions” 选项。
4. **绑定资源**：
   - Functions → D1 Databases：绑定 `IMG`
   - Functions → R2 Buckets：绑定 `IMGRS`
5. **环境变量**：在 “Environment variables” 中填写第 6 节列出的变量。
6. **触发部署**：保存后 Pages 会自动构建。构建通过后即可访问站点。

> 若后续需要更新数据库结构，可修改 `freetc.sql` 并再次执行 `wrangler d1 execute <db> --file freetc.sql`。

---

## 9. 功能校验清单

| 功能 | 检查步骤 |
| ---- | -------- |
| 首页上传 | 上传图片/视频/任意文件，确认生成唯一文件名并展示链接 |
| Telegram 上传 | 切换上传接口到 `TG Channel`，上传后在频道与后台同步可见 |
| 标签管理 | 后台顶部标签筛选、添加自定义标签、删除未被使用的标签 |
| 内容检测 | 在后台切换“内容安全检测”，上传 NSFW 图片时应被拦截（启用 `RATINGAPI`/`ModerateContentApiKey` 后） |
| 上传配额 | 匿名访问者仅能上传 1 次；普通用户每日 15 次；管理员无限制 |
| 上传监控面板 | 后台按钮进入 `/admin/logs`，查看 14 日趋势图、风险 IP、封禁/解封 |
| 批量删除 | 后台素材列表勾选多条记录后批量删除，确认 R2/TG/D1 均同步删除 |

---

## 10. 维护与排障

- **数据库备份**：
  ```bash
  wrangler d1 export freetc-db --output backup-$(date +%Y%m%d).sql
  ```
- **更新配置**：使用 `wrangler d1 execute freetc-db --command="UPDATE app_config SET value='1' WHERE key='moderation_enabled';"`
- **清理封禁**：
  ```bash
  wrangler d1 execute freetc-db --command="DELETE FROM upload_ip_blocklist WHERE ip='1.2.3.4';"
  ```
- **R2 文件清理**：后台已集成删除逻辑，若需手动删除可使用 `r2` CLI 或控制台。
- **内容检测调试**：检查 Cloudflare 环境变量 `RATINGAPI` 是否可从 Workers 访问（需公网可达）。

---

## 11. 常见问答

1. **为什么上传的文件名会自动带一串后缀？**
   > 为避免重复文件名导致批量删除误删，系统会在原始文件名后追加时间戳 + 随机段落。

2. **如何限制某一 IP？**
   > 在监控面板 `/admin/logs` 中添加封禁规则；也可以直接写入 `upload_ip_blocklist`。

3. **如何关闭内容检测？**
   > 管理后台首页的“内容安全检测”开关仅管理员可见，也可以将 `app_config` 表中的 `moderation_enabled` 设为 `0`。

4. **如何增加普通用户的每日配额？**
   > 更新 `quota_config` 表中的 `user_limit` 值，或通过 `/api/admin/quota` API 页面调整。

---

## 12. 目录引用

- `src/app/page.js`：首页上传与主题组件
- `src/app/admin/page.js`：素材管理后台
- `src/app/admin/logs/page.js`：上传监控面板
- `src/app/api/enableauthapi/r2/route.js`：R2 上传主入口
- `src/lib/uploadLogs.js`：上传日志/风控工具函数
- `freetc.sql`：数据库 schema

> 若需要更多配置示例，请查看 `src/app/api` 目录中的各类上传适配器（tgchannel、58img、tencent 等）。

---

部署完成后，建议：
1. 访问主页上传一张测试图，确认 R2/D1 正常写入。
2. 登录后台（`/admin`）检查标签、批量删除、日志面板。
3. 在 Cloudflare Pages 中绑定自定义域名并开启 HTTPS。

祝部署顺利！
