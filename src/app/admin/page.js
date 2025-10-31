"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt, faCopy, faSearch, faArrowLeft, faSync } from "@fortawesome/free-solid-svg-icons";
import "react-toastify/dist/ReactToastify.css";

// 轻量主题（与首页保持一致）
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

export default function AdminPage() {
  const { isDark } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/list", { method: "GET" });
      if (!res.ok) throw new Error("获取列表失败");
      const data = await res.json();
      setItems(Array.isArray(data?.list) ? data.list : data); // 兼容两种返回格式
    } catch (e) {
      toast.error(e.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items.filter((x) => (x.name || x.url || "").toLowerCase().includes(query.toLowerCase()));
  }, [items, query]);

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success("已复制链接"); }
    catch { toast.error("复制失败"); }
  };

  const del = async (it) => {
    try {
      // 注意：这里假设存在 /api/admin/delete?id=xxx，如果你项目是别的路由（如 /api/admin/remove），只要改这里的 URL 即可，UI 不受影响
      const res = await fetch(`/api/admin/delete?id=${encodeURIComponent(it.id || it._id || it.key || it.url)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      toast.success("已删除");
      setItems((arr) => arr.filter((x) => (x.id||x._id||x.key||x.url) !== (it.id||it._id||it.key||it.url)));
    } catch (e) {
      toast.error(e.message || "删除失败");
    }
  };

  return (
    <main
      className={`min-h-screen px-4 pb-16 ${isDark ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"}`}
      style={{
        backgroundImage: isDark
          ? "radial-gradient(1000px 600px at 10% -10%, rgba(99,102,241,0.15), transparent), radial-gradient(800px 500px at 90% -10%, rgba(34,211,238,0.10), transparent)"
          : "radial-gradient(1000px 600px at 10% -10%, rgba(99,102,241,0.08), transparent), radial-gradient(800px 500px at 90% -10%, rgba(14,165,233,0.08), transparent)",
      }}
    >
      {/* 顶部工具条 */}
      <div className={`sticky top-0 z-40 -mx-4 px-4 h-[60px] flex items-center justify-between border-b backdrop-blur ${isDark ? 'bg-neutral-950/70 border-neutral-900/70' : 'bg-white/70 border-neutral-200/80'}`}>
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-lg px-3 py-1.5 border border-transparent hover:border-indigo-400/50">
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
          </Link>
          <div className="font-semibold">管理</div>
          <div className="text-xs opacity-70">共 {items.length} 条</div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 rounded-xl border px-3 h-9 ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`}>
            <FontAwesomeIcon icon={faSearch} className="w-4 h-4 opacity-60" />
            <input
              className={`bg-transparent outline-none text-sm w-56`}
              placeholder="搜索名称 / 链接"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button onClick={load} disabled={loading} className={`h-9 px-3 rounded-xl text-sm text-white ${loading ? 'bg-indigo-500/70' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
            <FontAwesomeIcon icon={faSync} className="w-4 h-4 mr-1" /> 刷新
          </button>
        </div>
      </div>

      {/* 列表 */}
      <div className="mx-auto max-w-6xl mt-5 grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
        {filtered.map((it, idx) => (
          <div key={idx} className={`rounded-2xl border p-3 ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/90 border-neutral-200'}`}>
            <div className="relative w-full h-40 overflow-hidden rounded-xl border border-black/10">
              {String(it.type||'').startsWith('video/') ? (
                <video src={it.url} className="w-full h-full object-cover" controls />
              ) : (
                <Image src={it.url} alt={it.name||`item-${idx}`} fill className="object-cover" />
              )}
            </div>
            <div className="mt-3 text-xs break-all opacity-80 h-10 overflow-hidden">
              {it.url}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button onClick={() => copy(it.url)} className="h-9 px-3 rounded-xl text-sm text-white bg-emerald-600 hover:bg-emerald-500">
                <FontAwesomeIcon icon={faCopy} className="w-4 h-4 mr-1" /> 复制
              </button>
              <button onClick={() => del(it)} className="h-9 px-3 rounded-xl text-sm text-white bg-rose-600 hover:bg-rose-500">
                <FontAwesomeIcon icon={faTrashAlt} className="w-4 h-4 mr-1" /> 删除
              </button>
            </div>
          </div>
        ))}
      </div>

      <ToastContainer position="top-right" autoClose={2200} theme={isDark ? 'dark' : 'light'} />
    </main>
  );
}
