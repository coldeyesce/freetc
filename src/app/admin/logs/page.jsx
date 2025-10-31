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

export default function AdminLogsPage() {
  const { isDark } = useTheme();
  const pathname = usePathname();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    try {
      // 依次尝试几种常见日志接口名（只要有一个可用即可）
      const candidates = ["/api/admin/logs", "/api/admin/log", "/api/admin/records"];
      let data = null, lastErr = null;
      for (const url of candidates) {
        try { data = await fetchJSON(url); break; } catch (e) { lastErr = e; }
      }
      if (!data) throw lastErr || new Error("无法获取日志");
      const list = Array.isArray(data?.list) ? data.list : Array.isArray(data) ? data : [];
      setRows(list);
    } catch (e) {
      toast.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <main
      className={`min-h-screen px-4 pb-16 ${isDark ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"}`}
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
          <div className="ml-3 text-xs opacity-70">共 {rows.length} 条</div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 rounded-xl border px-3 h-9 ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`}>
            <span className="text-xs opacity-60">搜索</span>
            <input
              className="bg-transparent outline-none text-sm w-56"
              placeholder="关键字（时间/IP/用户/动作/链接）"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button onClick={load} disabled={loading} className={`h-9 px-3 rounded-xl text-sm text-white ${loading ? 'bg-indigo-500/70' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
            {loading ? '刷新中…' : '刷新'}
          </button>
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
          {filtered.map((r, i) => (
            <div key={i} className={`grid grid-cols-6 px-3 py-2 text-xs ${isDark ? 'bg-neutral-900/40 hover:bg-neutral-900/60' : 'bg-white hover:bg-neutral-50'}`}>
              <div className="col-span-2 break-all opacity-80">{r.time || r.timestamp || r.date || '-'}</div>
              <div className="break-all opacity-80">{r.ip || r.user || '-'}</div>
              <div className="break-all">{r.action || r.type || '-'}</div>
              <div className="col-span-2 break-all opacity-80">{r.detail || r.url || r.message || '-'}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm opacity-70">暂无日志</div>
          )}
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={2200} theme={isDark ? 'dark' : 'light'} />
    </main>
  );
}
