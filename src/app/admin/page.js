"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ToastContainer, toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightArrowLeft,
  faChartLine,
  faCircleHalfStroke,
  faGaugeHigh,
  faHouse,
  faMagnifyingGlass,
  faPlus,
  faRightFromBracket,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import Table from "@/components/Table";
import LoadingOverlay from "@/components/LoadingOverlay";

const REQUEST_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
};

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const PRIMARY_TAGS = ["all", "file", "image", "video"];

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
  const [pageSize, setPageSize] = useState(5);
  const [availableTags, setAvailableTags] = useState(PRIMARY_TAGS);
  const [activeTag, setActiveTag] = useState("all");
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const tagInputRef = useRef(null);

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
  useEffect(() => {
    if (isAddingTag && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [isAddingTag]);

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
  const selectClass = isDark
    ? "rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-slate-100 focus:border-blue-400/70 focus:outline-none"
    : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500/60 focus:outline-none";
  const tagButtonClass = isDark
    ? "flex items-center rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs text-slate-200 transition hover:border-blue-400/70 hover:text-blue-100"
    : "flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs text-slate-700 transition hover:border-blue-500/60 hover:text-blue-600";
  const tagButtonActiveClass = isDark
    ? "border-blue-400/80 bg-blue-500/20 text-blue-100 shadow-[0_12px_28px_-18px_rgba(59,130,246,0.55)]"
    : "border-blue-500/70 bg-blue-500/10 text-blue-600 shadow-[0_12px_28px_-18px_rgba(59,130,246,0.35)]";
  const tagInputClass = isDark
    ? "w-48 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-400 focus:border-blue-400/70 focus:outline-none"
    : "w-48 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-blue-500/60 focus:outline-none";
  const tagAddButtonClass = isDark
    ? "rounded-full bg-blue-500/80 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-blue-400/90"
    : "rounded-full bg-blue-500 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-blue-600";
  const tagCancelButtonClass = isDark
    ? "rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-200 transition hover:border-blue-400/70"
    : "rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 transition hover:border-blue-500/60";
  const addTagTriggerClass = isDark
    ? "flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-white/25 bg-white/8 text-slate-200 transition hover:border-blue-400/70 hover:text-blue-100"
    : "flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-700 transition hover:border-blue-500/60 hover:text-blue-600";
  const tagRemoveButtonClass = isDark
    ? "absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white shadow hover:bg-rose-400"
    : "absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white shadow hover:bg-rose-400";
  const customTagButtonClass = `${tagButtonClass} pr-6`;
  const getTagLabel = (tag) => {
    switch (tag) {
      case "all":
        return "所有";
      case "image":
        return "图片";
      case "video":
        return "视频";
      case "file":
        return "文件";
      default:
        return tag;
    }
  };

  const registerAvailableTag = useCallback((tag) => {
    const value = typeof tag === "string" ? tag.trim() : "";
    if (!value || value === "all") return;
    setAvailableTags((prev) => {
      if (prev.includes(value)) return prev;
      return [...prev, value];
    });
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && Array.isArray(data.tags)) {
        const base = new Set(PRIMARY_TAGS);
        data.tags.forEach((tag) => base.add(tag));
        setAvailableTags(Array.from(base));
      }
    } catch (error) {
      console.error("fetch tags failed", error);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const fetchList = useCallback(async (page, query) => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/list", {
        method: "POST",
        headers: REQUEST_HEADERS,
        body: JSON.stringify({
          page: Math.max(page - 1, 0),
          query,
          size: pageSize,
          tag: activeTag === "all" ? "" : activeTag,
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
      fetchTags();

      const total = Number(data.total) || 0;
      setTotalItems(total);
      const computedPages = Math.max(Math.ceil(total / pageSize), 1);
      setTotalPages(computedPages);
    } catch (error) {
      toast.error(error.message || "获取数据失败");
    } finally {
      setLoading(false);
    }
  }, [pageSize, activeTag, fetchTags]);

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

  const handleRemoveTag = useCallback(
    async (tag) => {
      if (!tag || PRIMARY_TAGS.includes(tag)) return;
      try {
        const request = JSON.stringify({ tag, force: false });
        let response = await fetch("/api/admin/tags", {
          method: "DELETE",
          headers: REQUEST_HEADERS,
          body: request,
        });
        let data = await response.json();
        if (response.status === 409 && data?.requireConfirmation) {
          const count = data?.count ?? 0;
          const confirmed = window.confirm(`标签 "${tag}" 已关联 ${count} 个文件，确认删除吗？`);
          if (!confirmed) return;
          response = await fetch("/api/admin/tags", {
            method: "DELETE",
            headers: REQUEST_HEADERS,
            body: JSON.stringify({ tag, force: true }),
          });
          data = await response.json();
        }
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "删除标签失败");
        }
        toast.success("标签已删除");
        setAvailableTags((prev) => prev.filter((item) => item !== tag));
        if (activeTag === tag) {
          setActiveTag("all");
        }
        setCurrentPage(1);
        await fetchList(1, searchQuery);
      } catch (error) {
        toast.error(error.message || "删除标签失败");
      }
    },
    [activeTag, fetchList, searchQuery],
  );

  const handleResetSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setActiveTag("all");
    setNewTag("");
    setIsAddingTag(false);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (event) => {
    const value = Number(event.target.value);
    setPageSize(value);
    setCurrentPage(1);
  };
  const handleTagSelect = (tag) => {
    setActiveTag(tag);
    setCurrentPage(1);
  };

  const handleStartAddTag = () => {
    setNewTag("");
    setIsAddingTag(true);
  };

  const handleCancelAddTag = () => {
    setIsAddingTag(false);
    setNewTag("");
  };

  const handleAddTagFilter = async (event) => {
    event.preventDefault();
    const value = newTag.trim();
    if (!value) return;

    try {
      if (!PRIMARY_TAGS.includes(value)) {
        const response = await fetch("/api/admin/tags", {
          method: "POST",
          headers: REQUEST_HEADERS,
          body: JSON.stringify({ tag: value }),
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "新增标签失败");
        }
      }

      registerAvailableTag(value);
      await fetchTags();
      setActiveTag(value);
      setNewTag("");
      setIsAddingTag(false);
      setCurrentPage(1);
    } catch (error) {
      toast.error(error.message || "新增标签失败");
    }
  };

  const handleUpdateItemTags = useCallback(
    async (url, tags) => {
      const response = await fetch("/api/admin/tags", {
        method: "PATCH",
        headers: REQUEST_HEADERS,
        body: JSON.stringify({ url, tags }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "更新标签失败");
      }
      const storage = data.storage ?? data.storageString ?? "";
      setListData((prev) =>
        prev.map((item) => (item.url === url ? { ...item, tags: storage } : item)),
      );
      if (Array.isArray(data.tags)) {
        data.tags.forEach(registerAvailableTag);
      }
      fetchTags();
      return data;
    },
    [fetchTags, registerAvailableTag],
  );

  const handleAfterDelete = useCallback(
    (urls) => {
      if (!Array.isArray(urls) || urls.length === 0) return;
      const unique = Array.from(new Set(urls.filter(Boolean)));
      if (unique.length === 0) return;
      const nextTotal = Math.max(totalItems - unique.length, 0);
      const nextPages = Math.max(Math.ceil(nextTotal / pageSize), 1);
      const targetPage = Math.min(currentPage, nextPages);
      setTotalItems(nextTotal);
      setTotalPages(nextPages);
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      } else {
        void fetchList(targetPage, searchQuery);
      }
    },
    [currentPage, fetchList, pageSize, searchQuery, totalItems],
  );

  const customTags = useMemo(
    () => availableTags.filter((tag) => !PRIMARY_TAGS.includes(tag)),
    [availableTags],
  );
  const currentTagLabel = getTagLabel(activeTag);

  const stats = useMemo(
    () => {
      const filterValue = searchQuery
        ? `关键字：${searchQuery}`
        : activeTag === "all"
          ? "未使用筛选"
          : `标签：${currentTagLabel}`;
      const filterDescription = searchQuery
        ? activeTag === "all"
          ? "当前关键字筛选"
          : `关键字 + 标签：${currentTagLabel}`
        : activeTag === "all"
          ? "显示全部数据"
          : `当前标签：${currentTagLabel}`;
      return [
        {
          label: "素材总量",
          value: totalItems.toLocaleString("zh-CN"),
          description: "包含图片、视频与其他文件类型",
        },
        {
          label: "当前页码",
          value: `${currentPage}/${totalPages}`,
          description: `每页显示 ${pageSize} 条`,
        },
        {
          label: "筛选状态",
          value: filterValue,
          description: filterDescription,
        },
      ];
    },
    [activeTag, currentPage, currentTagLabel, pageSize, searchQuery, totalItems, totalPages],
  );

  return (
    <main className={`min-h-screen w-full overflow-x-hidden ${pageBackground}`}>
      <div className="relative flex min-h-screen flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={`absolute left-1/2 top-[-220px] h-[420px] w-[540px] -translate-x-1/2 rounded-full bg-gradient-to-br ${heroGlow} blur-[180px]`} />
          <div className={`absolute -bottom-24 right-12 h-[300px] w-[300px] rounded-full ${heroGlowRight} blur-[180px]`} />
          <div className={`absolute bottom-28 left-12 h-[240px] w-[240px] rounded-full ${heroGlowLeft} blur-[150px]`} />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 pt-0 pb-10">
          <header
            className={`rounded-[32px] border ${surfaceClass} p-6 ${
              isDark
                ? "bg-gradient-to-r from-slate-950/80 via-slate-900/60 to-slate-950/80"
                : "bg-gradient-to-r from-white via-blue-50/60 to-white"
            }`}
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
                  <FontAwesomeIcon icon={faGaugeHigh} className="h-6 w-6" />
                </span>
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.3em] text-blue-300/90">Admin Console</p>
                  <h1 className="text-2xl font-semibold tracking-wide">素材管理控制台</h1>
                  <p className={`text-xs ${mutedTextClass}`}>
                    快速检索、监控并维护已上传的素材，让平台高效有序。主题与首页同步，日夜模式随时切换。
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={toggleTheme} className={subtleButtonClass}>
                  <FontAwesomeIcon icon={faCircleHalfStroke} className="h-4 w-4" />
                  {`切换为${isDark ? "浅色" : "深色"}主题`}
                </button>
                <Link href="/admin/monitor" className={subtleButtonClass}>
                  <FontAwesomeIcon icon={faChartLine} className="h-4 w-4" />
                  查看监控面板
                </Link>
                <Link href="/" className={subtleButtonClass}>
                  <FontAwesomeIcon icon={faHouse} className="h-4 w-4" />
                  返回首页
                </Link>
                <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className={primaryButtonClass}>
                  <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
                  退出登录
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-300/80">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold">{item.value}</p>
                  <p className={`text-[11px] ${mutedTextClass}`}>{item.description}</p>
                </div>
              ))}
            </div>
          </header>
          <section className={`rounded-[28px] border ${surfaceClass} p-6`}>
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex w-full flex-col gap-3">
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
                      placeholder="输入文件名或关键字"
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
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {PRIMARY_TAGS.map((tag) => {
                      const isActive = activeTag === tag;
                      return (
                        <button
                          type="button"
                          key={tag}
                          onClick={() => handleTagSelect(tag)}
                          className={`${tagButtonClass} ${isActive ? tagButtonActiveClass : ""}`}
                        >
                          {getTagLabel(tag)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {customTags.map((tag) => {
                      const isActive = activeTag === tag;
                      return (
                        <div key={tag} className="relative">
                          <button
                            type="button"
                            onClick={() => handleTagSelect(tag)}
                            className={`${customTagButtonClass} ${isActive ? tagButtonActiveClass : ""}`}
                          >
                            {getTagLabel(tag)}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className={tagRemoveButtonClass}
                            aria-label={`删除标签 ${tag}`}
                          >
                            <FontAwesomeIcon icon={faXmark} className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      );
                    })}
                    {isAddingTag ? (
                      <form onSubmit={handleAddTagFilter} className="flex items-center gap-2">
                        <input
                          ref={tagInputRef}
                          value={newTag}
                          onChange={(event) => setNewTag(event.target.value)}
                          placeholder="新增标签并立即筛选"
                          className={tagInputClass}
                        />
                        <button type="submit" className={tagAddButtonClass} disabled={!newTag.trim()}>
                          确认
                        </button>
                        <button type="button" onClick={handleCancelAddTag} className={tagCancelButtonClass}>
                          取消
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartAddTag}
                        className={addTagTriggerClass}
                        aria-label="新增标签"
                      >
                        <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={mutedTextClass}>每页显示</span>
                <select value={pageSize} onChange={handlePageSizeChange} className={selectClass}>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <div className="relative">
                <LoadingOverlay loading={loading} />
                <Table
                  data={listData}
                  isDark={isDark}
                  availableTags={availableTags}
                  onUpdateTags={handleUpdateItemTags}
                  onRegisterTag={registerAvailableTag}
                  onAfterDelete={handleAfterDelete}
                />
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

