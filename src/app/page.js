"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * freetc - 优化后的首页/上传页
 * 设计目标：
 * 1) 简洁现代、暗黑友好、移动端优先
 * 2) 支持拖拽 / 点击选择 / 粘贴上传
 * 3) 清晰的上传进度、错误提示、结果卡片（含复制链接/Markdown/HTML）
 * 4) 可选：展示最近上传（需你在 /api/admin/list 返回公共可读的最近项）
 * 5) 零依赖，仅使用 Tailwind
 *
 * 使用：将本文件保存为 src/app/page.js 覆盖即可。
 */

function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function HomePage() {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]); // [{url, name, width, height, size}]
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // 从剪贴板粘贴图片
  useEffect(() => {
    const onPaste = async (e) => {
      const items = e.clipboardData?.items || [];
      const pastedFiles = [];
      for (const it of items) {
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f && f.type.startsWith("image/")) pastedFiles.push(f);
        }
      }
      if (pastedFiles.length) {
        setFiles((prev) => [...prev, ...pastedFiles]);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const handleSelect = useCallback((e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length) setFiles((prev) => [...prev, ...picked]);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer?.files || []);
    if (dropped.length) setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);

  // 上传逻辑（默认走 /api/upload；若你的项目使用 /api/tg，请把 endpoint 改为 "/api/tg"）
  const upload = useCallback(async () => {
    setError("");
    if (!files.length) return;
    setUploading(true);
    setProgress(0);

    // 逐个上传，兼容后端表单接口： form-data: file
    const out = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const fd = new FormData();
        fd.append("file", f, f.name);
        // 如果你的后端支持一次性多文件，改为 append 多个后一次 fetch 即可
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} ${t}`);
        }
        const data = await safeJson(res);
        const url = data?.url || data?.src || data?.link || data?.data?.url;
        if (!url) throw new Error("后端未返回图片 URL");
        out.push({ url, name: f.name, size: f.size });
        setProgress(Math.round(((i + 1) / files.length) * 100));
      } catch (err) {
        setError(String(err?.message || err));
        break;
      }
    }

    setResults((prev) => [...out, ...prev]);
    setUploading(false);
    setFiles([]);
  }, [files]);

  const recentTitle = useMemo(() => (results.length ? "上传结果" : ""), [results.length]);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-4 pt-6 pb-2">
        <Hero />

        <div
          className={classNames(
            "mt-6 rounded-2xl border border-neutral-800 p-6 transition-all",
            dragOver ? "ring-2 ring-indigo-500" : ""
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <h3 className="text-xl font-semibold">图片或视频上传</h3>
              <p className="mt-1 text-sm text-neutral-400">支持拖拽 / 点击选择 / 直接粘贴</p>
            </div>

            <button
              onClick={() => inputRef.current?.click()}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium hover:bg-neutral-800 border border-neutral-700"
            >
              选择文件
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleSelect}
            />

            {!!files.length && (
              <SelectedList files={files} onClear={() => setFiles([])} />
            )}

            <div className="flex w-full items-center gap-3">
              <button
                onClick={upload}
                disabled={!files.length || uploading}
                className={classNames(
                  "w-full rounded-xl px-4 py-2 text-sm font-semibold",
                  files.length && !uploading
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-neutral-800 text-neutral-400 cursor-not-allowed"
                )}
              >
                {uploading ? `上传中… ${progress}%` : "开始上传"}
              </button>
            </div>
            {error && (
              <p className="w-full rounded-xl border border-red-600/40 bg-red-600/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        {recentTitle && (
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-neutral-200">{recentTitle}</h3>
            <div className="text-xs text-neutral-500">点击卡片复制链接</div>
          </div>
        )}
        <ResultGrid items={results} />
      </section>

      <SiteFooter />
    </main>
  );
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    const t = await res.text();
    throw new Error(t || "返回体不是 JSON");
  }
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-900/70 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-gradient-to-tr from-indigo-500 to-cyan-400" />
          <span className="text-sm font-semibold tracking-wide">freetc 图床</span>
        </div>
        <nav className="flex items-center gap-2 text-sm text-neutral-400">
          <a href="/admin" className="rounded-lg px-2 py-1 hover:text-neutral-200 hover:bg-neutral-900">登录</a>
          <a href="https://github.com/coldeyesce/freetc" target="_blank" className="rounded-lg px-2 py-1 hover:text-neutral-200 hover:bg-neutral-900">GitHub</a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <div className="rounded-2xl bg-[radial-gradient(1200px_400px_at_50%_-20%,rgba(79,70,229,0.25),rgba(0,0,0,0))] p-6 text-center">
    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">轻便 · 稳定 · 免费</h1>
    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-neutral-400">
      使用 Cloudflare Pages 托管，支持粘贴、拖拽与多文件上传。上传完成后，一键复制直链 / Markdown / HTML。
    </p>
  </div>
  );
}

function SelectedList({ files, onClear }) {
  return (
    <div className="w-full rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs text-neutral-400">已选择 {files.length} 个文件</div>
        <button onClick={onClear} className="text-xs text-neutral-400 hover:text-neutral-200">清空</button>
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {files.map((f, idx) => (
          <li key={idx} className="flex items-center justify-between rounded-lg bg-neutral-950/60 p-2">
            <div className="min-w-0 text-xs">
              <p className="truncate text-neutral-200">{f.name}</p>
              <p className="mt-0.5 text-[11px] text-neutral-500">{fmtBytes(f.size)} · {f.type || "unknown"}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultGrid({ items }) {
  if (!items?.length) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it, i) => (
        <ResultCard key={i} {...it} />
      ))}
    </div>
  );
}

function ResultCard({ url, name, size }) {
  const [copied, setCopied] = useState("");
  const md = `![${name || "img"}](${url})`;
  const html = `<img src="${url}" alt="${name || "img"}"/>`;

  const doCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1200);
    } catch {}
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-900">
        {/* 仅图片可预览，视频以占位替代 */}
        {String(url).match(/\.(mp4|webm|mov|m4v)(\?.*)?$/i) ? (
          <div className="flex h-full items-center justify-center text-xs text-neutral-500">视频文件</div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={name || "preview"} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="truncate text-xs text-neutral-300" title={url}>{url}</div>
        <div className="flex flex-wrap gap-2">
          <CopyBtn onClick={() => doCopy(url, "直链")} active={copied === "直链"}>复制直链</CopyBtn>
          <CopyBtn onClick={() => doCopy(md, "MD")} active={copied === "MD"}>复制 Markdown</CopyBtn>
          <CopyBtn onClick={() => doCopy(html, "HTML")} active={copied === "HTML"}>复制 HTML</CopyBtn>
        </div>
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <span>{name || "文件"}</span>
          {typeof size === "number" && <span>{fmtBytes(size)}</span>}
        </div>
      </div>
    </div>
  );
}

function CopyBtn({ children, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "rounded-lg border px-2 py-1 text-xs",
        active
          ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-200"
          : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
      )}
    >
      {children}
    </button>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-neutral-900/70 py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-xs text-neutral-500">
        <p>© {new Date().getFullYear()} freetc · Powered by Cloudflare Pages</p>
      </div>
    </footer>
  );
}

function fmtBytes(bytes) {
  if (!+bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
