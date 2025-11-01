"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// 主题Hook
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

// 标签页组件
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

// 格式化时间
function formatTime(timeStr) {
  if (!timeStr) return '-';
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return timeStr;
  }
}

// 加载骨架屏
function SkeletonRow({ isDark }) {
  return (
    <div className={`grid grid-cols-12 px-4 py-3 animate-pulse ${isDark ? 'bg-neutral-900/40' : 'bg-white'}`}>
      <div className="col-span-3 h-4 bg-neutral-700/30 dark:bg-neutral-800/50 rounded"></div>
      <div className="col-span-2 h-4 bg-neutral-700/30 dark:bg-neutral-800/50 rounded"></div>
      <div className="col-span-2 h-4 bg-neutral-700/30 dark:bg-neutral-800/50 rounded"></div>
      <div className="col-span-4 h-4 bg-neutral-700/30 dark:bg-neutral-800/50 rounded"></div>
      <div className="col-span-1 h-4 bg-neutral-700/30 dark:bg-neutral-800/50 rounded"></div>
    </div>
  );
}

// 日志详情模态框
function LogModal({ log, isOpen, onClose, isDark }) {
  if (!isOpen || !log) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className={`max-w-2xl w-full rounded-2xl border shadow-xl ${
          isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>日志详情</h3>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
            }`}
          >
            ✕
          </button>
        </div>
        <div className={`p-6 space-y-3 text-sm ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="opacity-60">时间：</span>
              <div className="mt-1">{formatTime(log.time || log.timestamp || log.date)}</div>
            </div>
            <div>
              <span className="opacity-60">IP地址：</span>
              <div className="mt-1 font-mono">{log.ip || '-'}</div>
            </div>
            <div>
              <span className="opacity-60">来源：</span>
              <div className="mt-1 break-all">{log.referer || '-'}</div>
            </div>
            {log.rating !== undefined && (
              <div>
                <span className="opacity-60">评级：</span>
                <div className="mt-1">{log.rating ?? '-'}</div>
              </div>
            )}
          </div>
          <div>
            <span className="opacity-60">URL：</span>
            <div className="mt-1 break-all font-mono text-xs bg-neutral-800/50 dark:bg-neutral-800/30 p-2 rounded">
              {log.url || '-'}
            </div>
          </div>
          {log.total !== undefined && (
            <div>
              <span className="opacity-60">访问次数：</span>
              <div className="mt-1">{log.total}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  try { 
    return JSON.parse(text); 
  } catch { 
    throw new Error(text || `请求失败 ${res.status}`); 
  }
}

export default function AdminLogsPage() {
  const { isDark } = useTheme();
  const pathname = usePathname();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('time');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pageSize = 20;

  // 加载日志数据
  const load = useCallback(async (pageNum = 0) => {
    setLoading(true);
    try {
      // 优先尝试使用 POST 接口（支持分页）
      const url = "/api/admin/log";
      const body = { page: pageNum, query: query.trim() || null };
      
      let data;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(text || `请求失败 ${res.status}`);
        }
      } catch (e) {
        // 如果POST失败，尝试GET接口
        const candidates = ["/api/admin/logs", "/api/admin/records"];
        let found = false;
        for (const candidate of candidates) {
          try {
            data = await fetchJSON(candidate);
            found = true;
            break;
          } catch {}
        }
        if (!found) throw e;
      }

      // 处理不同的响应格式
      const list = Array.isArray(data?.data) 
        ? data.data 
        : Array.isArray(data?.list) 
          ? data.list 
          : Array.isArray(data) 
            ? data 
            : [];
      
      setRows(list);
      setTotal(data?.total ?? list.length);
    } catch (e) {
      toast.error(e?.message || "加载失败");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  // 排序和筛选
  const processedRows = useMemo(() => {
    let result = [...rows];
    
    // 搜索筛选
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((r) => 
        JSON.stringify(r).toLowerCase().includes(q)
      );
    }
    
    // 排序
    result.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'time':
          aVal = new Date(a.time || a.timestamp || a.date || 0).getTime();
          bVal = new Date(b.time || b.timestamp || b.date || 0).getTime();
          break;
        case 'ip':
          aVal = (a.ip || '').toLowerCase();
          bVal = (b.ip || '').toLowerCase();
          break;
        case 'url':
          aVal = (a.url || '').toLowerCase();
          bVal = (b.url || '').toLowerCase();
          break;
        default:
          aVal = a[sortBy] || '';
          bVal = b[sortBy] || '';
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    
    return result;
  }, [rows, query, sortBy, sortOrder]);

  // 分页
  const totalPages = Math.ceil(total / pageSize);
  const paginatedRows = processedRows.slice(page * pageSize, (page + 1) * pageSize);

  // 切换排序
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // 查看详情
  const handleViewDetail = (log) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  // 复制到剪贴板
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制");
    } catch {
      toast.error("复制失败");
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
        <div className="flex items-center gap-2 flex-wrap">
          <Tab href="/admin" active={pathname === "/admin"}>图库</Tab>
          <Tab href="/admin/logs" active={pathname?.startsWith("/admin/log")}>日志</Tab>
          <div className="ml-3 text-xs opacity-70">
            共 {total || processedRows.length} 条
            {query && `（筛选后：${processedRows.length} 条）`}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-2 rounded-xl border px-3 h-9 ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`}>
            <span className="text-xs opacity-60">🔍</span>
            <input
              className="bg-transparent outline-none text-sm w-48"
              placeholder="搜索关键字..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => load(page)} 
            disabled={loading} 
            className={`h-9 px-3 rounded-xl text-sm text-white transition ${loading ? 'bg-indigo-500/70 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}
          >
            {loading ? '刷新中…' : '🔄 刷新'}
          </button>
        </div>
      </div>

      {/* 日志表格 */}
      <div className={`mx-auto max-w-7xl mt-5 rounded-2xl overflow-hidden border ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
        {/* 表头 */}
        <div className={`grid grid-cols-12 text-xs font-medium px-4 py-3 ${isDark ? 'bg-neutral-900/70' : 'bg-white/80'}`}>
          <div 
            className="col-span-3 cursor-pointer select-none flex items-center gap-1 hover:opacity-80"
            onClick={() => handleSort('time')}
          >
            时间 {sortBy === 'time' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div 
            className="col-span-2 cursor-pointer select-none flex items-center gap-1 hover:opacity-80"
            onClick={() => handleSort('ip')}
          >
            IP地址 {sortBy === 'ip' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div className="col-span-2">来源</div>
          <div 
            className="col-span-4 cursor-pointer select-none flex items-center gap-1 hover:opacity-80"
            onClick={() => handleSort('url')}
          >
            URL {sortBy === 'url' && (sortOrder === 'asc' ? '↑' : '↓')}
          </div>
          <div className="col-span-1 text-center">操作</div>
        </div>
        
        {/* 表格内容 */}
        <div className={`divide-y ${isDark ? 'divide-neutral-800/70' : 'divide-neutral-200/70'}`}>
          {loading && paginatedRows.length === 0 ? (
            // 骨架屏
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} isDark={isDark} />
            ))
          ) : paginatedRows.length > 0 ? (
            paginatedRows.map((r, i) => (
              <div 
                key={r.id || i} 
                className={`grid grid-cols-12 px-4 py-3 text-xs transition hover:opacity-90 ${
                  isDark ? 'bg-neutral-900/40 hover:bg-neutral-900/60' : 'bg-white hover:bg-neutral-50'
                }`}
              >
                <div className="col-span-3 break-all opacity-90">
                  {formatTime(r.time || r.timestamp || r.date)}
                </div>
                <div className="col-span-2 break-all opacity-80 font-mono text-xs">
                  {r.ip || '-'}
                </div>
                <div className="col-span-2 break-all opacity-80 text-xs truncate" title={r.referer || '-'}>
                  {r.referer ? (r.referer.length > 30 ? r.referer.substring(0, 30) + '...' : r.referer) : '-'}
                </div>
                <div className="col-span-4 break-all opacity-80 text-xs truncate font-mono" title={r.url || '-'}>
                  {r.url ? (r.url.length > 50 ? r.url.substring(0, 50) + '...' : r.url) : '-'}
                </div>
                <div className="col-span-1 flex items-center justify-center gap-1">
                  <button
                    onClick={() => handleViewDetail(r)}
                    className={`px-2 py-1 rounded text-xs transition ${
                      isDark 
                        ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400' 
                        : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600'
                    }`}
                    title="查看详情"
                  >
                    详情
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className={`px-4 py-12 text-center text-sm opacity-70 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              {query ? '没有找到匹配的日志' : '暂无日志数据'}
            </div>
          )}
        </div>
      </div>

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className={`mx-auto max-w-7xl mt-6 flex items-center justify-center gap-2 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className={`px-4 py-2 rounded-xl text-sm transition ${
              page === 0
                ? 'opacity-50 cursor-not-allowed'
                : isDark
                  ? 'bg-neutral-800 hover:bg-neutral-700'
                  : 'bg-white hover:bg-neutral-100'
            }`}
          >
            上一页
          </button>
          <div className="text-sm">
            第 {page + 1} / {totalPages} 页
          </div>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className={`px-4 py-2 rounded-xl text-sm transition ${
              page >= totalPages - 1
                ? 'opacity-50 cursor-not-allowed'
                : isDark
                  ? 'bg-neutral-800 hover:bg-neutral-700'
                  : 'bg-white hover:bg-neutral-100'
            }`}
          >
            下一页
          </button>
        </div>
      )}

      {/* 日志详情模态框 */}
      <LogModal
        log={selectedLog}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isDark={isDark}
      />

      <ToastContainer position="top-right" autoClose={2200} theme={isDark ? 'dark' : 'light'} />
    </main>
  );
}
