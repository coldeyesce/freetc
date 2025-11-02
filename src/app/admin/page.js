"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ToastContainer, toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightArrowLeft,
  faChartLine,
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
        throw new Error("服务异常，请稍后再试");
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
        value: searchQuery ? searchQuery : "未筛选",
        description: searchQuery ? "当前筛选结果" : "显示全部数据",
      },
    ],
    [currentPage, totalItems, totalPages, searchQuery],
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-160px] h-[360px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[160px]" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[420px] w-[420px] rounded-full bg-blue-600/25 blur-[200px]" />
        <div className="absolute bottom-20 left-[-140px] h-[260px] w-[260px] rounded-full bg-indigo-500/25 blur-[180px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-4 py-12">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
              <FontAwesomeIcon icon={faChartLine} className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-300">Admin Console</p>
              <h1 className="mt-1 text-2xl font-semibold">素材管理后台</h1>
              <p className="mt-1 text-sm text-slate-300">
                快速检索、审阅与维护上传的文件，保持平台高效整洁。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-blue-400/60">
              <FontAwesomeIcon icon={faHouse} className="mr-2 h-4 w-4" />
              返回首页
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/30 transition hover:scale-[1.02]"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="mr-2 h-4 w-4" />
              退出登录
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-[0_25px_80px_-50px_rgba(59,130,246,0.4)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              <p className="mt-1 text-xs text-slate-300">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="relative flex-1 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-2xl shadow-[0_35px_120px_-60px_rgba(14,116,244,0.45)]">
          <LoadingOverlay loading={loading} />
          <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <form onSubmit={handleSearch} className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative flex-1">
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="输入文件名或关键词"
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/10 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-400 transition focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02]"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
                  搜索
                </button>
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-blue-400/60"
                >
                  <FontAwesomeIcon icon={faArrowRightArrowLeft} className="h-4 w-4" />
                  清空筛选
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
            <Table data={listData} />
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-500/20 px-4 py-1 text-xs font-medium text-blue-200">
                {totalItems} 条记录
              </span>
              <span className="text-xs text-slate-300">第 {currentPage} / {totalPages} 页</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handlePrevPage}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-slate-100 transition hover:border-blue-400/60 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPage === 1}
              >
                上一页
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-slate-100 transition hover:border-blue-400/60 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <span className="text-xs text-slate-300">跳转到</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPage}
                  onChange={(event) => setJumpPage(event.target.value)}
                  className="h-8 w-16 rounded-xl border border-white/10 bg-slate-900/60 px-2 text-center text-xs text-slate-100 focus:border-blue-400/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleJumpPage}
                  className="rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-3 py-1 text-xs font-semibold text-white shadow-md transition hover:scale-[1.02]"
                >
                  GO
                </button>
              </div>
            </div>
          </div>
        </section>

        <ToastContainer position="bottom-right" theme="dark" />
      </div>
    </main>
  );
}
