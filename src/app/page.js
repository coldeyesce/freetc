"use client";
import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { faImages, faTrashAlt, faUpload, faSearchPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ToastContainer } from "react-toastify";
import { toast } from "react-toastify";
import Footer from "@/components/Footer";
import Link from "next/link";
import LoadingOverlay from "@/components/LoadingOverlay";
import "react-toastify/dist/ReactToastify.css";

/* ----------------------------------------------------------------------------
 *  page.js — 视觉样式与结构优化（新增深/浅色主题切换，零功能变更）
 *  - 保留：所有接口、状态名、上传/粘贴/拖拽/复制逻辑、Tab 与 Footer 行为
 *  - 新增：useTheme() 主题切换（localStorage 记忆，默认跟随系统）
 *  - 优化：更精致的暗色/亮色主题、统一圆角与描边、响应式排版
 * ---------------------------------------------------------------------------- */

// 小工具：安全拼接 className
function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

/* ------------------------------ Theme (dark/light) ------------------------------ */
function useTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (saved) setIsDark(saved === "dark");
    else if (typeof window !== "undefined" && window.matchMedia) {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);
  const toggle = () => {
    setIsDark((d) => {
      const next = !d;
      if (typeof window !== "undefined") localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  const C = isDark
    ? {
        body: "bg-neutral-950 text-neutral-100",
        header: "border-neutral-900/70 bg-neutral-950/75",
        panel: "bg-neutral-900/40 hover:bg-neutral-900/55 border-neutral-800",
        card: "ring-neutral-800 bg-neutral-900/70",
        soft: "bg-neutral-900/60 border-neutral-800",
        textMuted: "text-neutral-400",
        border: "border-neutral-800",
        accentBar: "bg-neutral-800/60",
        toastTheme: "dark",
      }
    : {
        body: "bg-neutral-50 text-neutral-900",
        header: "border-neutral-200/90 bg-white/80",
        panel: "bg-white/80 hover:bg-white border-neutral-200",
        card: "ring-neutral-200 bg-white/90",
        soft: "bg-white border-neutral-200",
        textMuted: "text-neutral-600",
        border: "border-neutral-200",
        accentBar: "bg-neutral-200/60",
        toastTheme: "light",
      };

  return { isDark, toggle, C };
}

// 统一的操作按钮（图标圆钮）
function IconRoundBtn({ onClick, title, icon, color = "neutral", disabled }) {
  const palette = {
    neutral: "bg-neutral-800/90 hover:bg-neutral-700 text-neutral-200 border border-neutral-700",
    danger: "bg-rose-600 hover:bg-rose-500 text-white shadow",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow",
    lightNeutral: "bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200",
  };
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "rounded-full w-8 h-8 flex items-center justify-center cursor-pointer mx-2 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
        disabled && "pointer-events-none opacity-60",
        palette[color] || palette.neutral
      )}
    >
      <FontAwesomeIcon icon={icon} className="w-3.5 h-3.5" />
    </button>
  );
}

// 统一的标签切换按钮
function TabBtn({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "px-4 py-2 rounded-xl text-sm transition border",
        active
          ? "bg-indigo-600 text-white shadow border-transparent"
          : "bg-neutral-900/60 text-neutral-200 border-neutral-800 hover:bg-neutral-800"
      )}
    >
      {children}
    </button>
  );
}

// 顶栏登录/登出/管理按钮
const LoginButton = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="px-4 py-2 mx-2 w-28 sm:w-28 md:w-20 lg:w-16 xl:w-16 2xl:w-20 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow hover:opacity-90 transition"
  >
    {children}
  </button>
);

