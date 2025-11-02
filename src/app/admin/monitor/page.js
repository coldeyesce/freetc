"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowsRotate,
  faCircleHalfStroke,
  faFloppyDisk,
  faGaugeHigh,
} from "@fortawesome/free-solid-svg-icons";

const REQUEST_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
};

const DEFAULT_LIMITS = {
  anonymous: 1,
  user: 15,
};

export default function MonitorDashboard() {
  const [theme, setTheme] = useState("dark");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [anonymousLimit, setAnonymousLimit] = useState(DEFAULT_LIMITS.anonymous);
  const [userLimit, setUserLimit] = useState(DEFAULT_LIMITS.user);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("upload-theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      return;
    }
    const hour = new Date().getHours();
    setTheme(hour >= 7 && hour < 19 ? "light" : "dark");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("upload-theme", theme);
  }, [theme]);

  const isDark = theme === "dark";
  const pageBackground = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900";
  const surfaceClass = isDark ? "border-white/10 bg-white/5 backdrop-blur" : "border-slate-200 bg-white shadow-sm";
  const mutedTextClass = isDark ? "text-slate-300" : "text-slate-600";
  const inputClass = isDark
    ? "h-11 w-full rounded-[16px] border border-white/15 bg-white/10 px-4 text-sm text-slate-100 placeholder:text-slate-400 focus:border-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
    : "h-11 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20";
  const subtleButtonClass = isDark
    ? "flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-blue-400/70"
    : "flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-blue-500/60";
  const primaryButtonClass =
    "flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_45px_-18px_rgba(37,99,235,0.75)] transition hover:scale-[1.03]";
  const secondaryButtonClass = isDark
    ? "flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-slate-100 transition hover:border-blue-400/70"
    : "flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-blue-500/60";
  const badgeClass = isDark
    ? "inline-flex items-center rounded-full bg-blue-500/20 px-3 py-0.5 text-[11px] font-medium text-blue-200"
    : "inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-[11px] font-medium text-blue-600";
  const cardClass = isDark
    ? "rounded-[22px] border border-white/12 bg-white/7 p-5 backdrop-blur"
    : "rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm";
  const chartBarBaseClass = isDark ? "bg-gradient-to-t from-blue-600 via-cyan-500 to-sky-400" : "bg-gradient-to-t from-blue-400 via-sky-400 to-cyan-300";

  const fetchQuota = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/quota", {
        method: "GET",
        headers: REQUEST_HEADERS,
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "加载监控数据失败");
      }
      setData(result.data ?? null);
      const limits = result.data?.limits ?? DEFAULT_LIMITS;
      setAnonymousLimit(limits.anonymous ?? DEFAULT_LIMITS.anonymous);
      setUserLimit(limits.user ?? DEFAULT_LIMITS.user);
    } catch (error) {
      toast.error(error.message || "加载监控数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  const handleRefresh = () => {
    fetchQuota();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const anonymous = Math.max(0, Number.isFinite(Number(anonymousLimit)) ? Math.floor(Number(anonymousLimit)) : 0);
    const user = Math.max(0, Number.isFinite(Number(userLimit)) ? Math.floor(Number(userLimit)) : 0);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/quota", {
        method: "PATCH",
        headers: REQUEST_HEADERS,
        body: JSON.stringify({
          anonymousLimit: anonymous,
          userLimit: user,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "更新配额失败");
      }
      setData(result.data ?? null);
      const limits = result.data?.limits ?? { anonymous, user };
      setAnonymousLimit(limits.anonymous ?? anonymous);
      setUserLimit(limits.user ?? user);
      toast.success("配额已更新");
    } catch (error) {
      toast.error(error.message || "更新配额失败");
    } finally {
      setSaving(false);
    }
  };

  const limits = data?.limits ?? DEFAULT_LIMITS;
  const today = data?.today ?? { anonymous: 0, user: 0, admin: 0, total: 0 };
  const lifetimeAnonymous = data?.lifetimeAnonymous ?? 0;

  const chartData = useMemo(() => {
    if (!Array.isArray(data?.recent)) {
      return { maxTotal: 1, items: [] };
    }
    const sorted = [...data.recent].reverse(); // oldest -> newest
    const maxTotal = Math.max(...sorted.map((item) => item.total || 0), 1);
    return {
      maxTotal,
      items: sorted,
    };
  }, [data?.recent]);

  const formatDay = (value) => {
    if (typeof value !== "string" || value.length === 0) return "--";
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[2]}/${match[3]}`;
    }
    return value;
  };

  const renderChartBars = () =>
    chartData.items.map((item) => {
      const height = chartData.maxTotal === 0 ? 0 : Math.round((item.total / chartData.maxTotal) * 100);
      return (
        <div key={item.day} className="flex h-48 flex-col items-center justify-end gap-2 text-xs">
          <div
            className={`flex w-7 items-end justify-center rounded-full ${chartBarBaseClass} transition-all`}
            style={{ height: `${Math.max(height, 6)}%`, minHeight: "20px" }}
            title={`${item.total} 次`}
          >
            <span className="pb-1 text-[10px] font-semibold text-white">{item.total}</span>
          </div>
          <span className={`text-[10px] ${mutedTextClass}`}>{formatDay(item.day)}</span>
        </div>
      );
    });

  return (
    <main className={`min-h-screen w-full overflow-x-hidden ${pageBackground}`}>
      <div className="relative flex min-h-screen flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={`absolute left-1/2 top-[-220px] h-[420px] w-[540px] -translate-x-1/2 rounded-full bg-gradient-to-br ${isDark ? "from-blue-500/25 via-indigo-500/15 to-transparent" : "from-blue-300/40 via-cyan-200/25 to-transparent"} blur-[180px]`} />
          <div className={`absolute -bottom-24 right-12 h-[300px] w-[300px] rounded-full ${isDark ? "bg-indigo-600/25" : "bg-indigo-200/40"} blur-[180px]`} />
          <div className={`absolute bottom-28 left-12 h-[240px] w-[240px] rounded-full ${isDark ? "bg-cyan-500/20" : "bg-cyan-200/40"} blur-[150px]`} />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-0 pb-10">
          <header
            className={`rounded-[32px] border ${surfaceClass} p-6 ${
              isDark
                ? "bg-gradient-to-r from-slate-950/80 via-slate-900/60 to-slate-950/80"
                : "bg-gradient-to-r from-white via-blue-50/60 to-white"
            }`}
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
                  <FontAwesomeIcon icon={faGaugeHigh} className="h-6 w-6" />
                </span>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.3em] text-blue-300/90">Admin Monitor</p>
                  <h1 className="text-2xl font-semibold tracking-wide">上传监控面板</h1>
                  <p className={`text-xs ${mutedTextClass}`}>
                    观察访客与登录用户的上传趋势，并灵活调整每日配额。仅管理员可访问该页面。
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))} className={subtleButtonClass}>
                  <FontAwesomeIcon icon={faCircleHalfStroke} className="h-4 w-4" />
                  {`切换为${isDark ? "浅色" : "深色"}主题`}
                </button>
                <button type="button" onClick={handleRefresh} className={`${subtleButtonClass} ${loading ? "cursor-wait opacity-70" : ""}`} disabled={loading}>
                  <FontAwesomeIcon icon={faArrowsRotate} className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  刷新数据
                </button>
                <Link href="/admin" className={subtleButtonClass}>
                  <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
                  返回管理页
                </Link>
              </div>
            </div>
          </header>

          <section className={`rounded-[28px] border ${surfaceClass} p-6`}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className={cardClass}>
                <p className={badgeClass}>今日总上传</p>
                <p className="mt-2 text-2xl font-semibold">{today.total?.toLocaleString("zh-CN") ?? "0"}</p>
                <p className={`mt-2 text-xs ${mutedTextClass}`}>
                  游客 {today.anonymous?.toLocaleString("zh-CN") ?? 0} · 用户 {today.user?.toLocaleString("zh-CN") ?? 0} · 管理员 {today.admin?.toLocaleString("zh-CN") ?? 0}
                </p>
              </div>
              <div className={cardClass}>
                <p className={badgeClass}>游客今日配额</p>
                <p className="mt-2 text-2xl font-semibold">
                  {today.limitAnonymous > 0 ? `${today.anonymous}/${today.limitAnonymous}` : "不限"}
                </p>
                <p className={`mt-2 text-xs ${mutedTextClass}`}>为 0 表示无限制，目前设置 {limits.anonymous} 次/日。</p>
              </div>
              <div className={cardClass}>
                <p className={badgeClass}>用户今日配额</p>
                <p className="mt-2 text-2xl font-semibold">
                  {today.limitUser > 0 ? `${today.user}/${today.limitUser}` : "不限"}
                </p>
                <p className={`mt-2 text-xs ${mutedTextClass}`}>为 0 表示无限制，目前设置 {limits.user} 次/日。</p>
              </div>
              <div className={cardClass}>
                <p className={badgeClass}>游客累计上传</p>
                <p className="mt-2 text-2xl font-semibold">{lifetimeAnonymous.toLocaleString("zh-CN")}</p>
                <p className={`mt-2 text-xs ${mutedTextClass}`}>自功能上线以来的累计数据。</p>
              </div>
            </div>
          </section>

          <section className={`rounded-[28px] border ${surfaceClass} p-6`}>
            <div className="flex flex-col gap-6 lg:flex-row">
              <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 lg:max-w-sm">
                <div>
                  <h2 className="text-lg font-semibold">调整上传配额</h2>
                  <p className={`mt-1 text-xs ${mutedTextClass}`}>设置为 0 表示无限制，保存后立即生效。</p>
                </div>
                <label className="flex flex-col gap-2 text-sm">
                  <span className={mutedTextClass}>游客每日可上传次数</span>
                  <input
                    type="number"
                    min={0}
                    value={anonymousLimit}
                    onChange={(event) => setAnonymousLimit(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm">
                  <span className={mutedTextClass}>注册用户每日可上传次数</span>
                  <input
                    type="number"
                    min={0}
                    value={userLimit}
                    onChange={(event) => setUserLimit(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="submit" className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`} disabled={saving}>
                    <FontAwesomeIcon icon={faFloppyDisk} className="h-4 w-4" />
                    保存配额
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnonymousLimit(limits.anonymous ?? DEFAULT_LIMITS.anonymous);
                      setUserLimit(limits.user ?? DEFAULT_LIMITS.user);
                    }}
                    className={secondaryButtonClass}
                    disabled={saving}
                  >
                    重置为当前值
                  </button>
                </div>
              </form>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">近 14 日上传趋势</h2>
                    <p className={`text-xs ${mutedTextClass}`}>数据来源于每日上传统计，含游客、用户与管理员。</p>
                  </div>
                  <span className={badgeClass}>{chartData.items.length} 天数据</span>
                </div>
                <div
                  className={`mt-6 rounded-[24px] border ${surfaceClass} p-6 ${
                    loading ? "animate-pulse opacity-70" : ""
                  }`}
                >
                  {chartData.items.length === 0 ? (
                    <div className={`flex h-40 items-center justify-center text-sm ${mutedTextClass}`}>暂无趋势数据，稍后再试。</div>
                  ) : (
                    <div className="flex gap-4 overflow-x-auto pb-2">{renderChartBars()}</div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <ToastContainer position="bottom-right" theme={isDark ? "dark" : "light"} />
      </div>
    </main>
  );
}
