"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
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

// 加载骨架屏
function SkeletonCard({ isDark }) {
  return (
    <div className={`rounded-2xl border p-3 animate-pulse ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/90 border-neutral-200'}`}>
      <div className={`w-full h-40 rounded-xl ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>
      <div className={`mt-3 h-4 rounded ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className={`h-9 flex-1 rounded-xl ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>
        <div className={`h-9 flex-1 rounded-xl ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}></div>
      </div>
    </div>
  );
}

// 转换图片URL为可访问的完整路径
function getImageUrl(url) {
  if (!url) return '';
  
  // 如果已经是完整的URL（http/https开头），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // 如果是相对路径，需要添加 /api 前缀
  if (url.startsWith('/rfile/') || url.startsWith('/file/') || url.startsWith('/cfile/')) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/api${url}`;
  }
  
  // 如果已经包含 /api，直接返回（添加 origin 如果有需要）
  if (url.startsWith('/api/')) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${url}`;
  }
  
  // 其他情况，尝试添加 origin
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return url.startsWith('/') ? `${origin}${url}` : url;
}

// 获取文件类型
function getFileType(url, type) {
  if (!url && !type) return 'unknown';
  const urlLower = (url || '').toLowerCase();
  const typeLower = String(type || '').toLowerCase();
  
  if (typeLower.startsWith('video/') || urlLower.match(/\.(mp4|webm|ogg|avi|mov)$/)) return 'video';
  if (typeLower.startsWith('image/') || urlLower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/)) return 'image';
  if (urlLower.match(/\.(html|htm)$/)) return 'html';
  if (urlLower.match(/\.(pdf)$/)) return 'pdf';
  if (urlLower.match(/\.(txt|md)$/)) return 'text';
  if (urlLower.match(/\.(js|jsx|ts|tsx)$/)) return 'code';
  if (urlLower.match(/\.(css)$/)) return 'css';
  return 'unknown';
}

