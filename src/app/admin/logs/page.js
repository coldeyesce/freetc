"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRotateRight,
  faBolt,
  faChartLine,
  faCircleExclamation,
  faDatabase,
  faPlus,
  faShieldHalved,
  faSkull,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";

const STATUS_OPTIONS = [
  { label: "全部状态", value: "" },
  { label: "成功", value: "success" },
  { label: "拦截", value: "blocked" },
  { label: "失败", value: "error" },
];

const COMPLIANCE_OPTIONS = [
  { label: "合规状态", value: "all" },
  { label: "仅合规", value: "true" },
  { label: "违规记录", value: "false" },
];

const PAGE_SIZE = 20;

const formatDatetime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const statusBadgeClass = (status, isDark) => {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium";
  const tone = {
    success: isDark ? "bg-emerald-500/15 text-emerald-200" : "bg-emerald-100 text-emerald-700",
    blocked: isDark ? "bg-amber-500/15 text-amber-200" : "bg-amber-100 text-amber-700",
    error: isDark ? "bg-rose-500/15 text-rose-200" : "bg-rose-100 text-rose-700",
    default: isDark ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600",
  };
  return `${base} ${tone[status] || tone.default}`;
};

const complianceBadgeClass = (value, isDark) => {
  if (value) {
    return isDark ? "bg-emerald-500/10 text-emerald-200" : "bg-emerald-100 text-emerald-700";
  }
  return isDark ? "bg-rose-500/10 text-rose-200" : "bg-rose-100 text-rose-700";
};

