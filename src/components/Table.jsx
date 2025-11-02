"use client";
import { useEffect, useRef, useState } from "react";
import Switcher from "@/components/SwitchButton";
import TooltipItem from "@/components/Tooltip";
import FullScreenIcon from "@/components/FullScreenIcon";
import { toast } from "react-toastify";
import { PhotoProvider, PhotoView } from "react-photo-view";

const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "bmp",
  "tiff",
  "tif",
  "webp",
  "svg",
  "ico",
  "heic",
  "heif",
  "raw",
  "psd",
  "ai",
  "eps",
];

const VIDEO_EXTENSIONS = [
  "mp4",
  "mkv",
  "avi",
  "mov",
  "wmv",
  "flv",
  "webm",
  "ogg",
  "ogv",
  "m4v",
  "3gp",
  "3g2",
  "mpg",
  "mpeg",
  "mxf",
  "vob",
];

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(
    date.getDate(),
  )}日 ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}`;
};

const buildLinkOptions = (url) => [
  {
    label: "直链",
    value: url,
  },
  {
    label: "Markdown",
    value: `![image](${url})`,
  },
  {
    label: "HTML",
    value: `<a href="${url}" target="_blank" rel="noreferrer"><img src="${url}" alt="image" /></a>`,
  },
  {
    label: "BBCode",
    value: `[img]${url}[/img]`,
  },
];

export default function Table({ data: initialData = [] }) {
  const [data, setData] = useState(initialData);
  const [modalData, setModalData] = useState(null);
  const modalRef = useRef(null);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const getImgUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("/file/") || url.startsWith("/cfile/") || url.startsWith("/rfile/")) {
      return `${origin}/api${url}`;
    }
    return url;
  };

  const handleNameClick = (item) => {
    setModalData(item);
  };

  const handleCloseModal = () => {
    setModalData(null);
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("链接复制成功");
    } catch (error) {
      toast.error("复制失败，请稍后再试");
    }
  };

  const deleteItem = async (name) => {
    try {
      const response = await fetch("/api/admin/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success("删除成功");
        setData((prev) => prev.filter((item) => item.url !== name));
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = (name) => {
    if (!name) return;
    const confirmed = window.confirm("确认删除该文件记录吗？");
    if (confirmed) {
      deleteItem(name);
    }
  };

  function toggleFullScreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const element = document.documentElement;
      if (element) {
        element.requestFullscreen();
      }
    }
  }

  const getLastSegment = (url) => {
    if (!url) return "";
    const lastSlashIndex = url.lastIndexOf("/");
    return url.substring(lastSlashIndex + 1);
  };

  const isVideo = (url) => {
    if (!url) return false;
    return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
  };

  const renderFile = (fileUrl, index) => {
    if (!fileUrl) return null;
    const extension = getLastSegment(fileUrl).split(".").pop()?.toLowerCase() ?? "";
    if (IMAGE_EXTENSIONS.includes(extension)) {
      return (
        <img
          key={`image-${index}`}
          src={fileUrl}
          alt={`uploaded-${index}`}
          className="h-full w-full rounded-2xl object-cover"
        />
      );
    }
    if (VIDEO_EXTENSIONS.includes(extension)) {
      return (
        <video
          key={`video-${index}`}
          src={fileUrl}
          controls
          className="h-full w-full rounded-2xl object-cover"
        />
      );
    }
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-900/60 text-xs text-slate-200">
        {extension || "文件"}
      </div>
    );
  };

  const elementSize = 420;

  const tableContainerClass =
    "max-h-[58vh] overflow-auto rounded-[26px] border border-white/10 bg-slate-950/30 backdrop-blur";
  const tableClass = "min-w-full border-separate border-spacing-0 text-sm text-slate-200";
  const headerCellClass =
    "px-5 py-4 border-b border-white/10 bg-slate-950/80 text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-300";
  const cellBaseClass = "px-5 py-4 border-b border-white/5 text-center text-sm text-slate-200";
  const stickyPreviewHeaderClass = `${headerCellClass} sticky left-0 z-30 shadow-[6px_0_18px_-12px_rgba(8,11,30,0.9)]`;
  const stickyPreviewCellClass = `${cellBaseClass} sticky left-0 z-10 bg-slate-950/70 shadow-[10px_0_22px_-14px_rgba(8,11,30,0.9)]`;
  const stickyActionHeaderClass = `${headerCellClass} sticky right-0 z-30 shadow-[-6px_0_18px_-12px_rgba(8,11,30,0.9)]`;
  const stickyActionCellClass = `${cellBaseClass} sticky right-0 z-10 bg-slate-950/70 shadow-[-10px_0_22px_-14px_rgba(8,11,30,0.9)]`;

  return (
    <div className="relative">
      <div className={tableContainerClass}>
        <table className={tableClass}>
          <thead>
            <tr className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur">
              <th className={headerCellClass}>name</th>
              <th className={stickyPreviewHeaderClass}>preview</th>
              <th className={headerCellClass}>time</th>
              <th className={headerCellClass}>referer</th>
              <th className={headerCellClass}>ip</th>
              <th className={headerCellClass}>PV</th>
              <th className={headerCellClass}>rating</th>
              <th className={stickyActionHeaderClass}>限制访问</th>
            </tr>
          </thead>
          <tbody>
            <PhotoProvider
              maskOpacity={0.6}
              toolbarRender={({ rotate, onRotate, onScale, scale }) => (
                <>
                  <svg
                    className="PhotoView-Slider__toolbarIcon"
                    width="44"
                    height="44"
                    viewBox="0 0 768 768"
                    fill="white"
                    onClick={() => onScale(scale + 0.5)}
                  >
                    <path d="M384 640.5q105 0 180.75-75.75t75.75-180.75-75.75-180.75-180.75-75.75-180.75 75.75-75.75 180.75 75.75 180.75 180.75 75.75zM384 64.5q132 0 225.75 93.75t93.75 225.75-93.75 225.75-225.75 93.75-225.75-93.75-93.75-225.75 93.75-225.75 225.75-93.75zM415.5 223.5v129h129v63h-129v129h-63v-129h-129v-63h129v-129h63z" />
                  </svg>
                  <svg
                    className="PhotoView-Slider__toolbarIcon"
                    width="44"
                    height="44"
                    viewBox="0 0 768 768"
                    fill="white"
                    onClick={() => onScale(scale - 0.5)}
                  >
                    <path d="M384 640.5q105 0 180.75-75.75t75.75-180.75-75.75-180.75-180.75-75.75-180.75 75.75-75.75 180.75 75.75 180.75 180.75 75.75zM384 64.5q132 0 225.75 93.75t93.75 225.75-93.75 225.75-225.75 93.75-225.75-93.75-93.75-225.75 93.75-225.75 225.75-93.75zM223.5 352.5h321v63h-321v-63z" />
                  </svg>
                  <svg
                    className="PhotoView-Slider__toolbarIcon"
                    onClick={() => onRotate(rotate + 90)}
                    width="44"
                    height="44"
                    fill="white"
                    viewBox="0 0 768 768"
                  >
                    <path d="M565.5 202.5l75-75v225h-225l103.5-103.5c-34.5-34.5-82.5-57-135-57-106.5 0-192 85.5-192 192s85.5 192 192 192c84 0 156-52.5 181.5-127.5h66c-28.5 111-127.5 192-247.5 192-141 0-255-115.5-255-256.5s114-256.5 255-256.5c70.5 0 135 28.5 181.5 75z" />
                  </svg>
                  {document.fullscreenEnabled && <FullScreenIcon onClick={toggleFullScreen} />}
                </>
              )}
            >
              {data.map((item, index) => {
                const previewUrl = getImgUrl(item.url);
                return (
                  <tr key={item.url ?? index} className="odd:bg-slate-900/40 even:bg-slate-950/30">
                    <td
                      onClick={() => handleNameClick(item)}
                      className={`${cellBaseClass} cursor-pointer truncate text-slate-300 hover:text-white`}
                    >
                      {item.url}
                    </td>
                    <td className={`${stickyPreviewCellClass} h-24 w-24`}>
                      {isVideo(previewUrl) ? (
                        <PhotoView
                          key={previewUrl}
                          width={elementSize}
                          height={elementSize}
                          render={({ attrs }) => (
                            <div {...attrs} className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-slate-900/60">
                              {renderFile(previewUrl, index)}
                            </div>
                          )}
                        >
                          {renderFile(previewUrl, index)}
                        </PhotoView>
                      ) : (
                        <PhotoView key={previewUrl} src={previewUrl}>
                          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-slate-900/60">
                            {renderFile(previewUrl, index)}
                          </div>
                        </PhotoView>
                      )}
                    </td>
                    <td className={cellBaseClass}>{formatDateTime(item.time || item.created_at)}</td>
                    <td className={`${cellBaseClass} max-w-[200px]`}>
                      <TooltipItem tooltipsText={item.referer || "未设置"} position="bottom">
                        <span className="truncate">{item.referer || "未设置"}</span>
                      </TooltipItem>
                    </td>
                    <td className={cellBaseClass}>
                      <TooltipItem tooltipsText={item.ip || "未知"} position="bottom">
                        <span>{item.ip || "未知"}</span>
                      </TooltipItem>
                    </td>
                    <td className={cellBaseClass}>{item.total ?? item.pv ?? 0}</td>
                    <td className={cellBaseClass}>{item.rating ?? 0}</td>
                    <td className={stickyActionCellClass}>
                      <div className="flex items-center justify-center gap-3">
                        <Switcher initialChecked={item.rating} initName={item.url} />
                        <button
                          type="button"
                          onClick={() => handleDelete(item.url)}
                          className="rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:scale-[1.04]"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </PhotoProvider>
          </tbody>
        </table>
      </div>

      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8" onClick={handleCloseModal}>
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur" />
          <div
            ref={modalRef}
            className="relative z-10 w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950/90 p-8 shadow-[0_40px_160px_-60px_rgba(14,116,244,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute right-5 top-5 h-9 w-9 rounded-full border border-white/20 text-slate-200 transition hover:border-blue-400/70 hover:text-white"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold text-white">快速复制链接</h3>
            <p className="mt-1 text-xs text-slate-400">针对常见发布场景生成不同格式，点击即可复制。</p>
            <div className="mt-6 space-y-3">
              {buildLinkOptions(getImgUrl(modalData.url)).map((item) => (
                <div key={item.label} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/50 p-4 sm:flex-row sm:items-center">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">
                    {item.label}
                  </span>
                  <input
                    readOnly
                    value={item.value}
                    onClick={() => handleCopy(item.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition hover:border-blue-400/60"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(item.value)}
                    className="rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.03]"
                  >
                    复制
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
