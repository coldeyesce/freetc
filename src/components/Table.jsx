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
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
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
  image: { label: "图片", icon: faImage },
  video: { label: "视频", icon: faFilm },
  other: { label: "文件", icon: faLink },
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
    ? "rounded-2xl border border-white/10 bg-white/6 px-5 py-4 backdrop-blur"
    : "rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm";
  const badgeClass = isDark
    ? "inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-slate-200"
    : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-600";
  const metaLabelClass = isDark ? "text-[11px] text-slate-400" : "text-[11px] text-slate-500";
  const metaValueClass = isDark ? "text-xs text-white" : "text-xs text-slate-800";
  const mutedTextClass = isDark ? "text-[11px] text-slate-400" : "text-[11px] text-slate-500";
  const actionButtonClass = isDark
    ? "inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[11px] text-slate-100 transition hover:border-blue-400/70"
    : "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-700 transition hover:border-blue-500/60";
  const deleteButtonClass =
    "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_28px_-18px_rgba(248,113,113,0.7)] transition hover:scale-[1.04]";

  if (cards.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-[24px] border ${
          isDark ? "border-white/10 bg-white/6 text-slate-300" : "border-slate-200 bg-white text-slate-600"
        } py-20 text-sm`}
      >
        暂无数据，试试调整筛选条件或重新上传文件。
      </div>
    );
  }

  const [primaryCard, ...restCards] = cards;

  const renderPreview = (card, sizeClass) => (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-slate-900/40 ${sizeClass}`}>
      {card.previewUrl ? (
        <PhotoView src={card.previewUrl}>
          <div className="flex h-full w-full items-center justify-center">
            {card.kind === "video" ? (
              <video src={card.previewUrl} className="h-full w-full object-cover" />
            ) : (
              <img src={card.previewUrl} alt={card.displayName} className="h-full w-full object-cover" />
            )}
          </div>
        </PhotoView>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">无预览</div>
      )}
    </div>
  );

  const renderActions = (card) => (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => handleCopy(card.previewUrl, "直链已复制")}
        className={actionButtonClass}
      >
        <FontAwesomeIcon icon={faCopy} className="h-3 w-3" />
        复制直链
      </button>
      <button
        type="button"
        onClick={() => handleCopy(card.linkOptions[1].value, "Markdown 已复制")}
        className={actionButtonClass}
      >
        <FontAwesomeIcon icon={faCopy} className="h-3 w-3" />
        Markdown
      </button>
      <button type="button" onClick={() => handleOpen(card.previewUrl)} className={actionButtonClass}>
        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3 w-3" />
        打开链接
      </button>
      <button type="button" onClick={() => handleDelete(card.raw.url)} className={deleteButtonClass}>
        <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
        删除
      </button>
    </div>
  );

  const renderPrimaryCard = (card) => {
    const kindMeta = FILE_KIND_META[card.kind] ?? FILE_KIND_META.other;
    return (
      <div key={card.key} className={`${cardClass} flex flex-col gap-4`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <div className="flex flex-col items-start gap-2">
            {renderPreview(card, "h-36 w-56 md:h-44 md:w-72")}
            <span className={`${badgeClass} gap-1`}>
              <FontAwesomeIcon icon={kindMeta.icon} className="h-3 w-3" />
              {kindMeta.label}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <TooltipItem tooltipsText={card.displayName} position="top">
              <h3 className="truncate text-base font-semibold">{card.displayName}</h3>
            </TooltipItem>
            <p className={`break-all text-xs ${mutedTextClass}`}>{card.previewUrl}</p>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <p className={metaLabelClass}>上传时间</p>
                <p className={metaValueClass}>{card.time}</p>
              </div>
              <div>
                <p className={metaLabelClass}>来源地址</p>
                <TooltipItem tooltipsText={card.referer} position="bottom">
                  <p className={`${metaValueClass} truncate`}>{card.referer}</p>
                </TooltipItem>
              </div>
              <div>
                <p className={metaLabelClass}>IP</p>
                <p className={metaValueClass}>{card.ip}</p>
              </div>
              <div>
                <p className={metaLabelClass}>访问 / 评分</p>
                <p className={metaValueClass}>
                  {card.pv} / {card.rating}
                </p>
              </div>
            </div>
          </div>
        </div>
        {renderActions(card)}
      </div>
    );
  };

  const renderCompactCard = (card) => {
    const kindMeta = FILE_KIND_META[card.kind] ?? FILE_KIND_META.other;
    return (
      <div key={card.key} className={`${cardClass} flex flex-col gap-3 md:flex-row md:items-center md:gap-4`}>
        <div className="flex items-center gap-3 md:w-64">
          {renderPreview(card, "h-16 w-24")}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <TooltipItem tooltipsText={card.displayName} position="top">
                <p className="truncate text-sm font-semibold">{card.displayName}</p>
              </TooltipItem>
              <span className={`${badgeClass} gap-1`}>
                <FontAwesomeIcon icon={kindMeta.icon} className="h-3 w-3" />
                {kindMeta.label}
              </span>
            </div>
            <p className={`truncate ${mutedTextClass}`}>{card.previewUrl}</p>
          </div>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2 text-[11px]">
          <span>
            <span className={metaLabelClass}>时间</span> <span className={metaValueClass}>{card.time}</span>
          </span>
          <span>
            <span className={metaLabelClass}>来源</span>{" "}
            <TooltipItem tooltipsText={card.referer} position="bottom">
              <span className={`${metaValueClass} truncate max-w-[140px] inline-block align-middle`}>{card.referer}</span>
            </TooltipItem>
          </span>
          <span>
            <span className={metaLabelClass}>IP</span> <span className={metaValueClass}>{card.ip}</span>
          </span>
          <span>
            <span className={metaLabelClass}>访问/评分</span>{" "}
            <span className={metaValueClass}>
              {card.pv} / {card.rating}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">{renderActions(card)}</div>
      </div>
    );
  };

  return (
    <PhotoProvider maskOpacity={0.6}>
      <div className="space-y-3">
        {renderPrimaryCard(primaryCard)}
        {restCards.map((card) => renderCompactCard(card))}
      </div>
    </PhotoProvider>
  );
}