export default function LogsDashboard() {
  const [theme, setTheme] = useState("dark");
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, violations: 0, blocked: 0, failed: 0 });
  const [recent, setRecent] = useState([]);
  const [topIps, setTopIps] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, pageSize: PAGE_SIZE });
  const [filters, setFilters] = useState({ search: "", status: "", compliant: "all" });
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [blocklist, setBlocklist] = useState([]);
  const [blockForm, setBlockForm] = useState({ ip: "", hours: "0", reason: "" });
  const [blockSubmitting, setBlockSubmitting] = useState(false);

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

  const fetchLogs = useCallback(
    async (page = 1, activeFilters = { search: "", status: "", compliant: "all" }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(PAGE_SIZE));
        if (activeFilters.search?.trim()) {
          params.set("search", activeFilters.search.trim());
        }
        if (activeFilters.status) {
          params.set("status", activeFilters.status);
        }
        if (activeFilters.compliant === "true" || activeFilters.compliant === "false") {
          params.set("compliant", activeFilters.compliant);
        }
        const res = await fetch(`/api/admin/logs?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "获取日志失败");
        }
        setLogs(data.data?.logs ?? []);
        setStats(data.data?.stats ?? { total: 0, violations: 0, blocked: 0, failed: 0 });
        setRecent(data.data?.recent ?? []);
        setTopIps(data.data?.topIps ?? []);
        setPagination(data.data?.pagination ?? { page: 1, totalPages: 1, total: 0, pageSize: PAGE_SIZE });
      } catch (error) {
        console.error(error);
        toast.error(error.message || "获取日志失败");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchBlocklist = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/logs/block", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "获取封禁列表失败");
      }
      setBlocklist(data.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "获取封禁列表失败");
    }
  }, []);

  useEffect(() => {
    fetchLogs(1, { search: "", status: "", compliant: "all" });
    fetchBlocklist();
  }, [fetchLogs, fetchBlocklist]);

  const handleRefresh = () => {
    fetchLogs(pagination.page ?? 1, filters);
    fetchBlocklist();
  };

  const handleStatusChange = (value) => {
    const next = { ...filters, status: value };
    setFilters(next);
    fetchLogs(1, next);
  };

  const handleComplianceChange = (value) => {
    const next = { ...filters, compliant: value };
    setFilters(next);
    fetchLogs(1, next);
  };

  const handleSearchSubmit = (event) => {
    event?.preventDefault();
    const next = { ...filters, search: searchInput.trim() };
    setFilters(next);
    fetchLogs(1, next);
  };

  const handlePageChange = (direction) => {
    const nextPage = Math.min(
      Math.max(1, (pagination.page ?? 1) + direction),
      Math.max(1, pagination.totalPages ?? 1),
    );
    fetchLogs(nextPage, filters);
  };

  const chartMax = useMemo(() => {
    if (!recent || recent.length === 0) return 1;
    return Math.max(...recent.map((item) => item.total || 1), 1);
  }, [recent]);

  const handleBlockFormChange = (field, value) => {
    setBlockForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddBlock = async (event) => {
    event.preventDefault();
    if (!blockForm.ip.trim()) {
      toast.warn("请填写需要限制的 IP 地址");
      return;
    }
    setBlockSubmitting(true);
    try {
      const payload = {
        ip: blockForm.ip.trim(),
        reason: blockForm.reason.trim() || "手动封禁",
        hours: Number(blockForm.hours) || 0,
      };
      const res = await fetch("/api/admin/logs/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "封禁失败");
      }
      setBlocklist(data.data ?? []);
      setBlockForm({ ip: "", hours: "0", reason: "" });
      toast.success("封禁策略已更新");
    } catch (error) {
      toast.error(error.message || "封禁失败");
    } finally {
      setBlockSubmitting(false);
    }
  };

  const handleRemoveBlock = async (ip) => {
    if (!ip) return;
    if (!window.confirm(`确认解除 ${ip} 的限制吗？`)) return;
    try {
      const res = await fetch(`/api/admin/logs/block?ip=${encodeURIComponent(ip)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "解除失败");
      }
      setBlocklist(data.data ?? []);
      toast.success("已解除限制");
    } catch (error) {
      toast.error(error.message || "解除失败");
    }
  };

  const surfaceClass = isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white";
  const inputClass = isDark
    ? "rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-blue-400/70 focus:outline-none"
    : "rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500/60 focus:outline-none";
  const selectClass = inputClass;
  const buttonPrimary = "rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow hover:scale-[1.02]";
  const buttonGhost = isDark
    ? "rounded-2xl border border-white/15 px-4 py-2 text-sm text-slate-100 hover:border-blue-400/60"
    : "rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:border-blue-500/60";

  return (
    <main className={`min-h-screen bg-gradient-to-b ${isDark ? "from-slate-950 via-slate-900 to-slate-950 text-slate-100" : "from-slate-100 via-white to-slate-100 text-slate-900"}`}>
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-blue-400/80">Upload Intelligence</p>
            <h1 className="mt-2 text-3xl font-semibold">上传监控与风险日志</h1>
            <p className="mt-1 text-sm text-slate-400">实时洞察违规素材、可疑 IP 与配额趋势，第一时间做出响应。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className={buttonGhost}>
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> 返回后台
            </Link>
            <button type="button" onClick={handleRefresh} className={buttonGhost}>
              <FontAwesomeIcon icon={faArrowRotateRight} className="mr-2" /> 刷新
            </button>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "素材总量", value: stats.total, icon: faDatabase, accent: "from-blue-500 to-indigo-500" },
            { label: "违规拦截", value: stats.violations, icon: faShieldHalved, accent: "from-rose-500 to-orange-500" },
            { label: "自动阻断", value: stats.blocked, icon: faSkull, accent: "from-amber-500 to-rose-500" },
            { label: "上传失败", value: stats.failed, icon: faCircleExclamation, accent: "from-slate-500 to-slate-700" },
          ].map((item) => (
            <div key={item.label} className={`rounded-3xl border px-5 py-4 ${surfaceClass}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{item.value ?? 0}</p>
                </div>
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-white`}>
                  <FontAwesomeIcon icon={item.icon} className="h-5 w-5" />
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className={`rounded-3xl border p-5 ${surfaceClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">14 日趋势</p>
                <h2 className="text-lg font-semibold">上传量 & 违规走势</h2>
              </div>
              <FontAwesomeIcon icon={faChartLine} className="h-5 w-5 text-blue-400" />
            </div>
            {recent.length === 0 ? (
              <p className="mt-6 text-sm text-slate-400">暂无数据，等待新的上传记录。</p>
            ) : (
              <div className="mt-6 flex items-end gap-3 overflow-x-auto">
                {recent.map((item) => {
                  const totalHeight = Math.max(12, Math.round(((item.total || 0) / chartMax) * 120));
                  const violationRate = item.total ? Math.min(100, Math.round(((item.violations || 0) / item.total) * 100)) : 0;
                  return (
                    <div key={item.day} className="flex flex-col items-center gap-2 text-xs">
                      <div className={`flex w-8 flex-col justify-end rounded-full ${isDark ? "bg-white/10" : "bg-slate-200"}`} style={{ height: `${totalHeight}px` }}>
                        <div className="rounded-full bg-gradient-to-t from-rose-500 to-orange-400" style={{ height: `${violationRate}%` }} />
                        <div className="rounded-full bg-gradient-to-t from-blue-600 to-cyan-400" style={{ flexGrow: 1 }} />
                      </div>
                      <span className="text-[11px] text-slate-400">{item.day.slice(5)}</span>
                      <span className="text-[10px] text-slate-500">{item.total}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className={`rounded-3xl border p-5 ${surfaceClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Top 风险 IP</p>
                <h2 className="text-lg font-semibold">频繁违规来源</h2>
              </div>
              <FontAwesomeIcon icon={faBolt} className="h-5 w-5 text-amber-400" />
            </div>
            {topIps.length === 0 ? (
              <p className="mt-6 text-sm text-slate-400">暂未检测到高风险 IP。</p>
            ) : (
              <div className="mt-4 space-y-3">
                {topIps.map((item) => (
                  <div key={item.ip} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"}`}>
                    <div>
                      <p className="font-medium">{item.ip}</p>
                      <p className="text-xs text-slate-400">上传 {item.total ?? 0} · 违规 {item.violations ?? 0}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${item.violations ? (isDark ? "bg-rose-500/15 text-rose-200" : "bg-rose-100 text-rose-600") : (isDark ? "bg-emerald-500/15 text-emerald-200" : "bg-emerald-100 text-emerald-600")}`}>
                      {item.violations ? "关注" : "安全"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-10 space-y-4 rounded-3xl border p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-wrap gap-3">
              <form onSubmit={handleSearchSubmit} className="flex min-w-[220px] flex-1 items-center gap-2">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="文件名、IP 或备注关键词"
                  className={`flex-1 ${inputClass}`}
                />
                <button type="submit" className={buttonPrimary}>
                  搜索
                </button>
              </form>
              <select value={filters.status} onChange={(event) => handleStatusChange(event.target.value)} className={selectClass}>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select value={filters.compliant} onChange={(event) => handleComplianceChange(event.target.value)} className={selectClass}>
                {COMPLIANCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={`overflow-hidden rounded-2xl border ${surfaceClass}`}>
            <div className={`grid grid-cols-[120px_100px_120px_80px_110px_1fr_140px] gap-3 border-b ${isDark ? "border-white/5 bg-white/5" : "border-slate-200 bg-slate-50"} px-4 py-3 text-xs font-medium text-slate-400`}>
              <span>文件名</span>
              <span>存储</span>
              <span>IP</span>
              <span>评级</span>
              <span>合规</span>
              <span>备注</span>
              <span>时间</span>
            </div>
            {loading ? (
              <p className="px-4 py-6 text-sm text-slate-400">日志加载中...</p>
            ) : logs.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400">暂无日志记录，尝试调整筛选条件。</p>
            ) : (
              <div className="divide-y divide-white/5">
                {logs.map((item) => (
                  <div key={item.id ?? `${item.fileName}-${item.createdAt}`} className="grid grid-cols-[120px_100px_120px_80px_110px_1fr_140px] items-center gap-3 px-4 py-3 text-sm">
                    <span className="truncate" title={item.fileName}>
                      {item.fileName || "-"}
                    </span>
                    <span className={statusBadgeClass(item.status, isDark)}>{item.status || "-"}</span>
                    <span className="truncate" title={item.ip}>
                      {item.ip || "-"}
                    </span>
                    <span>{typeof item.rating === "number" ? item.rating : "-"}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${complianceBadgeClass(item.compliant, isDark)}`}>
                      {item.compliant ? "合规" : "违规"}
                    </span>
                    <span className="truncate" title={item.message || item.referer}>
                      {item.message || item.referer || "-"}
                    </span>
                    <span className="text-xs text-slate-400">{formatDatetime(item.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              第 {pagination.page ?? 1} / {pagination.totalPages ?? 1} 页 · 共 {pagination.total ?? 0} 条
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => handlePageChange(-1)} className={buttonGhost} disabled={(pagination.page ?? 1) <= 1}>
                上一页
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                className={buttonGhost}
                disabled={(pagination.page ?? 1) >= (pagination.totalPages ?? 1)}
              >
                下一页
              </button>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className={`rounded-3xl border p-5 ${surfaceClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Block Rules</p>
                <h2 className="text-lg font-semibold">风控 IP 列表</h2>
              </div>
              <FontAwesomeIcon icon={faShieldHalved} className="h-5 w-5 text-emerald-400" />
            </div>
            {blocklist.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">暂无封禁记录。</p>
            ) : (
              <div className="mt-4 space-y-3">
                {blocklist.map((item) => (
                  <div key={item.ip} className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 text-sm ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{item.ip}</p>
                        <p className="text-xs text-slate-400">{item.reason || "手动封禁"}</p>
                      </div>
                      <button type="button" onClick={() => handleRemoveBlock(item.ip)} className="text-xs text-rose-400 hover:text-rose-300">
                        <FontAwesomeIcon icon={faTrash} className="mr-1" /> 解除
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">
                      <p>开始：{formatDatetime(item.blocked_at)}</p>
                      <p>到期：{item.expires_at ? formatDatetime(item.expires_at) : "不限"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={`rounded-3xl border p-5 ${surfaceClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Add Rule</p>
                <h2 className="text-lg font-semibold">快速封禁高危 IP</h2>
              </div>
              <FontAwesomeIcon icon={faPlus} className="h-5 w-5 text-blue-400" />
            </div>
            <form className="mt-4 space-y-3" onSubmit={handleAddBlock}>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">IP 地址</label>
                <input
                  value={blockForm.ip}
                  onChange={(event) => handleBlockFormChange("ip", event.target.value)}
                  placeholder="例如 203.0.113.8"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">有效期（小时，0 表示永久）</label>
                <input
                  type="number"
                  min="0"
                  value={blockForm.hours}
                  onChange={(event) => handleBlockFormChange("hours", event.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">备注</label>
                <textarea
                  value={blockForm.reason}
                  onChange={(event) => handleBlockFormChange("reason", event.target.value)}
                  rows={3}
                  placeholder="原因说明，可选"
                  className={`${inputClass} resize-none`}
                />
              </div>
              <button type="submit" className={buttonPrimary} disabled={blockSubmitting}>
                {blockSubmitting ? "提交中..." : "添加封禁"}
              </button>
            </form>
          </div>
        </section>
      </div>
      <ToastContainer />
    </main>
  );
}
