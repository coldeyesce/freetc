项目概述

freetc 是一个基于 Next.js 和 Cloudflare Pages 构建的图床/文件托管应用。它模仿了 Telegraph 的图片存储，并结合了 Cloudflare 的 D1 数据库与 R2 对象存储，为用户提供免费且几乎无限的图片托管服务。项目特点包括：

无限存储 – 用户可以上传任意数量的图片，不受限制
github.com
。

免费托管 – 网站部署在 Cloudflare Pages 上，利用 Cloudflare 的免费额度即可运行，无需自建服务器
github.com
。

自定义域名与默认域名 – 默认提供 *.pages.dev 二级域名，也支持绑定自定义域名
github.com
。

图片审查可选 – 支持接入 ModerateContentApiKey 或自建 RATINGAPI，上传时自动对图片进行审核，违规内容可被屏蔽
github.com
。

后台管理与日志 – 提供后台界面，可查看文件列表、访问日志、热门 referer/IP 等信息，并支持在线预览、白名单/黑名单、删除文件、编辑标签等管理功能
github.com
。

项目示例演示在 img.131213.xyz 和 telegraph-image-e49.pages.dev，README 中提供了测试管理员与普通用户账号用于体验
github.com
。

部署与环境配置
部署流程

在 GitHub 上点击 Use this template 创建代码仓库，然后在 Cloudflare Pages 中通过 Connect to Git 构建项目
github.com
。

在 Cloudflare Pages 中选择 “Framework preset”为 Next.js，保存并部署
github.com
。

根据文档 docs/manage.md 创建 D1 数据库与 R2 存储桶，并在 Pages 后台绑定变量 IMG（D1 数据库）与 IMGRS（R2 存储）
github.com
。

按需设置兼容性标志 nodejs_compat，然后重新部署使配置生效
github.com
。

如果需要后台登录功能或启用访客上传验证，必须在环境变量中配置账户密码及开关，如下表所示。

数据库与存储

项目使用 Cloudflare D1 数据库存储日志和文件信息，并使用 Cloudflare R2 存储实际的文件内容。docs/manage.md 提供了初始化 SQL 脚本，用于创建两张表：

表名	作用	主要字段
tgimglog	记录通过 /file、/cfile 和 /rfile 接口访问的日志	url、referer、ip、time
github.com

imginfo	存储上传文件的地址、来源、IP、审核等级、访问次数、时间等信息	url、referer、ip、rating、total、time
github.com

页面会根据上传文件的类型自动为其分配默认标签（image、video、file），并将自定义标签存储在 tags 列（逗号分隔、两端有逗号）中。在管理端修改标签或删除标签时，后台会更新该字段
github.com
。

环境变量

项目的大部分行为通过环境变量控制，README 和 docs/manage.md 提供了详细说明。下表列出了主要变量及用途：

