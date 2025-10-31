"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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

export default function AdminPage() {
  const { isDark } = useTheme();
  const pathname = usePathname();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  // 分页
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/list");
      const text = await res.text();
      let data = [];
      try {
        data = JSON.parse(text);
      } catch {
        toast.error(`获取列表失败：${text?.slice(0, 80) || res.status}`);
        return;
      }
      setItems(Array.isArray(data?.list) ? data.list : data);
      setPage(1); // 重新加载回到第一页
    } catch (e) {
      toast.error(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((x) => (x.name || x.url || "").toLowerCase().includes(q));
  }, [items, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => { setPage(1); }, [query, pageSize]);
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success("已复制链接"); }
    catch { toast.error("复制失败"); }
  };

  async function tryDelete(id) {
    const endpoints = [
      { url: `/api/admin/delete?id=${encodeURIComponent(id)}`, method: "DELETE" },
      { url: `/api/admin/remove?id=${encodeURIComponent(id)}`, method: "DELETE" },
      { url: `/api/admin/del?id=${encodeURIComponent(id)}`, method: "DELETE" },
      // 某些后端只支持 POST body
      { url: `/api/admin/delete`, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) },
    ];
    for (const opt of endpoints) {
      try {
        const res = await fetch(opt.url, opt);
        if (res.ok) return true;
      } catch {}
    }
    return false;
  }

  const del = async (it) => {
    try {
      const id = it.id || it._id || it.key || it.url;
      const ok = await tryDelete(id);
      if (!ok) throw new Error("删除接口不可用");
      toast.success("已删除");
      setItems((arr) => arr.filter((x) => (x.id||x._id||x.key||x.url) !== id));
    } catch (e) {
      toast.error(e?.message || "删除失败");
    }
  };

  return (
    <main
      className={`min-h-screen px-4 pb-20 ${isDark ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"}`}
      style={{
        backgroundImage: isDark
          ? "radial-gradient(1000px 600px at 10% -10%, rgba(99,102,241,0.15), transparent), radial-gradient(800px 500px at 90% -10%, rgba(34,211,238,0.10), transparent)"
          : "radial-gradient(1000px 600px at 10% -10%, rgba(99,102,241,0.08), transparent), radial-gradient(800px 500px at 90% -10%, rgba(14,165,233,0.08), transparent)",
      }}
    >
      {/* 顶部工具条 */}
      <div className={`sticky top-0 z-40 -mx-4 px-4 h-[64px] flex items-center justify-between border-b backdrop-blur ${isDark ? 'bg-neutral-950/70 border-neutral-900/70' : 'bg-white/70 border-neutral-200/80'}`}>
        <div className="flex items-center gap-2">
          <Tab href="/admin" active={pathname === "/admin"}>图库</Tab>
          <Tab href="/admin/logs" active={pathname?.startsWith("/admin/log")}>日志</Tab>
          <div className="ml-3 text-xs opacity-70">共 {total} 条</div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 rounded-xl border px-3 h-9 ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`}>
            <span className="text-xs opacity-60">搜索</span>
            <input
              className="bg-transparent outline-none text-sm w-56"
              placeholder="名称 / 链接"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
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
        </div>
      </div>

      {/* 列表 */}
      <div className="mx-auto max-w-6xl mt-5 grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
        {pageItems.map((it, idx) => (
          <div key={idx} className={`rounded-2xl border p-3 ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/90 border-neutral-200'}`}>
            <div className="relative w-full h-40 overflow-hidden rounded-xl border border-black/10 bg-neutral-100 dark:bg-neutral-800">
              {String(it.type||'').startsWith('video/') ? (
                <video src={it.url} className="w-full h-full object-cover" controls />
              ) : (
                <Image src={it.url} alt={it.name||`item-${idx}`} fill className="object-cover" />
              )}
            </div>
            <div className="mt-3 text-xs break-all opacity-80 h-10 overflow-hidden">{it.url}</div>
            <div className="mt-3 flex items-center justify-between">
              <button onClick={() => copy(it.url)} className="h-9 px-3 rounded-xl text-sm text-white bg-emerald-600 hover:bg-emerald-500">复制</button>
              <button onClick={() => del(it)} className="h-9 px-3 rounded-xl text-sm text-white bg-rose-600 hover:bg-rose-500">删除</button>
            </div>
          </div>
        ))}
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
