"use client";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { toast } from "react-toastify";

/**
 * SignIn — 优化&美化版本（不改变原有登录流程）
 *
 * 使用方式：
 *   <SignIn />
 *   // 或自定义：
 *   <SignIn onSubmit={async ({ username, password }) => { ... }} afterPath="/" />
 *
 * 逻辑保持：
 * 1) 如提供 onSubmit，则优先调用你传入的登录方法。
 * 2) 否则先尝试 POST /api/enableauthapi/login （与你项目一致）。
 * 3) 若 2) 不存在/失败，则回退 next-auth 的 credentials：signIn('credentials').
 *
 * 视觉：玻璃拟态登录卡片 + 圆角/投影/聚焦环；随本地主题（localStorage.theme = 'dark'|'light'）切换。
 */

function useThemeMode() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (saved) setIsDark(saved === "dark");
    else if (typeof window !== "undefined" && window.matchMedia) {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);
  return isDark;
}

export default function SignIn({
  onSubmit,           // 可选：自定义登录函数 (params: { username, password }) => Promise<void|boolean>
  onSuccess,          // 可选：登录成功后的回调
  afterPath = "/",   // 登录成功后跳转
  title = "登录",
  subtitle = "进入管理与上传增强功能",
}) {
  const isDark = useThemeMode();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!username || !password) {
      try { toast.error("请输入账号与密码"); } catch {}
      return;
    }
    setLoading(true);
    try {
      // 1) 自定义处理（若提供）
      if (typeof onSubmit === "function") {
        const ok = await onSubmit({ username, password });
        if (ok !== false) {
          try { toast.success("登录成功"); } catch {}
          onSuccess?.();
          if (afterPath) window.location.href = afterPath;
          return;
        }
      }

      // 2) 优先尝试你的接口（与旧逻辑保持一致）
      try {
        const res = await fetch("/api/enableauthapi/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (res.ok) {
          try { toast.success("登录成功"); } catch {}
          onSuccess?.();
          if (afterPath) window.location.href = afterPath;
          return;
        }
      } catch (_) {
        // 忽略网络/404 错误，回退到 next-auth
      }

      // 3) 回退 next-auth credentials（若已配置）
      const r = await signIn("credentials", {
        redirect: false,
        username,
        password,
        callbackUrl: afterPath,
      });
      if (r?.ok) {
        try { toast.success("登录成功"); } catch {}
        onSuccess?.();
        if (afterPath) window.location.href = afterPath;
      } else {
        try { toast.error(r?.error || "登录失败"); } catch {}
      }
    } catch (err) {
      try { toast.error("网络错误"); } catch {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div
        className={
          `w-full max-w-md rounded-2xl border p-6 shadow backdrop-blur ` +
          (isDark
            ? `bg-neutral-900/70 border-neutral-800 text-neutral-100`
            : `bg-white/90 border-neutral-200 text-neutral-900`)
        }
      >
        {/* 头部 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 shadow-inner" />
          <div className="leading-tight">
            <div className="font-semibold text-base">{title}</div>
            <div className="text-xs opacity-70">{subtitle}</div>
          </div>
        </div>

        {/* 表单 */}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1 opacity-80">账号</label>
            <input
              className={
                `w-full px-3 py-2 rounded-xl border outline-none text-sm transition ` +
                (isDark
                  ? `bg-neutral-900 border-neutral-800 focus:ring-2 focus:ring-indigo-500/50`
                  : `bg-white border-neutral-200 focus:ring-2 focus:ring-indigo-500/50`)
              }
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm mb-1 opacity-80">密码</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                className={
                  `w-full pl-3 pr-10 py-2 rounded-xl border outline-none text-sm transition ` +
                  (isDark
                    ? `bg-neutral-900 border-neutral-800 focus:ring-2 focus:ring-indigo-500/50`
                    : `bg-white border-neutral-200 focus:ring-2 focus:ring-indigo-500/50`)
                }
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className={
                  `absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg flex items-center justify-center text-xs ` +
                  (isDark ? `hover:bg-neutral-800/70` : `hover:bg-neutral-100`)
                }
                title={showPwd ? "隐藏密码" : "显示密码"}
              >
                {showPwd ? (
                  // eye-off
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                    <path d="M2.3 1.7a1 1 0 0 0-1.4 1.4l20 20a1 1 0 0 0 1.4-1.4l-3-3A12.1 12.1 0 0 0 22 12S18.5 5 12 5a9.9 9.9 0 0 0-4.6 1.1L2.3 1.7zM7.1 6.5 9 8.4A3.5 3.5 0 0 1 12 8a4 4 0 0 1 4 4 3.5 3.5 0 0 1-.4 1.6l1.4 1.4A6 6 0 0 0 18 12a6 6 0 0 0-10.9-3.5zM3.2 5.4 5 7.3A12.4 12.4 0 0 0 2 12s3.5 7 10 7a11.4 11.4 0 0 0 4.7-1l1.8 1.8A13.6 13.6 0 0 1 12 21C4.5 21 1 14 1 14s.9-1.8 2.2-3.3A14 14 0 0 1 3.2 5.4z"/>
                  </svg>
                ) : (
                  // eye
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                    <path d="M12 5c7.5 0 11 7 11 7s-3.5 7-11 7S1 12 1 12s3.5-7 11-7zm0 2C6.5 7 3.6 11.1 3 12c.6.9 3.5 5 9 5s8.4-4.1 9-5c-.6-.9-3.5-5-9-5zm0 2.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full h-10 rounded-xl text-white text-sm mt-1 transition ${loading ? "bg-indigo-500/70" : "bg-indigo-600 hover:bg-indigo-500"}`}
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </form>

        {/* 辅助链接区（可按需保留） */}
        <div className="mt-4 text-xs opacity-70 flex items-center justify-between">
          <a href="/" className="hover:underline">返回首页</a>
          <a href="/api/auth/signin" className="hover:underline">其他登录方式</a>
        </div>
      </div>
    </div>
  );
}
