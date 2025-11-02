"use client";
import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { ToastContainer, toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImages, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";

const fieldBaseClass =
  "w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [theme, setTheme] = useState("light");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    setTheme(hour >= 18 || hour < 7 ? "dark" : "light");
  }, []);

  const isDark = theme === "dark";

  const backgroundClass = useMemo(
    () =>
      isDark
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100"
        : "bg-gradient-to-br from-sky-100 via-white to-blue-50 text-slate-900",
    [isDark],
  );

  const cardClass = useMemo(
    () =>
      isDark
        ? "border-white/10 bg-white/5 text-slate-100 shadow-[0_25px_80px_-40px_rgba(14,116,244,0.6)]"
        : "border-white/70 bg-white/90 text-slate-900 shadow-[0_25px_80px_-50px_rgba(14,116,244,0.35)]",
    [isDark],
  );

  const inputClass = useMemo(
    () =>
      `${fieldBaseClass} ${
        isDark
          ? "border-white/10 bg-white/10 text-slate-100 placeholder:text-slate-400 focus:ring-blue-400/80 focus:ring-offset-slate-900"
          : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-blue-400/80 focus:ring-offset-white"
      }`,
    [isDark],
  );

  const buttonClass = useMemo(
    () =>
      `flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-200 ${
        submitting ? "opacity-70" : ""
      }`,
    [submitting],
  );

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        username,
        password,
      });

      if (result?.error) {
        toast.error("用户名或密码错误，请确认后再试");
      } else {
        toast.success("登录成功，正在跳转...");
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch (error) {
      toast.error("登录出现异常，请稍后再试");
      console.error("Error during sign in:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 ${backgroundClass}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-120px] h-72 w-72 -translate-x-1/2 rounded-full bg-blue-400/40 blur-[150px]" />
        <div className="absolute bottom-[-140px] right-[-80px] h-80 w-80 rounded-full bg-indigo-500/40 blur-[160px]" />
        <div className="absolute bottom-0 left-[-120px] h-64 w-64 rounded-full bg-cyan-400/35 blur-[160px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10 lg:flex-row">
        <aside
          className={`flex w-full max-w-md flex-col gap-6 rounded-3xl border p-8 backdrop-blur-xl ${cardClass}`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/40">
              <FontAwesomeIcon icon={faImages} className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-blue-300">
                Telegraph Image
              </p>
              <h1 className="mt-1 text-2xl font-semibold">登录你的账号</h1>
            </div>
          </div>
          <p className={`text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            使用管理账号登录以维护上传空间。支持明暗双主题，夜间自动护眼，也可手动切换。
          </p>
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition ${
              isDark
                ? "border-white/20 bg-white/10 text-slate-100 hover:border-blue-400/60"
                : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-400/60"
            }`}
          >
            <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="h-4 w-4" />
            切换为{isDark ? "浅色" : "暗色"}模式
          </button>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
          <ul className={`space-y-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            <li>· 支持多角色权限管理</li>
            <li>· 登录后可访问后台或上传首页</li>
            <li>· 安全传输，自动清理敏感信息</li>
          </ul>
        </aside>

        <section
          className={`relative w-full max-w-md rounded-3xl border p-8 backdrop-blur-xl ${cardClass}`}
        >
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="username">
                用户名
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className={inputClass}
                placeholder="请输入您的账号"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                密码
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
                placeholder="输入登录密码"
              />
            </div>
            <button type="submit" className={buttonClass} disabled={submitting}>
              <span>{submitting ? "登录中..." : "立即登录"}</span>
            </button>
          </form>
          <p className={`mt-6 text-center text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            遇到问题可联系管理员重置凭证
          </p>
        </section>
      </div>
      <ToastContainer position="top-center" theme={isDark ? "dark" : "light"} />
    </div>
  );
}
