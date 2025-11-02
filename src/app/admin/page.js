"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ToastContainer, toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightArrowLeft,
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
    <main className="relative min-h-screen overflow-hidden bg-[#050b1e] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-220px] h-[420px] w-[560px] -translate-x-1/2 rounded-full bg-[#1f52ff]/15 blur-[200px]" />
        <div className="absolute right-[-180px] bottom-[-160px] h-[460px] w-[460px] rounded-full bg-[#21d4fd]/20 blur-[220px]" />
        <div className="absolute left-[-160px] bottom-12 h-[320px] w-[320px] rounded-full bg-[#8850ff]/18 blur-[200px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-4 py-12">
        <header className="flex flex-col gap-6 rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl shadow-[0_25px_90px_-40px_rgba(46,120,255,0.55)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-xl shadow-blue-500/40">
              <FontAwesomeIcon icon={faGaugeHigh} className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-blue-300/90">Admin Console</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-wide">素材管理后台</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                快速检索、审阅与维护上传的文件，保持平台高效整洁。深色界面更专注，配合鲜明的操作按钮，随时掌控素材动态。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm text-slate-100 transition hover:border-blue-400/70"
            >
              <FontAwesomeIcon icon={faHouse} className="h-4 w-4" />
              返回首页
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_14px_45px_-20px_rgba(37,99,235,0.9)] transition hover:scale-[1.03]"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-[0_30px_90px_-60px_rgba(14,116,244,0.45)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-300/90">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold">{item.value}</p>
              <p className="mt-1 text-xs text-slate-300/80">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="relative flex-1 rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-2xl shadow-[0_40px_140px_-80px_rgba(32,118,255,0.55)]">
          <LoadingOverlay loading={loading} />
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
                  className="h-14 w-full rounded-[20px] border border-white/10 bg-white/10 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-400 transition focus:border-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                />
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-[18px] bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.7)] transition hover:scale-[1.03]"
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="h-4 w-4" />
                  搜索
                </button>
                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="flex items-center gap-2 rounded-[18px] border border-white/15 bg-white/10 px-5 py-2 text-sm text-slate-100 transition hover:border-blue-400/70"
                >
                  <FontAwesomeIcon icon={faArrowRightArrowLeft} className="h-4 w-4" />
                  清空筛选
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6">
            <Table data={listData} />
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-[22px] border border-white/10 bg-white/5 p-5 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between">
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
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-slate-100 transition hover:border-blue-400/70 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPage === 1}
              >
                上一页
              </button>
              <button
                type="button"
                onClick={handleNextPage}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-slate-100 transition hover:border-blue-400/70 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5">
                <span className="text-xs text-slate-300">跳转到</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpPage}
                  onChange={(event) => setJumpPage(event.target.value)}
                  className="h-8 w-16 rounded-[14px] border border-white/15 bg-slate-950/60 px-2 text-center text-xs text-slate-100 focus:border-blue-400/70 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleJumpPage}
                  className="rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-3 py-1 text-xs font-semibold text-white shadow-[0_12px_32px_-16px_rgba(59,130,246,0.7)] transition hover:scale-[1.04]"
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