// 文件预览模态框
function ImagePreviewModal({ item, isOpen, onClose, isDark }) {
  if (!isOpen || !item) return null;
  
  const fileType = getFileType(item.url, item.type);
  const fileUrl = getImageUrl(item.url);
  
  const renderPreview = () => {
    switch (fileType) {
      case 'video':
        return (
          <video src={fileUrl} className="w-full h-auto max-h-[70vh] rounded-lg" controls />
        );
      case 'html':
        return (
          <iframe 
            src={fileUrl} 
            className="w-full h-[70vh] rounded-lg border"
            title="HTML Preview"
            sandbox="allow-same-origin allow-scripts"
          />
        );
      case 'pdf':
        return (
          <iframe 
            src={fileUrl} 
            className="w-full h-[70vh] rounded-lg border"
            title="PDF Preview"
          />
        );
      case 'text':
      case 'code':
      case 'css':
        return (
          <div className={`w-full h-[70vh] rounded-lg border overflow-auto p-4 ${
            isDark ? 'bg-neutral-800 text-neutral-100' : 'bg-white text-neutral-900'
          }`}>
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {fileUrl ? '加载中...' : '无法预览此文件类型'}
            </pre>
          </div>
        );
      case 'unknown':
        return (
          <div className={`w-full h-[50vh] rounded-lg border flex items-center justify-center ${
            isDark ? 'bg-neutral-800' : 'bg-neutral-100'
          }`}>
            <div className="text-center">
              <div className="text-4xl mb-4">📄</div>
              <div className={`text-sm ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                不支持预览此文件类型
              </div>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`mt-4 inline-block px-4 py-2 rounded-lg text-sm ${
                  isDark 
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                在新标签页打开
              </a>
            </div>
          </div>
        );
      default: // image
        return (
          <div className="relative w-full aspect-video bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden">
            <Image 
              src={fileUrl} 
              alt={item.name || 'preview'} 
              fill 
              className="object-contain"
              unoptimized
            />
          </div>
        );
    }
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={`max-w-5xl w-full rounded-2xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-neutral-800' : 'border-neutral-200'
        }`}>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            预览 - {fileType === 'html' ? 'HTML' : fileType === 'pdf' ? 'PDF' : fileType === 'video' ? '视频' : fileType === 'image' ? '图片' : '文件'}
          </h3>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
              isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-100 text-neutral-600'
            }`}
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          <div className="mb-4">
            {renderPreview()}
          </div>
          <div className={`space-y-2 text-sm ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
            <div>
              <span className="opacity-60">URL：</span>
              <div className="mt-1 break-all font-mono text-xs bg-neutral-800/50 dark:bg-neutral-800/30 p-2 rounded">
                {item.url}
              </div>
            </div>
            {item.rating !== undefined && (
              <div>
                <span className="opacity-60">评级：</span>
                <span className="ml-2">{item.rating ?? '-'}</span>
              </div>
            )}
            {item.total !== undefined && (
              <div>
                <span className="opacity-60">访问次数：</span>
                <span className="ml-2">{item.total}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { isDark } = useTheme();
  const pathname = usePathname();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [previewItem, setPreviewItem] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const pageSize = 20;

  // 加载数据
  const load = useCallback(async (pageNum = 0) => {
    setLoading(true);
    try {
      // 使用POST接口支持分页和查询
      const res = await fetch("/api/admin/list", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          page: pageNum, 
          query: query.trim() || null 
        })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        toast.error(`获取列表失败：${text?.slice(0, 60) || res.status}`);
        return;
      }
      
      // 处理不同的响应格式
      const list = Array.isArray(data?.data) 
        ? data.data 
        : Array.isArray(data?.list) 
          ? data.list 
          : Array.isArray(data) 
            ? data 
            : [];
      
      setItems(list);
      setTotal(data?.total ?? list.length);
      setSelectedItems(new Set()); // 切换页面时清空选择
    } catch (e) {
      toast.error(e?.message || "加载失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load(page);
  }, [load, page]);

  // 筛选
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((x) => (x.name || x.url || "").toLowerCase().includes(q));
  }, [items, query]);

  // 复制链接
  const copy = async (url) => {
    try {
      // 将相对路径转换为完整的URL（包含域名）
      const fullUrl = getImageUrl(url);
      await navigator.clipboard.writeText(fullUrl); 
      toast.success("已复制链接"); 
    } catch { 
      toast.error("复制失败"); 
    }
  };

  // 删除单个
  const del = async (it) => {
    if (!confirm(`确定要删除这张图片吗？\n${it.url}`)) return;
    
    try {
      const url = it.url || it.id || it._id || it.key;
      const res = await fetch("/api/admin/delete", { 
        method: "DELETE",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: url })
      });
      
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "删除失败");
      
      toast.success("已删除");
      setItems((arr) => arr.filter((x) => (x.url || x.id || x._id || x.key) !== url));
      setSelectedItems((set) => {
        const newSet = new Set(set);
        newSet.delete(url);
        return newSet;
      });
    } catch (e) {
      toast.error(e?.message || "删除失败");
    }
  };

  // 批量删除
  const batchDelete = async () => {
    if (selectedItems.size === 0) {
      toast.info("请先选择要删除的图片");
      return;
    }
    
    if (!confirm(`确定要删除选中的 ${selectedItems.size} 张图片吗？`)) return;
    
    const itemsToDelete = Array.from(selectedItems);
    let successCount = 0;
    let failCount = 0;
    
    for (const url of itemsToDelete) {
      try {
        const res = await fetch("/api/admin/delete", { 
          method: "DELETE",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: url })
        });
        const data = await res.json();
        if (res.ok && data?.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }
    
    if (successCount > 0) {
      toast.success(`已删除 ${successCount} 张图片${failCount > 0 ? `，失败 ${failCount} 张` : ''}`);
      load(page); // 重新加载当前页
    } else {
      toast.error("删除失败");
    }
  };

  // 切换选择
  const toggleSelect = (url) => {
    setSelectedItems((set) => {
      const newSet = new Set(set);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedItems.size === filtered.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filtered.map(it => it.url || it.id || it._id || it.key)));
    }
  };

  // 预览
  const handlePreview = (it) => {
    setPreviewItem(it);
    setIsPreviewOpen(true);
  };

  // 分页
  const totalPages = Math.ceil(total / pageSize);
  const paginatedItems = filtered.slice(page * pageSize, (page + 1) * pageSize);

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
          <Link 
            href="/" 
            className={`px-3 h-9 inline-flex items-center rounded-xl text-sm border transition ${
              isDark 
                ? 'bg-transparent border-neutral-800 hover:bg-neutral-900 text-neutral-300' 
                : 'bg-transparent border-neutral-300 hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            🏠 首页
          </Link>
          <Tab href="/admin" active={pathname === "/admin"}>图库</Tab>
          <Tab href="/admin/logs" active={pathname?.startsWith("/admin/log")}>日志</Tab>
          <div className="ml-3 text-xs opacity-70">
            共 {total || filtered.length} 条
            {query && `（筛选后：${filtered.length} 条）`}
            {selectedItems.size > 0 && ` | 已选 ${selectedItems.size} 条`}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedItems.size > 0 && (
            <button
              onClick={batchDelete}
              className="h-9 px-3 rounded-xl text-sm text-white bg-rose-600 hover:bg-rose-500 transition"
            >
              批量删除 ({selectedItems.size})
            </button>
          )}
          <div className={`flex items-center gap-2 rounded-xl border px-3 h-9 ${isDark ? 'bg-neutral-900/70 border-neutral-800' : 'bg-white/80 border-neutral-200'}`}>
            <span className="text-xs opacity-60">🔍</span>
            <input
              className="bg-transparent outline-none text-sm w-48"
              placeholder="搜索链接..."
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

      {/* 列表 */}
      {loading && paginatedItems.length === 0 ? (
        // 骨架屏
        <div className="mx-auto max-w-6xl mt-5 grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} isDark={isDark} />
          ))}
        </div>
      ) : paginatedItems.length > 0 ? (
        <>
          {/* 全选按钮 */}
          <div className="mx-auto max-w-6xl mt-5 mb-2">
            <button
              onClick={toggleSelectAll}
              className={`px-3 py-1 rounded-lg text-xs transition ${
                selectedItems.size === filtered.length
                  ? isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'
                  : isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              {selectedItems.size === filtered.length ? '取消全选' : '全选'}
            </button>
          </div>
          
          <div className="mx-auto max-w-6xl mt-2 grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {paginatedItems.map((it, idx) => {
              const itemUrl = it.url || it.id || it._id || it.key;
              const isSelected = selectedItems.has(itemUrl);
              const isVideo = String(it.type || '').startsWith('video/');
              
              return (
                <div 
                  key={idx} 
                  className={`rounded-2xl border p-3 transition relative group ${
                    isSelected 
                      ? isDark ? 'bg-indigo-900/30 border-indigo-600' : 'bg-indigo-50 border-indigo-400'
                      : isDark ? 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700' : 'bg-white/90 border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {/* 选择框 */}
                  <div className="absolute top-2 right-2 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(itemUrl)}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </div>
                  
                  {/* 文件预览 */}
                  <div 
                    className="relative w-full h-40 overflow-hidden rounded-xl border border-black/10 bg-neutral-100 dark:bg-neutral-800 cursor-pointer flex items-center justify-center"
                    onClick={() => handlePreview(it)}
                  >
                    {(() => {
                      const fileType = getFileType(it.url, it.type);
                      switch (fileType) {
                        case 'video':
                          return (
                            <>
                              <video src={getImageUrl(it.url)} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition"></div>
                            </>
                          );
                        case 'image':
                          try {
                            return (
                              <>
                                <Image 
                                  src={getImageUrl(it.url)} 
                                  alt={it.name || `item-${idx}`} 
                                  fill 
                                  className="object-cover transition group-hover:scale-105"
                                  unoptimized
                                  onError={(e) => {
                                    // 如果图片加载失败，显示文件类型图标
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition"></div>
                              </>
                            );
                          } catch {
                            return (
                              <div className="text-center">
                                <div className="text-4xl mb-2">🖼️</div>
                                <div className="text-xs opacity-70">图片</div>
                              </div>
                            );
                          }
                        case 'html':
                          return (
                            <div className="text-center">
                              <div className="text-4xl mb-2">🌐</div>
                              <div className="text-xs opacity-70">HTML</div>
                            </div>
                          );
                        case 'pdf':
                          return (
                            <div className="text-center">
                              <div className="text-4xl mb-2">📄</div>
                              <div className="text-xs opacity-70">PDF</div>
                            </div>
                          );
                        case 'text':
                        case 'code':
                        case 'css':
                          return (
                            <div className="text-center">
                              <div className="text-4xl mb-2">📝</div>
                              <div className="text-xs opacity-70">文本/代码</div>
                            </div>
                          );
                        default:
                          return (
                            <div className="text-center">
                              <div className="text-4xl mb-2">📎</div>
                              <div className="text-xs opacity-70">文件</div>
                            </div>
                          );
                      }
                    })()}
                  </div>
                  
                  {/* URL显示 */}
                  <div className="mt-3 text-xs break-all opacity-80 h-10 overflow-hidden line-clamp-2" title={it.url}>
                    {it.url}
                  </div>
                  
                  {/* 操作按钮 */}
                  <div className="mt-3 flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); copy(it.url); }} 
                      className="flex-1 h-9 px-3 rounded-xl text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition"
                    >
                      复制
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); del(it); }} 
                      className="flex-1 h-9 px-3 rounded-xl text-sm text-white bg-rose-600 hover:bg-rose-500 transition"
                    >
                      删除
                    </button>
                  </div>
                  
                  {/* 统计信息 */}
                  {(it.total !== undefined || it.rating !== undefined) && (
                    <div className="mt-2 flex items-center gap-2 text-xs opacity-60">
                      {it.total !== undefined && <span>访问: {it.total}</span>}
                      {it.rating !== undefined && <span>评级: {it.rating}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className={`mx-auto max-w-6xl mt-12 text-center ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          <div className="text-4xl mb-4">📷</div>
          <div className="text-lg mb-2">{query ? '没有找到匹配的图片' : '暂无图片'}</div>
          <div className="text-sm opacity-70">{query ? '试试其他关键词' : '上传一些图片开始使用吧'}</div>
        </div>
      )}

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className={`mx-auto max-w-6xl mt-6 flex items-center justify-center gap-2 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
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

      {/* 图片预览模态框 */}
      <ImagePreviewModal
        item={previewItem}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        isDark={isDark}
      />

      <ToastContainer position="top-right" autoClose={2200} theme={isDark ? 'dark' : 'light'} />
    </main>
  );
}