export default function Home() {
  // ---------- 主题 ----------
  const { isDark, toggle, C } = useTheme();

  // ---------- 原有状态：保持名称与逻辑不变 ----------
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedFilesNum, setUploadedFilesNum] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState("preview");
  const [uploading, setUploading] = useState(false);
  const [IP, setIP] = useState("");
  const [Total, setTotal] = useState("?");
  const [selectedOption, setSelectedOption] = useState("r2");
  const [isAuthapi, setisAuthapi] = useState(false);
  const [Loginuser, setLoginuser] = useState("");
  const [boxType, setBoxtype] = useState("img");
  // 修复：原代码在 handleClear 里使用 setUploadStatus，但未定义
  const [uploadStatus, setUploadStatus] = useState("");

  const parentRef = useRef(null);

  // ---------- 常量/请求头 ----------
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
  };

  // ---------- 初始化：IP、统计、鉴权 ----------
  useEffect(() => {
    ip();
    getTotal();
    isAuth();
  }, []);

  const ip = async () => {
    try {
      const res = await fetch(`/api/ip`);
      if (!res.ok) return;
      const data = await res.json();
      setIP(data.ip);
    } catch (error) {
      console.error("请求出错:", error);
    }
  };

  const isAuth = async () => {
    try {
      const res = await fetch(`/api/enableauthapi/isauth`);
      if (res.ok) {
        const data = await res.json();
        setisAuthapi(true);
        setLoginuser(data.role);
      } else {
        setisAuthapi(false);
        setSelectedOption("58img");
      }
    } catch (error) {
      console.error("请求出错:", error);
    }
  };

  const getTotal = async () => {
    try {
      const res = await fetch(`/api/total`);
      if (!res.ok) return;
      const data = await res.json();
      setTotal(data.total);
    } catch (error) {
      console.error("请求出错:", error);
    }
  };

  // ---------- 选择/拖拽/粘贴 ----------
  const handleFileChange = (event) => {
    const newFiles = event.target.files;
    const filtered = Array.from(newFiles).filter(
      (file) => !selectedFiles.find((sel) => sel.name === file.name)
    );
    const unique = filtered.filter(
      (file) => !uploadedImages.find((u) => u.name === file.name)
    );
    setSelectedFiles([...selectedFiles, ...unique]);
  };

  const handleClear = () => {
    setSelectedFiles([]);
    setUploadStatus("");
  };

  const handlePaste = (event) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file" && it.type.includes("image")) {
        const file = it.getAsFile();
        setSelectedFiles((prev) => [...prev, file]);
        break; // 只处理第一个文件
      }
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const filtered = Array.from(files).filter(
        (file) => !selectedFiles.find((sel) => sel.name === file.name)
      );
      setSelectedFiles([...selectedFiles, ...filtered]);
    }
  };

  const handleDragOver = (event) => event.preventDefault();

  // ---------- 预览/放大 ----------
  const calculateMinHeight = () => {
    const rows = Math.ceil(selectedFiles.length / 4);
    return `${rows * 100}px`;
  };

  const handleImageClick = (index) => {
    const f = selectedFiles[index];
    if (!f) return;
    if (f.type.startsWith("image/")) setBoxtype("img");
    else if (f.type.startsWith("video/")) setBoxtype("video");
    else setBoxtype("other");
    setSelectedImage(URL.createObjectURL(f));
  };

  const handleCloseImage = () => setSelectedImage(null);

  const handleRemoveImage = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ---------- 复制 ----------
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`链接复制成功`);
    } catch (err) {
      toast.error("链接复制失败");
    }
  };

  const handleCopyCode = async () => {
    const codeEls = parentRef.current?.querySelectorAll("code");
    const values = Array.from(codeEls || []).map((c) => c.textContent);
    try {
      await navigator.clipboard.writeText(values.join("\n"));
      toast.success(`链接复制成功`);
    } catch (error) {
      toast.error(`链接复制失败\n${error}`);
    }
  };

  // ---------- 上传 ----------
  const getTotalSizeInMB = (files) => {
    const bytes = Array.from(files).reduce((acc, f) => acc + f.size, 0);
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  const handleUpload = async (file = null) => {
    setUploading(true);
    const filesToUpload = file ? [file] : selectedFiles;
    if (filesToUpload.length === 0) {
      toast.error("请选择要上传的文件");
      setUploading(false);
      return;
    }

    const formFieldName = selectedOption === "tencent" ? "media" : "file";
    let successCount = 0;

    try {
      for (const f of filesToUpload) {
        const formData = new FormData();
        formData.append(formFieldName, f);
        try {
          const targetUrl =
            selectedOption === "tgchannel" || selectedOption === "r2"
              ? `/api/enableauthapi/${selectedOption}`
              : `/api/${selectedOption}`;

          const response = await fetch(targetUrl, {
            method: "POST",
            body: formData,
            headers,
          });

          if (response.ok) {
            const result = await response.json();
            f.url = result.url; // 保留原逻辑：把 url 写回 file 对象
            setUploadedImages((prev) => [...prev, f]);
            setSelectedFiles((prev) => prev.filter((x) => x !== f));
            successCount++;
          } else {
            let errorMsg;
            try {
              const errorData = await response.json();
              errorMsg = errorData.message || `上传 ${f.name} 图片时出错`;
            } catch {
              errorMsg = `上传 ${f.name} 图片时发生未知错误`;
            }
            switch (response.status) {
              case 400:
                toast.error(`请求无效: ${errorMsg}`);
                break;
              case 403:
                toast.error(`无权限访问资源: ${errorMsg}`);
                break;
              case 404:
                toast.error(`资源未找到: ${errorMsg}`);
                break;
              case 500:
                toast.error(`服务器错误: ${errorMsg}`);
                break;
              case 401:
                toast.error(`未授权: ${errorMsg}`);
                break;
              default:
                toast.error(`上传 ${f.name} 图片时出错: ${errorMsg}`);
            }
          }
        } catch (error) {
          toast.error(`上传 ${f.name} 图片时出错`);
        }
      }

      setUploadedFilesNum((n) => n + successCount);
      toast.success(`已成功上传 ${successCount} 张图片`);
    } catch (error) {
      console.error("上传过程中出现错误:", error);
      toast.error("上传错误");
    } finally {
      setUploading(false);
    }
  };

  // ---------- 小渲染块 ----------
  const renderFile = (data, index) => {
    const fileUrl = data.url;
    if (data.type.startsWith("image/")) {
      return (
        <img
          key={`image-${index}`}
          src={data.url}
          alt={`Uploaded ${index}`}
          className="object-cover w-40 h-44 m-2 rounded-2xl shadow-sm border border-neutral-800"
          onClick={() => handlerenderImageClick(fileUrl, "img")}
        />
      );
    }
    if (data.type.startsWith("video/")) {
      return (
        <video
          key={`video-${index}`}
          src={data.url}
          className="object-cover w-40 h-44 m-2 rounded-2xl shadow-sm border border-neutral-800"
          controls
          onClick={() => handlerenderImageClick(fileUrl, "video")}
        />
      );
    }
    // 其他文件，按图片处理占位
    return (
      <img
        key={`image-${index}`}
        src={data.url}
        alt={`Uploaded ${index}`}
        className="object-cover w-40 h-44 m-2 rounded-2xl shadow-sm border border-neutral-800"
        onClick={() => handlerenderImageClick(fileUrl, "other")}
      />
    );
  };

  const handlerenderImageClick = (imageUrl, type) => {
    setBoxtype(type);
    setSelectedImage(imageUrl);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "preview":
        return (
          <div className="flex flex-col">
            {uploadedImages.map((data, index) => (
              <div
                key={index}
                className={cx(
                  "m-2 rounded-2xl ring-1 backdrop-blur-sm flex flex-row overflow-hidden",
                  C.soft,
                  C.border
                )}
              >
                {renderFile(data, index)}
                <div className="flex flex-col justify-center w-full max-w-[720px] p-4">
                  {[
                    { text: data.url, onClick: () => handleCopy(data.url) },
                    {
                      text: `![${data.name}](${data.url})`,
                      onClick: () => handleCopy(`![${data.name}](${data.url})`),
                    },
                    {
                      text: `<a href="${data.url}" target="_blank"><img src="${data.url}"></a>`,
                      onClick: () =>
                        handleCopy(
                          `<a href="${data.url}" target="_blank"><img src="${data.url}"></a>`
                        ),
                    },
                    {
                      text: `[img]${data.url}[/img]`,
                      onClick: () => handleCopy(`[img]${data.url}[/img]`),
                    },
                  ].map((item, i) => (
                    <input
                      key={`input-${i}`}
                      readOnly
                      value={item.text}
                      onClick={item.onClick}
                      className="px-3 my-1 py-2 border border-neutral-800/80 rounded-lg bg-neutral-900 text-sm text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/60 placeholder-neutral-500"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case "htmlLinks":
        return (
          <div ref={parentRef} className={cx("p-4 rounded-2xl", C.soft, C.border)} onClick={handleCopyCode}>
            {uploadedImages.map((data, index) => (
              <div key={index} className="mb-2">
                <code className="break-all text-sm">{`<img src="${data.url}" alt="${data.name}" />`}</code>
              </div>
            ))}
          </div>
        );

      case "markdownLinks":
        return (
          <div ref={parentRef} className={cx("p-4 rounded-2xl", C.soft, C.border)} onClick={handleCopyCode}>
            {uploadedImages.map((data, index) => (
              <div key={index} className="mb-2">
                <code className="break-all text-sm">{`![${data.name}](${data.url})`}</code>
              </div>
            ))}
          </div>
        );

      case "bbcodeLinks":
        return (
          <div ref={parentRef} className={cx("p-4 rounded-2xl", C.soft, C.border)} onClick={handleCopyCode}>
            {uploadedImages.map((data, index) => (
              <div key={index} className="mb-2">
                <code className="break-all text-sm">{`[img]${data.url}[/img]`}</code>
              </div>
            ))}
          </div>
        );

      case "viewLinks":
        return (
          <div ref={parentRef} className={cx("p-4 rounded-2xl", C.soft, C.border)} onClick={handleCopyCode}>
            {uploadedImages.map((data, index) => (
              <div key={index} className="mb-2">
                <code className="break-all text-sm">{`${data.url}`}</code>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  // 顶栏右侧按钮逻辑（保持不变）
  const handleSelectChange = (e) => setSelectedOption(e.target.value);
  const handleSignOut = () => signOut({ callbackUrl: "/" });

  const renderButton = () => {
    if (!isAuthapi) {
      return (
        <Link href="/login">
          <LoginButton>登录</LoginButton>
        </Link>
      );
    }
    switch (Loginuser) {
      case "user":
        return <LoginButton onClick={handleSignOut}>登出</LoginButton>;
      case "admin":
        return (
          <Link href="/admin">
            <LoginButton>管理</LoginButton>
          </Link>
        );
      default:
        return (
          <Link href="/login">
            <LoginButton>登录</LoginButton>
          </Link>
        );
    }
  };

  return (
    <main
      className={`relative overflow-auto h-full w-full min-h-screen flex flex-col items-center justify-between ${C.body}`}
      style={{
        backgroundImage: isDark
          ? "radial-gradient(1000px 600px at 10% -10%, rgba(99,102,241,0.15), transparent), radial-gradient(800px 500px at 90% -10%, rgba(34,211,238,0.10), transparent)"
          : "radial-gradient(1000px 600px at 10% -10%, rgba(99,102,241,0.08), transparent), radial-gradient(800px 500px at 90% -10%, rgba(14,165,233,0.08), transparent)",
      }}
    >
      {/* 顶栏 */}
      <header className={`fixed top-0 left-0 w-full h-[60px] border-b ${C.header} backdrop-blur supports-[backdrop-filter]:bg-opacity-60 z-50 shadow-[0_2px_16px_rgba(0,0,0,0.12)]`}>
        <div className="mx-auto max-w-6xl h-full flex items-center justify-between px-4">
          <nav className="flex items-center gap-3 text-sm">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 shadow-inner" />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold tracking-wide">图床</span>
              <span className="text-[11px] opacity-80">Free & fast image host</span>
            </div>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className={cx(
                "rounded-xl px-3 h-9 text-sm border transition",
                isDark
                  ? "border-transparent bg-neutral-900/20 hover:bg-neutral-900/30 text-neutral-200 hover:border-indigo-400/50"
                  : "border-neutral-200/70 bg-white/40 hover:bg-white/70 text-neutral-700"
              )}
              title={isDark ? "切换到浅色" : "切换到深色"}
            >
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
            {renderButton()}
          </div>
        </div>
      </header>

      {/* 内容区 */}
      <div className="mt-[84px] w-[92%] sm:w-[92%] md:w-[92%] lg:w-[92%] xl:w-3/5 2xl:w-2/3 max-w-6xl">
        {/* 标题 + 接口选择 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col">
            <div className="text-xl font-semibold">图片或视频上传</div>
            <div className={cx("mt-1 text-sm", C.textMuted)}>
              上传文件最大 5 MB；本站已托管 <span className="text-cyan-500 font-medium">{Total}</span> 张图片；你的 IP：
              <span className="text-cyan-500 font-medium">{IP}</span>
            </div>
          </div>
          <div className="flex flex-col md:w-auto lg:flex-row xl:flex-row 2xl:flex-row items-center gap-2">
            <span className="text-xs sm:text-sm opacity-80">上传接口：</span>
      <select
        value={selectedOption}
        onChange={handleSelectChange}
        className={
            `text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ` +
            (isDark
            ? `bg-neutral-900/80 border border-neutral-800 text-neutral-100`
            : `bg-white border border-neutral-200 text-neutral-900 shadow-sm`)
            }
            >
  <option value="tg">TG(会失效)</option>
  <option value="tgchannel">TG_Channel</option>
  <option value="r2">R2</option>
  <option value="58img">58img</option>
</select>
          </div>
        </div>

        {/* 拖拽/粘贴区与缩略卡片 */}
        <div
          className={cx(
            "mt-4 border rounded-3xl relative transition shadow-[0_0_0_1px_rgba(0,0,0,0.02)_inset,0_10px_40px_-20px_rgba(0,0,0,0.3)]",
            C.panel,
            C.border
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onPaste={handlePaste}
          style={{ minHeight: calculateMinHeight() }}
        >
          <div className="flex flex-wrap gap-3 min-h-[240px] p-4">
            <LoadingOverlay loading={uploading} />
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className={cx(
                  "relative rounded-2xl w-48 h-52 ring-1 mx-2 my-2 flex flex-col items-center shadow-sm transition hover:shadow",
                  C.card
                )}
              >
                <div className="relative w-40 h-40 overflow-hidden rounded-xl mt-3" onClick={() => handleImageClick(index)}>
                  {file.type.startsWith("image/") && (
                    <Image src={URL.createObjectURL(file)} alt={`Preview ${file.name}`} fill className="object-cover" />
                  )}
                  {file.type.startsWith("video/") && (
                    <video src={URL.createObjectURL(file)} controls className="w-full h-full rounded-xl" />
                  )}
                  {!file.type.startsWith("image/") && !file.type.startsWith("video/") && (
                    <div className="flex items-center justify-center w-full h-full bg-neutral-800 text-neutral-300 text-xs px-2 text-center">
                      <p className="truncate">{file.name}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-row items-center justify-center w-full mt-3">
                  <IconRoundBtn title="预览" icon={faSearchPlus} onClick={() => handleImageClick(index)} />
                  <IconRoundBtn title="删除" icon={faTrashAlt} color="danger" onClick={() => handleRemoveImage(index)} />
                  <IconRoundBtn title="上传" icon={faUpload} color="success" onClick={() => handleUpload(file)} disabled={uploading} />
                </div>
              </div>
            ))}

            {selectedFiles.length === 0 && (
              <div className="absolute -z-10 inset-0 flex items-center justify-center">
                <div className="opacity-70 text-sm">拖拽文件到这里或将屏幕截图复制并粘贴到此处上传</div>
              </div>
            )}
          </div>
        </div>

        {/* 底部操作条 */}
        <div className={cx("w-full rounded-2xl overflow-hidden mt-4 grid grid-cols-8 gap-[1px]", C.accentBar)}>
          <div className="md:col-span-1 col-span-8">
            <label
              htmlFor="file-upload"
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-cyan-500 cursor-pointer flex items-center justify-center text-white text-sm font-medium"
            >
              <FontAwesomeIcon icon={faImages} className="mr-2 w-5 h-5" />
              选择图片
            </label>
            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} multiple />
          </div>
          <div className="md:col-span-5 col-span-8">
            <div className="w-full h-11 leading-[44px] px-4 text-center md:text-left text-sm opacity-80">
              已选择 {selectedFiles.length} 张，共 {getTotalSizeInMB(selectedFiles)} M
            </div>
          </div>
          <div className="md:col-span-1 col-span-3">
            <div
              className="w-full h-11 flex items-center justify-center text-white bg-rose-600 hover:bg-rose-500 transition cursor-pointer text-sm"
              onClick={handleClear}
            >
              <FontAwesomeIcon icon={faTrashAlt} className="mr-2 w-5 h-5" />
              清除
            </div>
          </div>
          <div className="md:col-span-1 col-span-5">
            <div
              className={cx(
                "w-full h-11 flex items-center justify-center text-white text-sm transition cursor-pointer",
                uploading ? "pointer-events-none opacity-60 bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-500"
              )}
              onClick={() => handleUpload()}
            >
              <FontAwesomeIcon icon={faUpload} className="mr-2 w-5 h-5" />
              上传
            </div>
          </div>
        </div>

        {/* 复制提示 */}
        <ToastContainer position="top-right" autoClose={2500} theme={C.toastTheme} />

        {/* 结果与链接格式 */}
        <div className="w-full mt-5 min-h-[200px] mb-[72px]">
          {uploadedImages.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 mb-4 border-b border-neutral-800 pb-3">
                <TabBtn active={activeTab === "preview"} onClick={() => setActiveTab("preview")}>
                  Preview
                </TabBtn>
                <TabBtn active={activeTab === "htmlLinks"} onClick={() => setActiveTab("htmlLinks")}>
                  HTML
                </TabBtn>
                <TabBtn active={activeTab === "markdownLinks"} onClick={() => setActiveTab("markdownLinks")}>
                  Markdown
                </TabBtn>
                <TabBtn active={activeTab === "bbcodeLinks"} onClick={() => setActiveTab("bbcodeLinks")}>
                  BBCode
                </TabBtn>
                <TabBtn active={activeTab === "viewLinks"} onClick={() => setActiveTab("viewLinks")}>
                  Links
                </TabBtn>
              </div>
              {renderTabContent()}
            </>
          )}
        </div>
      </div>

      {/* 放大预览 */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={handleCloseImage}>
          <div className="relative flex flex-col items-center justify-between max-w-[90vw]">
            <button
              className="absolute -top-3 -right-3 bg-rose-600 hover:bg-rose-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow"
              onClick={handleCloseImage}
            >
              &times;
            </button>

            {boxType === "img" ? (
              <img
                src={selectedImage}
                alt="Selected"
                width={500}
                height={500}
                className="object-contain w-[90vw] max-w-3xl h-auto rounded-xl shadow border border-neutral-800"
              />
            ) : boxType === "video" ? (
              <video
                src={selectedImage}
                width={500}
                height={500}
                className="object-contain w-[90vw] max-w-3xl h-auto rounded-xl shadow border border-neutral-800"
                controls
              />
            ) : boxType === "other" ? (
              <div className="p-4 bg-white text-black rounded-xl shadow">
                <p>Unsupported file type</p>
              </div>
            ) : (
              <div>未知类型</div>
            )}
          </div>
        </div>
      )}

      {/* 底栏 */}
<div className="fixed inset-x-0 bottom-0 h-[60px] backdrop-blur border-t border-neutral-900 w-full flex z-50 justify-center items-center"
     style={{background: isDark ? "rgba(10,10,10,0.8)" : "rgba(255,255,255,0.8)"}}>
  <Footer />
</div>
    </main>
  );
}
