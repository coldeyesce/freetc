// ===============================
if (!query.trim()) return items;
const q = query.toLowerCase();
return items.filter((x) => (x.name || x.url || "").toLowerCase().includes(q));
}, [items, query]);


const copy = async (text) => {
try { await navigator.clipboard.writeText(text); toast.success("已复制链接"); }
catch { toast.error("复制失败"); }
};


const del = async (it) => {
try {
const id = it.id || it._id || it.key || it.url;
const res = await fetch(`/api/admin/delete?id=${encodeURIComponent(id)}`, { method: "DELETE" });
if (!res.ok) throw new Error("删除失败");
toast.success("已删除");
setItems((arr) => arr.filter((x) => (x.id||x._id||x.key||x.url) !== id));
} catch (e) {
toast.error(e?.message || "删除失败");
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
<div className={`sticky top-0 z-40 -mx-4 px-4 h-[64px] flex items-center justify-between border-b backdrop-blur ${isDark ? 'bg-neutral-950/70 border-neutral-900/70' : 'bg-white/70 border-neutral-200/80'}`}>
<div className="flex items-center gap-2">
<Tab href="/admin" active={pathname === "/admin"}>图库</Tab>
<Tab href="/admin/logs" active={pathname?.startsWith("/admin/log")}>日志</Tab>
<div className="ml-3 text-xs opacity-70">共 {items.length} 条</div>
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
<button onClick={load} disabled={loading} className={`h-9 px-3 rounded-xl text-sm text-white ${loading ? 'bg-indigo-500/70' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
{loading ? '刷新中…' : '刷新'}
</button>
</div>
</div>


{/* 列表 */}
<div className="mx-auto max-w-6xl mt-5 grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
{filtered.map((it, idx) => (
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


<ToastContainer position="top-right" autoClose={2200} theme={isDark ? 'dark' : 'light'} />
</main>
);
}
