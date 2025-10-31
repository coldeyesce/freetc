"use client";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "react-toastify";

/**
 * SignIn — 炫酷美化版（不改变登录逻辑）
 * 行为：
 *  1) 若传入 onSubmit，则优先调用；若返回 false，再走步骤 2/3
 *  2) POST /api/enableauthapi/login
 *  3) 回退 next-auth 的 credentials
 * 成功后跳转到 afterPath（默认 "/"）
 *
 * UI：
 *  - 渐变描边卡片 + 玻璃拟态 + 柔和光晕
 *  - 输入框聚焦 ring、按钮渐变
 *  - 显示/隐藏密码（纯 SVG，无外部图标依赖）
 *  - 自动适配深/浅色（读取 localStorage.theme 或系统偏好）
 */

function useThemeMode() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (saved) setIsDark(saved === "dark");
    else if (typeof window !== "undefined" && window.matchMedia) {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);
  return isDark;
}

export default function SignIn({
  onSubmit,            // (可选) 自定义登录：({username,password}) => Promise<boolean|void>
  onSuccess,           // (可选) 登录成功回调
  afterPath = "/",     // 登录成功后跳转
  title = "登录",       // 标题
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
      // 1) 自定义
      if (typeof onSubmit === "function") {
        const ok = await onSubmit({ username, password });
        if (ok !== false) {
          try { toast.success("登录成功"); } catch {}
          onSuccess?.();
          if (afterPath) window.location.href = afterPath;
          return;
        }
      }

      // 2) 你的接口
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
        // 忽略网络/404，继续回退
      }

      // 3) 回退 next-auth
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
    <div className="w-full flex items-center justify-center">
      {/* 背景柔光（不占交互） */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
      >
        <div className="absolute -top-20 -left-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      {/* 渐变描边外框 */}
      <div className="w-full max-w-md p-[1px] rounded-3xl bg-gradient-to-br from-indigo-500 via-sky-400 to-fuchsia-500 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.5)]">
        {/* 玻璃拟态卡片 */}
        <div
          className={
            "rounded-3xl p-6 backdrop-blur " +
            (isDark
              ? "bg-neutral-900/70 text-neutral-100"
              : "bg-white/90 text-neutral-900")
          }
        >
          {/* 顶部品牌行 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 shadow-inner" />
            <h1 className="text-lg font-semibold tracking-wide">{title}</h1>
          </div>

          {/* 表单 */}
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1 opacity-80">账号</label>
              <div
                className={
                  "flex items-center rounded-xl border transition " +
                  (isDark
                    ? "bg-neutral-900 border-neutral-800 focus-within:ring-2 focus-within:ring-indigo-500/50"
                    : "bg-white border-neutral-200 focus-within:ring-2 focus-within:ring-indigo-500/50")
                }
              >
                <input
                  className={
                    "w-full px-3 py-2 rounded-xl bg-transparent outline-none text-sm"
                  }
                  placeholder="用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 opacity-80">密码</label>
              <div
                className={
                  "relative flex items-center rounded-xl border transition " +
                  (isDark
                    ? "bg-neutral-900 border-neutral-800 focus-within:ring-2 focus-within:ring-indigo-500/50"
                    : "bg-white border-neutral-200 focus-within:ring-2 focus-within:ring-indigo-500/50")
                }
              >
                <input
                  type={showPwd ? "text" : "password"}
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-transparent outline-none text-sm"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className={
                    "absolute right-2 h-8 w-8 rounded-lg flex items-center justify-center text-neutral-500 " +
                    (isDark ? "hover:bg-neutral-800/70" : "hover:bg-neutral-100")
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
              className={
                "w-full h-11 rounded-xl text-white text-sm font-medium transition " +
                (loading
                  ? "bg-indigo-500/70"
                  : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-[0_8px_24px_-12px_rgba(79,70,229,0.6)]")
              }
            >
              {loading ? "登录中…" : "登录"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** 兼容命名导出（若你的 page.jsx 仍写的是 { LoginPage }） */
export function LoginPage(props) {
  return <SignIn {...props} />;
}
