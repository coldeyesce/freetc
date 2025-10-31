"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function useTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (saved) setIsDark(saved === "dark");
    else if (typeof window !== "undefined" && window.matchMedia) {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);
  return { isDark };
}

function Tab({ href, active, children }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={
        `px-3 h-9 inline-flex items-center rounded-xl text-sm border transition ` +
        (active
          ? `bg-indigo-600 text-white border-indigo-600 shadow`
          : `bg-transparent border-neutral-300/60 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-200`)
      }
    >
      {children}
    </Link>
  );
}

async function fetchJSON(url) {
  const res = await fetch(url);
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(text || `请求失败 ${res.status}`); }
}

function parseDate(x) {
  const t = x?.time || x?.timestamp || x?.date;
  const d = t ? new Date(t) : null;
  return isNaN(d?.getTime?.()) ? null : d;
}

export default function AdminLogsPage() {
  const { isDark } = useTheme();
  const pathname = usePathname();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState("");   // YYYY-MM-DD
  const [action, setAction] = useState("ALL");

  // 分页
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  async function load() {
    setLoading(true);
    try {
      const candidates = ["/api/admin/logs", "/api/admin/log", "/api/admin/records"];
      let data = null, lastErr = null;
      for (const url of candidates) {
        try { data = await fetchJSON(url); break; } catch (e) { lastErr = e; }
      }
      if (!data) throw lastErr || new Error("无法获取日志");
      const list = Array.isArray(data?.list) ? data.list : Array.isArray(data) ? data : [];
      setRows(list);
      setPage(1);
    } catch (e) {
      toast.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const actions = useMemo(() => {
    const s = new Set(rows.map((r) => r.action || r.type).filter(Boolean));
    return ["ALL", ...Array.from(s)];
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    }
    if (action !== "ALL") {
      list = list.filter((r) => (r.action || r.type) === action);
    }
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate + "T00:00:00") : null;
      const end = endDate ? new Date(endDate + "T23:59:59") : null;
      list = list.filter((r) => {
        const d = parseDate(r);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }
    return list;
  }, [rows, query, action, startDate, endDate]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => { setPage(1); }, [query, action, startDate, endDate, pageSize]);
  const start = (page - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  function downloadCSV() {
    const headers = ["time", "ip", "user", "action", "detail", "url", "message"]; // 兼容多字段
    const data = filtered.map((r) => ({
      time: r.time || r.timestamp || r.date || "",
      ip: r.ip || "",
      user: r.user || r.username || "",
      action: r.action || r.type || "",
      detail: r.detail || "",
      url: r.url || "",
      message: r.message || "",
    }));
    const esc = (v) => (`"${String(v ?? "").replaceAll('"', '""').replace(/\n/g, ' ')}` + `"`);
    const csv = [headers.join(","), ...data.map((row) => headers.map((h) => esc(row[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `logs_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function resetFilters() {
    setQuery("");
    setStartDate("");
    setEndDate("");
    setAction("ALL");
  }

  return (
    <main
      className={`min-h-screen px-4 pb-20 ${isDark ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"}`}
      style={{
        backgroundImage: isDark
          ? "radial-gradient(1000px 600px at 10% -10%, rgba(99,102,241,0.15), transparent), radial-gradient(800px 500px at 90% -10%, rgba(34,211,238,0.10), transparent)"
          : "radial-gradient(1000px 600px at 10% -10%, rgba(99,102,241,0.08), transparent), radial-gradient(800px 500px at 90% -10%, rgba(14,165,233,0.08), transparent)",
      }}
    >
      {/* 顶部工具条（与图库页一致） */}
      <div className={`sticky top-0 z-40 -mx-4 px-4 h-[64px] flex items-center justify-between border-b backdrop-blur ${isDark ? 'bg-neutral-950/70 border-neutral-900/70' : 'bg-white/70 border-neutral-200/80'}`}>
        <div className="flex items-center gap-2">
          <Tab href="/admin" active={pathname === "/admin"}>图库</Tab>
          <Tab href="/admin/logs" active={pathname?.startsWith("/admin/log")}>日志</Tab>
          <div className="ml-3 text-xs opacity-70">共 {total} 条</div>
        </div>
        <div className="flex items-center gap-2">
          {/* 搜索 */}
          <div className={`flex items-center gap-2 rounded-xl border px-3 h-9 ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`}>
            <span className="text-xs opacity-60">搜索</span>
            <input
              className="bg-transparent outline-none text-sm w-56"
              placeholder="关键字（时间/IP/用户/动作/链接）"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {/* 日期范围 */}
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`h-9 px-3 rounded-xl text-sm border ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`} />
          <span className="opacity-60">—</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`h-9 px-3 rounded-xl text-sm border ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`} />
          {/* 动作筛选 */}
          <select value={action} onChange={(e) => setAction(e.target.value)} className={`h-9 px-3 rounded-xl text-sm border ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`}>
            {actions.map((a) => (<option key={a} value={a}>{a === 'ALL' ? '全部动作' : a}</option>))}
          </select>
          {/* 每页 */}
          <select
            className={`h-9 px-3 rounded-xl text-sm border ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`}
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            title="每页条数"
          >
            <option value={12}>每页 12</option>
            <option value={24}>每页 24</option>
            <option value={48}>每页 48</option>
            <option value={96}>每页 96</option>
          </select>
          <button onClick={load} disabled={loading} className={`h-9 px-3 rounded-xl text-sm text-white ${loading ? 'bg-indigo-500/70' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
            {loading ? '刷新中…' : '刷新'}
          </button>
          <button onClick={resetFilters} className={`h-9 px-3 rounded-xl text-sm border ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`}>重置</button>
          <button onClick={downloadCSV} className="h-9 px-3 rounded-xl text-sm text-white bg-emerald-600 hover:bg-emerald-500">导出 CSV</button>
        </div>
      </div>

      {/* 日志表格 */}
      <div className={`mx-auto max-w-6xl mt-5 rounded-2xl overflow-hidden border ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className={`grid grid-cols-6 text-xs font-medium px-3 py-2 ${isDark ? 'bg-neutral-900/70' : 'bg-white/80'}`}>
          <div className="col-span-2">时间</div>
          <div>IP / 用户</div>
          <div>动作</div>
          <div className="col-span-2">详情</div>
        </div>
        <div className="divide-y divide-neutral-200/70 dark:divide-neutral-800/70">
          {pageRows.map((r, i) => (
            <div key={i} className={`grid grid-cols-6 px-3 py-2 text-xs ${isDark ? 'bg-neutral-900/40 hover:bg-neutral-900/60' : 'bg-white hover:bg-neutral-50'}`}>
              <div className="col-span-2 break-all opacity-80">{r.time || r.timestamp || r.date || '-'}</div>
              <div className="break-all opacity-80">{r.ip || r.user || '-'}</div>
              <div className="break-all">{r.action || r.type || '-'}</div>
              <div className="col-span-2 break-all opacity-80">{r.detail || r.url || r.message || '-'}</div>
            </div>
          ))}
          {pageRows.length === 0 && (
            <div className="px-3 py-6 text-center text-sm opacity-70">暂无日志</div>
          )}
        </div>
      </div>

      {/* 分页条 */}
      <div className="mx-auto max-w-6xl mt-6 flex items-center justify-between text-sm">
        <div className="opacity-70">第 {page} / {totalPages} 页，共 {total} 条</div>
        <div className="flex items-center gap-2">
          <button
            className={`h-9 px-3 rounded-xl border ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >上一页</button>
          <button
            className={`h-9 px-3 rounded-xl border ${page === totalPages ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >下一页</button>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={2200} theme={isDark ? 'dark' : 'light'} />
    </main>
  );
}