变量	类型	说明
PROXYALLIMG	boolean	是否反向代理 Telegraph 的图片（默认 false）；如果启用，访问 /api/file/* 时会转发并缓存图片
github.com
。
BASIC_USER / BASIC_PASS	string	后台管理登录账号及密码，用于管理员角色认证
github.com
。
ENABLE_AUTH_API	boolean	是否启用访客验证。当为 true 时，上传接口需要用户登录（普通用户或管理员）
github.com
。
REGULAR_USER / REGULAR_PASS	string	普通用户账号及密码，用于访客上传验证
github.com
。
ModerateContentApiKey	string	来自 moderatecontent.com 的 API key，用于检测图片内容
github.com
。
RATINGAPI	string	可替代 ModerateContent 的自建鉴黄接口，格式为 https://xxx.xxx/rating 
github.com
。当同时配置时优先使用此接口
github.com
。
CUSTOM_DOMAIN	string	自定义加速域名，例如 https://your-custom-domain.com 
github.com
。
TG_BOT_TOKEN / TG_CHAT_ID	string	Telegram Bot token 以及目标群组/频道的 ID；用于将文件上传到 Telegram 频道并通过 /api/cfile 读取
github.com
。TG_CHAT_ID 可以是群组 ID 或公开频道用户名
github.com
。
SECRET	string	NextAuth 用于 JWT 签名的安全密钥；若未设置，auth.js 中有一个默认值
github.com
。强烈建议使用随机字符串替换默认值。
IMG	D1 数据库绑定	在 Cloudflare Pages 后台绑定的 D1 数据库名称，用于读写 imginfo 和 tgimglog。
IMGRS	R2 存储绑定	在 Pages 后台绑定的 R2 存储桶，用于存储文件并通过 /api/rfile 提供访问
github.com
。
认证与访问控制

项目使用 NextAuth 的 CredentialsProvider 实现本地用户名密码登录，支持两种角色：管理员和普通用户。在 src/auth.js 中，授权逻辑会对比登录信息与环境变量中的 BASIC_USER/BASIC_PASS 或 REGULAR_USER/REGULAR_PASS，匹配成功后返回带有角色的用户对象
github.com
。会话采用 JWT 策略，过期时间为 24 小时，密钥来自 process.env.SECRET
github.com
。

middleware.js 对不同路径进行了访问控制：

未登录用户访问 /admin 或 /api/admin/* 会被重定向到 /login 或返回 401 错误
github.com
。

当启用了 ENABLE_AUTH_API 时，未登录用户访问 /api/enableauthapi/* 会被拒绝；否则允许匿名上传
github.com
。

登录的普通用户不能访问后台管理接口；仅管理员可以访问 /admin 和 /api/admin/*
github.com
。

普通用户上传时，只能调用 /api/enableauthapi/* 下的接口；管理员登录后可以访问后台管理页面和所有接口。

前端页面
登录页

src/app/login/page.jsx 渲染登录界面。组件调用 signIn() 方法发起用户名和密码登录，成功后根据用户角色将管理员跳转到 /admin，普通用户跳转到 /。页面同时提供深色/浅色主题切换、密码可见按钮等交互。

上传页（首页）

首页 src/app/page.js 是用户上传文件的主要界面。它包含以下功能：

文件选择与拖放 – 支持通过点击选择、拖拽或粘贴添加图片/视频文件，上传前可以批量预览。

多种上传渠道 – 用户可选择上传到 Telegraph (/api/tg)、Telegram 频道 (/api/enableauthapi/tgchannel)、Cloudflare R2 (/api/enableauthapi/r2) 或 58img (/api/58img)。不同渠道通过 selectedOption 切换。

自定义标签 – 上传时可以填写多个标签，系统自动添加默认类型标签（image/video/file），并在后台保存
github.com
。

图片审查与状态提示 – 如果启用鉴黄 API，上传后的响应包含 rating_index，可在预览列表中标识是否通过审核
github.com
。

预览与复制链接 – 上传完成后会显示文件预览，并提供直接链接、Markdown、HTML 以及 BBCode 格式的代码，支持一键复制。（这些逻辑在前端组件中实现，未在代码段中详述）

主题与语言 – 页面支持黑暗模式和明亮模式切换，并根据本地时间自动调整主题。

访客验证与登录状态 – 页面会调用 /api/enableauthapi/isauth 检查是否开启访客验证并返回当前用户角色
github.com
。如果未登录且已启用访客验证，上传按钮会提示登录。

统计显示 – 调用 /api/ip 获取客户端 IP
github.com
；调用 /api/total 获取站点已上传文件总数
github.com
。

后台管理页

src/app/admin/page.js 是管理员界面，主要功能包括：

分页与搜索 – 通过接口 /api/admin/list 按页获取数据库中的文件记录，可根据 URL 关键字和标签过滤；接口参数包含 page、size、query 和 tag，返回结果包含数据列表、总数等
github.com
。

标签筛选与编辑 – 显示所有可用标签，点击可过滤列表；通过 handleUpdateItemTags 调用 /api/admin/tags 的 PATCH 方法更新某条记录的标签
github.com
。

删除文件 – 调用 /api/admin/delete 删除数据库记录，并同时删除 R2 存储中的对象
github.com
。

屏蔽/解封 – 通过 SwitchButton.jsx 调用 /api/admin/block 将 rating 字段设置为 3（屏蔽）或恢复其它值
github.com
。当 rating 为 3 时，通过文件访问接口获取文件会重定向到 img/blocked.png
github.com
。

批量删除标签 – 调用 /api/admin/tags 的 DELETE 方法删除某个自定义标签；如果该标签正在被使用且未设置 force，接口会返回 requireConfirmation 为 true 以提示需要确认删除
github.com
。

新增标签的问题 – 管理页面允许输入新的标签，但 handleAddTagFilter 仅更新本地状态，随后调用 fetchList 会重新加载服务器标签，导致新标签立即消失
github.com
github.com
。解决方案是将新标签持久化到数据库或在前端合并旧标签避免覆盖。

后端接口
公共访问接口
路径	方法	功能
/api/file/[name]	GET	代理 Telegraph 图片。首先获取真实图片内容并判断 Referer；如果配置了数据库，将访问日志写入 tgimglog 并读取已有的 rating 信息；若 rating 为 3，则重定向至 img/blocked.png，否则返回图片
github.com
。如果未启用代理则直接重定向到 Telegraph
github.com
。
/api/cfile/[name]	GET	从 Telegram 获取文件。根据文件 ID 调用 getFile_path 获取真实文件路径，再从 Telegram 下载。接口会检查缓存、记录访问日志并根据 rating 返回文件或重定向
github.com
。
/api/rfile/[name]	GET	从 Cloudflare R2 读取文件。首先检查 IMGRS 是否配置；若 rating 为 3 且访问来源不是后台或主页，则重定向至阻止图像
github.com
。否则返回对象流，并写入访问日志
github.com
。
/api/ip	GET	返回客户端 IP 地址
github.com
。
/api/total	GET	返回数据库中已上传文件的总数
github.com
。
/api/tags	GET	扫描 imginfo 中的 tags 列并返回去重后的标签列表，同时包含默认标签 image、video、file
github.com
。
上传接口
路径	方法	认证	功能
/api/58img	POST	无需认证	将图片转换为 base64 调用 58 图片接口
，返回 CDN 链接，并在数据库记录 rating=7 的信息
github.com
。
/api/enableauthapi/r2	POST	需要登录（普通用户或管理员）	将文件上传到 R2。根据 MIME 类型或文件后缀确定默认标签（image、video 或 file），并将用户自定义标签规范化保存
github.com
。上传成功后返回文件访问 URL、文件名、标签列表及审核结果
github.com
。
/api/enableauthapi/tgchannel	POST	需要登录	将文件上传到 Telegram 频道。根据文件类型选择适当的 Bot API（发送照片、视频或文档），获得返回的 file_id 并生成 /api/cfile/{file_id} 访问地址
github.com
。随后调用自定义或 ModerateContent API 获取 rating，将信息保存到数据库
github.com
。
/api/enableauthapi/isauth	GET	任意	返回 ENABLE_AUTH_API 的状态和当前登录用户角色，用于前端判断是否允许上传
github.com
。
管理接口
路径	方法	功能
/api/admin/list	POST	分页获取数据库中的文件信息；支持按 URL 关键词搜索和按标签过滤
github.com
。请求体包含 page、size、query 和 tag 字段。
/api/admin/delete	DELETE	删除指定文件记录，并尝试删除 R2 中对应的文件；输入为 { name: url }
github.com
。
/api/admin/tags	PATCH	更新某个文件的标签。接口会根据 URL 判断文件类型，合并用户传入的标签并去重，然后将结果保存到 imginfo.tags
github.com
。
/api/admin/tags	DELETE	删除某个标签。若标签正在使用且 force 未设为 true，接口返回 requireConfirmation: true 和受影响条数；确认后将该标签从所有记录的 tags 字符串中移除
github.com
。
/api/admin/block	PUT	更新文件的 rating 值，实现屏蔽或解除屏蔽。rating 设置为 3 时，相关的访问接口会把该文件重定向到阻止图片
github.com
。
安全与日志

文件访问时，会记录 Referer、IP 地址和访问时间到 tgimglog 表，方便管理员查看访问来源
github.com
。

上传时会使用 ModerateContentApiKey 或 RATINGAPI 请求第三方服务获取 rating_index，结果存入 imginfo 表；取值 3 表示疑似违规会被屏蔽
github.com
。

开启 PROXYALLIMG 后，访问 Telegraph 图片会强制通过 Cloudflare 反向代理，并将 rating 与日志写入数据库
github.com
。

已知问题与改进建议

标签新增未持久化 – 管理页面的“新增标签”仅修改本地状态，执行 fetchList 时又会从服务器获取标签并覆盖，导致新标签立即消失
github.com
github.com
。建议在添加标签时调用后台接口保存，或者在 fetchTags 后与本地状态合并。

鉴黄依赖稳定性 – 若使用自建 RATINGAPI，需保证服务可用且返回的 JSON 中包含 rating_index 字段
github.com
。建议在解析失败时将 rating 设置为 -1 并提示用户。

环境变量错误导致 500 – 很多接口在缺少必要环境变量时会直接返回 500 错误，例如未配置 IMGRS 时 /api/rfile 拒绝请求
github.com
。部署时需确保所有必需的变量均已正确填写。

总结

freetc 为个人和小团队提供了一个无需自建服务器即可运行的免费图床/文件托管方案。它结合了 Cloudflare 的静态托管、数据库和对象存储能力，并通过多种上传渠道（Telegraph、Telegram、R2 和 58img）满足不同场景需要。项目还提供了完善的后台管理界面，支持文件列表、标签管理、访问统计和审核屏蔽。通过合理配置环境变量、数据库和存储，用户可以快速部署并享受免费稳定的图片托管服务。