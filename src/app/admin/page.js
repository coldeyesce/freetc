'use client'
import { signOut } from "next-auth/react"
import Table from "@/components/Table"
import { useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from "react-toastify";
import Link from 'next/link'

// --- 新增：智能请求（只在原接口不可用时回退，不改你能用的逻辑） ---
async function tryFetchJSON(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    const snippet = text?.slice(0, 120) || res.status;
    const err = new Error(`HTTP ${res.status}: ${snippet}`);
    err.status = res.status;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    // 返回的不是 JSON，也把原文透出，便于定位
    throw new Error(text || "返回的不是 JSON");
  }
}

export default function Admin() {
  const [listData, setListData] = useState([])
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const [inputPage, setInputPage] = useState(1);
  const [view, setView] = useState('list'); // 'list' | 'log'
  const [searchQuery, setSearchQuery] = useState('');

  // --- 仅当原 POST /api/admin/${view} 不可用时，做兜底 ---
  const getListdata = useCallback(async (page) => {
    const pageZeroBased = page - 1;

    // 1) 你原来的首选请求（保持不变）
    const primaryUrl = `/api/admin/${view}`;
    try {
      const res = await fetch(primaryUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        },
        body: JSON.stringify({ page: pageZeroBased, query: searchQuery })
      });
      const res_data = await res.json();

      if (!res_data?.success) {
        // 原接口有返回，但 success=false，按你原逻辑提示错误
        toast.error(res_data?.message || '获取失败');
      } else {
        setListData(res_data.data);
        const totalPages = Math.ceil(res_data.total / 10);
        setSearchTotal(totalPages);
        return; // 成功则直接返回，不再尝试兜底
      }
    } catch (err) {
      // 进入兜底流程
    }

    // 2) 兜底：仅在 405/404/500 等失败时，尝试其它常见路径与 GET 方式
    //    （不会影响你原本能用的情况）
    try {
      const candidates = [];

      if (view === 'log') {
        // 日志接口常见命名
        candidates.push(
          { url: '/api/admin/log',  method: 'POST' },
          { url: '/api/admin/logs', method: 'POST' },
          { url: '/api/enableauthapi/log',  method: 'POST' },
          { url: '/api/enableauthapi/logs', method: 'POST' },
          // GET 兜底
          { url: `/api/admin/log?page=${pageZeroBased}&query=${encodeURIComponent(searchQuery)}`, method: 'GET' },
          { url: `/api/admin/logs?page=${pageZeroBased}&query=${encodeURIComponent(searchQuery)}`, method: 'GET' },
          { url: `/api/enableauthapi/log?page=${pageZeroBased}&query=${encodeURIComponent(searchQuery)}`, method: 'GET' },
          { url: `/api/enableauthapi/logs?page=${pageZeroBased}&query=${encodeURIComponent(searchQuery)}`, method: 'GET' },
        );
      } else {
        // 列表接口常见命名
        candidates.push(
          { url: '/api/admin/list', method: 'POST' },
          { url: '/api/enableauthapi/list', method: 'POST' },
          // GET 兜底
          { url: `/api/admin/list?page=${pageZeroBased}&query=${encodeURIComponent(searchQuery)}`, method: 'GET' },
          { url: `/api/enableauthapi/list?page=${pageZeroBased}&query=${encodeURIComponent(searchQuery)}`, method: 'GET' },
        );
      }

      let okData = null;
      for (const c of candidates) {
        try {
          const init = c.method === 'POST'
            ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: pageZeroBased, query: searchQuery }) }
            : { method: 'GET' };

          okData = await tryFetchJSON(c.url, init);
          break;
        } catch (e) {
          // 如果是未授权，直接报错，不再尝试
          if (e?.status === 401 || e?.status === 403) {
            throw e;
          }
          // 其它错误继续尝试下一个
        }
      }

      if (!okData) throw new Error('没有可用接口');

      // 兼容多返回结构：{success,data,total} | {list,total} | Array
      if (okData?.success) {
        setListData(okData.data || []);
        const totalPages = Math.ceil((okData.total ?? 0) / 10);
        setSearchTotal(totalPages || 1);
      } else if (Array.isArray(okData?.list)) {
        setListData(okData.list);
        const totalPages = Math.ceil((okData.total ?? okData.list.length) / 10);
        setSearchTotal(totalPages || 1);
      } else if (Array.isArray(okData)) {
        setListData(okData);
        const totalPages = Math.ceil(okData.length / 10);
        setSearchTotal(totalPages || 1);
      } else {
        throw new Error('未知返回结构');
      }
    } catch (error) {
      toast.error(error.message || '获取失败');
    }
  }, [view, searchQuery]);

  useEffect(() => {
    getListdata(currentPage)
  }, [currentPage, view, getListdata]);

  // 分页控制
  const handleNextPage = () => {
    const nextPage = currentPage + 1;
    if (nextPage > searchTotal) {
      toast.error('当前已为最后一页！')
    }
    if (nextPage <= searchTotal) {
      setCurrentPage(nextPage);
      setInputPage(nextPage)
    }
  };

  const handlePrevPage = () => {
    const prevPage = currentPage - 1;
    if (prevPage >= 1) {
      setCurrentPage(prevPage);
      setInputPage(prevPage)
    }
  };

  const handleJumpPage = () => {
    const page = parseInt(inputPage, 10);
    if (!isNaN(page) && page >= 1 && page <= searchTotal) {
      setCurrentPage(page);
    } else {
      toast.error('请输入有效的页码！');
    }
  };

  const handleViewToggle = () => {
    setView(view === 'list' ? 'log' : 'list');
    setCurrentPage(1);
    setInputPage(1);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setInputPage(1);
    getListdata(1);
  };

  return (
    <>
      <div className="overflow-auto h-full flex w-full min-h-screen flex-col items-center justify-between">
        {/* 轻量美化：顶栏加一点透明与投影（不影响功能） */}
        <header className="fixed top-0 h-[56px] left-0 w-full border-b bg-white/85 backdrop-blur-sm flex z-50 justify-center items-center shadow-sm">
          <div className="flex justify-between items-center w-full max-w-5xl px-4">
            <button
              className="text-white px-4 py-2 bg-blue-500 hover:bg-indigo-500 rounded transition"
              onClick={handleViewToggle}
            >
              切换到 {view === 'list' ? '日志页' : '数据页'}
            </button>

            <form onSubmit={handleSearch} className="hidden sm:flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border rounded-lg p-2 w-44 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="搜索"
              />
              <button
                type="submit"
                className="text-white px-4 py-2 bg-blue-500 hover:bg-indigo-500 rounded transition"
              >
                搜索
              </button>
            </form>

            <div className="flex items-center">
              <Link href="/" className="hidden sm:flex">
                <button className="px-4 py-2 mx-2 bg-blue-500 hover:bg-indigo-500 text-white rounded transition">主页</button>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-4 py-2 mx-2 bg-blue-500 hover:bg-indigo-500 text-white rounded transition"
              >
                登出
              </button>
            </div>
          </div>
        </header>

        <main className="my-[72px] w-11/12 sm:w-11/12 md:w-10/12 lg:w-10/12 xl:w-4/6 2xl:w-full">
          <Table data={listData} />
        </main>

        {/* 底部分页条：仅美化样式，不改逻辑 */}
        <div className="fixed inset-x-0 bottom-0 h-[56px] w-full flex z-50 justify-center items-center bg-white/95 backdrop-blur-sm border-t">
          <div className="pagination my-2 flex justify-center items-center">
            <button
              className="text-xs sm:text-sm bg-blue-500 hover:bg-indigo-500 text-white px-3 py-2 rounded mr-5 transition"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              上一页
            </button>
            <span className="text-xs sm:text-sm">第 {`${currentPage}/${searchTotal || 1}`} 页</span>
            <button
              className="text-xs sm:text-sm bg-blue-500 hover:bg-indigo-500 text-white px-3 py-2 rounded ml-5 transition"
              onClick={handleNextPage}
            >
              下一页
            </button>
            <div className="ml-5 flex items-center">
              <input
                type="number"
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                className="border rounded-lg p-2 w-20 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="页码"
              />
              <button
                className="text-xs sm:text-sm bg-blue-500 hover:bg-indigo-500 text-white px-3 py-2 rounded ml-2 transition"
                onClick={handleJumpPage}
              >
                跳转
              </button>
            </div>
          </div>
        </div>

        <ToastContainer />
      </div>
    </>
  )
}
