"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ToastContainer, toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightArrowLeft,
  faCircleHalfStroke,
  faGaugeHigh,
  faHouse,
  faMagnifyingGlass,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import Table from "@/components/Table";
import LoadingOverlay from "@/components/LoadingOverlay";

const REQUEST_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
};

export default function Admin() {
  const [listData, setListData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [jumpPage, setJumpPage] = useState("1");
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState("dark");

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
  const heroGlow = isDark
    ? "from-blue-500/25 via-indigo-500/15 to-transparent"
    : "from-blue-300/40 via-cyan-200/25 to-transparent";
  const heroGlowRight = isDark ? "bg-indigo-600/25" : "bg-indigo-200/40";
  const heroGlowLeft = isDark ? "bg-cyan-500/20" : "bg-cyan-200/40";
  const surfaceClass = isDark ? "border-white/10 bg-white/5 backdrop-blur" : "border-slate-200 bg-white shadow-sm";
  const mutedTextClass = isDark ? "text-slate-300" : "text-slate-600";
  const inputClass = isDark
    ? "h-12 w-full rounded-[18px] border border-white/15 bg-white/10 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-400 focus:border-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
    : "h-12 w-full rounded-[18px] border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20";
  const subtleButtonClass = isDark
    ? "flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-blue-400/70"
    : "flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-blue-500/60";
  const primaryButtonClass =
    "flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_45px_-18px_rgba(37,99,235,0.75)] transition hover:scale-[1.03]";
  const badgeClass = isDark
    ? "rounded-full bg-blue-500/20 px-4 py-1 text-xs font-medium text-blue-200"
    : "rounded-full bg-blue-100 px-4 py-1 text-xs font-medium text-blue-600";

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const fetchList = useCallback(async (page, query) => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/list", {
        method: "POST",
        headers: REQUEST_HEADERS,
        body: JSON.stringify({
          page: Math.max(page - 1, 0),
          query,
        }),
      });

      if (!response.ok) {
        throw new Error("服务器异常，请稍后再试");
      }

      const data = await response.json();

      if (!data?.success) {
        throw new Error(data?.message || "获取数据失败");
      }

      setListData(Array.isArray(data.data) ? data.data : []);

      const total = Number(data.total) || 0;
      setTotalItems(total);
      const computedPages = Math.max(Math.ceil(total / 10), 1);
      setTotalPages(computedPages);
    } catch (error) {
      toast.error(error.message || "获取数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(currentPage, searchQuery);
  }, [currentPage, searchQuery, fetchList]);

  useEffect(() => {
    setJumpPage(String(currentPage));
  }, [currentPage]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleJumpPage = () => {
    const parsedPage = Number(jumpPage);
    if (!Number.isInteger(parsedPage) || parsedPage < 1 || parsedPage > totalPages) {
      toast.error("请输入有效的页码");
      return;
    }
    setCurrentPage(parsedPage);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setSearchQuery(searchInput.trim());
  };

  const handleResetSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const stats = useMemo(
    () => [
      {
        label: "素材总量",
        value: totalItems.toLocaleString("zh-CN"),
        description: "包含图片、视频与其他文件",
      },
      {
        label: "当前页码",
        value: `${currentPage}/${totalPages}`,
        description: "每页显示 10 条记录",
      },
      {
        label: "搜索关键词",
        value: searchQuery || "未筛选",
        description: searchQuery ? "当前筛选结果" : "显示全部数据",
      },
    ],
    [currentPage, totalItems, totalPages, searchQuery],
  );

  return (
    <main className={`min-h-screen w-full overflow-x-hidden ${pageBackground}`}>
      <div className="relative flex min-h-screen flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={`absolute left-1/2 top-[-220px] h-[420px] w-[540px] -translate-x-1/2 rounded-full bg-gradient-to-br ${heroGlow} blur-[180px]`} />
          <div className={`absolute -bottom-24 right-12 h-[300px] w-[300px] rounded-full ${heroGlowRight} blur-[180px]`} />
          <div className={`absolute bottom-28 left-12 h-[240px] w-[240px] rounded-full ${heroGlowLeft} blur-[150px]`} />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10">
          <header className={`flex flex-col gap-5 rounded-[28px] border ${surfaceClass} p-6 md:flex-row md:items-center md:justify-between`}>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
                <FontAwesomeIcon icon={faGaugeHigh} className="h-6 w-6" />
              </span>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-300/90">Admin Console</p>
                <h1 className="text-2xl font-semibold tracking-wide">素材管理后台</h1>
                <p className={`text-xs ${mutedTextClass}`}>
                  快速检索、审阅与维护上传的文件，保持平台高效整洁。主题与首页同步，在明暗之间自由切换。
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={toggleTheme} className={subtleButtonClass}>
                <FontAwesomeIcon icon={faCircleHalfStroke} className="h-4 w-4" />
                切换为{isDark ? "浅色" : "暗色"}主题
              </button>
              <Link href="/" className={subtleButtonClass}>
                <FontAwesomeIcon icon={faHouse} className="h-4 w-4" />
                返回首页
              </Link>
              <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={primaryButtonClass}>
                <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
                退出登录
              </button>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className={`flex flex-col gap-2 rounded-[24px] border ${surfaceClass} p-5`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-300/80">{item.label}</p>
                <p className="text-2xl font-semibold">{item.value}</p>
                <p className={`text-xs ${mutedTextClass}`}>{item.description}</p>
              </div>
            ))}
          </section>

          <section className={`rounded-[28px] border ${surfaceClass} p-6`}>
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <form onSubmit={handleSearch} className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="relative flex-1">
                  <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="输入文件名或关键词"
                    className={inputClass}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button type="submit" className={primaryButtonClass}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
                    搜索
                  </button>
                  <button type="button" onClick={handleResetSearch} className={subtleButtonClass}>
                    <FontAwesomeIcon icon={faArrowRightArrowLeft} className="h-4 w-4" />
                    清空筛选
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-6">
              <div className="relative">
                <LoadingOverlay loading={loading} />
                <Table data={listData} isDark={isDark} />
              </div>

              <div className={`mt-6 flex flex-col gap-4 rounded-[20px] border ${surfaceClass} p-4 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="flex items-center gap-3">
                  <span className={badgeClass}>{totalItems} 条记录</span>
                  <span className={`text-xs ${mutedTextClass}`}>第 {currentPage} / {totalPages} 页</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    className={`${subtleButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                    disabled={currentPage === 1}
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPage}
                    className={`${subtleButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                  </button>
                  <div
                    className={`flex items-center gap-2 rounded-full border ${isDark ? "border-white/15 bg-white/8" : "border-slate-200 bg-slate-100"} px-3 py-1.5`}
                  >
                    <span className={`text-xs ${mutedTextClass}`}>跳转到</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={jumpPage}
                      onChange={(event) => setJumpPage(event.target.value)}
                      className={`h-8 w-16 rounded-[14px] border px-2 text-center text-xs focus:outline-none ${
                        isDark
                          ? "border-white/15 bg-slate-950/60 text-slate-100 focus:border-blue-400/70"
                          : "border-slate-200 bg-white text-slate-700 focus:border-blue-400/60"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleJumpPage}
                      className="rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-3 py-1 text-xs font-semibold text-white shadow-[0_12px_35px_-18px_rgba(37,99,235,0.7)] transition hover:scale-[1.03]"
                    >
                      GO
                    </button>
                  </div>
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
