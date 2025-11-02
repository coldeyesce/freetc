"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUpRightFromSquare,
  faCopy,
  faFilm,
  faImage,
  faLink,
  faFileLines,
} from "@fortawesome/free-solid-svg-icons";
import Switcher from "@/components/SwitchButton";
import TooltipItem from "@/components/Tooltip";
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

const FILE_KIND_META = {
  image: { label: "图片", icon: faImage, tone: "text-sky-300", bg: "bg-sky-500/15" },
  video: { label: "视频", icon: faFilm, tone: "text-violet-300", bg: "bg-violet-500/15" },
  other: { label: "文件", icon: faFileLines, tone: "text-slate-300", bg: "bg-slate-500/15" },
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日 ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
};

const buildLinkOptions = (url) => [
  { label: "直链", value: url },
  { label: "Markdown", value: `![image](${url})` },
  { label: "HTML", value: `<a href="${url}" target="_blank" rel="noreferrer"><img src="${url}" alt="image" /></a>` },
];

export default function Table({ data: initialData = [], isDark = true }) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const getImgUrl = useCallback(
    (url) => {
      if (!url) return "";
      if (url.startsWith("/file/") || url.startsWith("/cfile/") || url.startsWith("/rfile/")) {
        return `${origin}/api${url}`;
      }
      return url;
    },
    [origin],
  );

  const detectKind = (url) => {
    if (!url) return "other";
    const lower = url.toLowerCase();
    if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return "image";
    if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return "video";
    return "other";
  };

  const handleCopy = async (text, successMessage = "链接已复制到剪贴板") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error("复制失败，请稍后再试");
    }
  };

  const handleOpen = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener");
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
    const confirmed = window.confirm("确定删除该文件记录吗？");
    if (confirmed) {
      deleteItem(name);
    }
  };

  const cards = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map((item, index) => {
      const previewUrl = getImgUrl(item.url);
      const linkOptions = buildLinkOptions(previewUrl);
      const kind = detectKind(item.url);
      const referer = item.referer || "未设置";
      const ip = item.ip || "未知";
      return {
        key: item.url ?? index,
        previewUrl,
        originalUrl: item.url || "未命名文件",
        displayName: item.url || "未命名文件",
        time: formatDateTime(item.time || item.created_at),
        referer,
        ip,
        pv: item.total ?? item.pv ?? 0,
        rating: item.rating ?? 0,
        linkOptions,
        kind,
        raw: item,
      };
    });
  }, [data, getImgUrl]);

  const cardClass = isDark
    ? "rounded-[26px] border border-white/12 bg-white/6 p-5 backdrop-blur shadow-[0_24px_100px_-50px_rgba(15,23,42,0.8)]"
    : "rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.15)]";
  const chipBase = "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition";
  const metaLabelClass = isDark ? "text-xs font-medium text-slate-300/90" : "text-xs font-medium text-slate-500";
  const metaValueClass = isDark ? "text-sm text-white" : "text-sm text-slate-900";
  const mutedTextClass = isDark ? "text-xs text-slate-400" : "text-xs text-slate-500";
  const blockBackground = isDark ? "border-white/12 bg-white/8" : "border-slate-200 bg-slate-100";
  const secondaryButtonClass = isDark
    ? "inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-xs text-slate-100 transition hover:border-blue-400/70"
    : "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 transition hover:border-blue-500/60";
  const primaryButtonClass =
    "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-5 py-2 text-xs font-semibold text-white shadow-[0_14px_40px_-20px_rgba(37,99,235,0.75)] transition hover:scale-[1.04]";

  if (cards.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-[24px] border ${blockBackground} py-20 text-sm ${
          isDark ? "text-slate-300" : "text-slate-600"
        }`}
      >
        暂无数据，试试调整筛选条件或重新上传文件。
      </div>
    );
  }

  return (
    <PhotoProvider maskOpacity={0.65}>
      <div className="grid gap-6 lg:grid-cols-2">
        {cards.map((card) => {
          const kindMeta = FILE_KIND_META[card.kind] ?? FILE_KIND_META.other;
          return (
            <div key={card.key} className={cardClass}>
              <div className="grid gap-5 md:grid-cols-[minmax(0,220px)_1fr]">
                <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-slate-900/40">
                  {card.previewUrl ? (
                    <PhotoView src={card.previewUrl}>
                      <div className="group/preview relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden">
                        {card.kind === "video" ? (
                          <video
                            src={card.previewUrl}
                            controls
                            className="h-full w-full rounded-[22px] object-cover"
                          />
                        ) : (
                          <img
                            src={card.previewUrl}
                            alt={card.displayName}
                            className="h-full w-full rounded-[22px] object-cover transition duration-300 group-hover/preview:scale-[1.03]"
                          />
                        )}
                      </div>
                    </PhotoView>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center text-xs text-slate-400">无预览</div>
                  )}
                  <span
                    className={`${chipBase} absolute left-3 top-3 ${kindMeta.bg} ${kindMeta.tone} px-2.5 py-1 text-[11px]`}
                  >
                    <FontAwesomeIcon icon={kindMeta.icon} className="h-3 w-3" />
                    {kindMeta.label}
                  </span>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <TooltipItem tooltipsText={card.displayName} position="top">
                        <p className="max-w-full truncate text-sm font-semibold">{card.displayName}</p>
                      </TooltipItem>
                      <span
                        className={`${chipBase} border ${isDark ? "border-white/10 text-slate-200" : "border-slate-200 text-slate-600"}`}
                      >
                        <FontAwesomeIcon icon={faLink} className="h-3 w-3" />
                        {card.originalUrl.split("/").pop()}
                      </span>
                    </div>
                    <p className={`break-all text-[12px] ${mutedTextClass}`}>{card.previewUrl}</p>
                  </div>

                  <div
                    className={`grid gap-2 rounded-[18px] border ${blockBackground} px-4 py-3 text-xs ${
                      isDark ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    <div className="flex flex-wrap justify-between">
                      <span className={metaLabelClass}>上传时间</span>
                      <span className={metaValueClass}>{card.time}</span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className={metaLabelClass}>来源地址</span>
                      <TooltipItem tooltipsText={card.referer} position="bottom">
                        <span className={`${metaValueClass} truncate max-w-[60%] text-right`}>{card.referer}</span>
                      </TooltipItem>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <p className={metaLabelClass}>IP</p>
                        <p className={metaValueClass}>{card.ip}</p>
                      </div>
                      <div>
                        <p className={metaLabelClass}>访问</p>
                        <p className={metaValueClass}>{card.pv}</p>
                      </div>
                      <div>
                        <p className={metaLabelClass}>评分</p>
                        <p className={metaValueClass}>{card.rating}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {card.linkOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => handleCopy(option.value, `${option.label} 已复制`)}
                        className={`flex w-full items-center justify-between rounded-[14px] border px-4 py-2 text-xs transition ${
                          isDark
                            ? "border-white/10 bg-white/10 text-slate-100 hover:border-blue-400/60"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-400/60"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faCopy} className="h-3.5 w-3.5" />
                          {option.label}
                        </span>
                        <span className={`${mutedTextClass}`}>点击复制</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpen(card.previewUrl)}
                      className={secondaryButtonClass}
                    >
                      <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3.5 w-3.5" />
                      打开链接
                    </button>
                    <div className="flex items-center gap-3">
                      <span className={metaLabelClass}>限制访问</span>
                      <Switcher initialChecked={card.raw.rating} initName={card.raw.url} />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(card.raw.url)}
                      className="ml-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_36px_-18px_rgba(248,113,113,0.7)] transition hover:scale-[1.04]"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </PhotoProvider>
  );
}
