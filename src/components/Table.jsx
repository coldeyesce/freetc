"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
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

  const getImgUrl = useCallback((url) => {
    if (!url) return "";
    if (url.startsWith("/file/") || url.startsWith("/cfile/") || url.startsWith("/rfile/")) {
      return `${origin}/api${url}`;
    }
    return url;
  }, [origin]);

  const isVideo = (url) => {
    if (!url) return false;
    return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
  };

  const handleCopy = async (text, message = "链接已复制") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch (error) {
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
    const confirmed = window.confirm("确认删除该文件记录吗？");
    if (confirmed) {
      deleteItem(name);
    }
  };

  const cards = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map((item, index) => {
      const previewUrl = getImgUrl(item.url);
      const linkOptions = buildLinkOptions(previewUrl);
      const referer = item.referer || "未设置";
      const ip = item.ip || "未知";

      const previewNode = (
        <div className="relative h-44 w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60">
          {previewUrl ? (
            <PhotoView key={previewUrl} src={previewUrl}>
              <div className="flex h-full w-full items-center justify-center">
                {isVideo(previewUrl) ? (
                  <video src={previewUrl} controls className="h-full w-full rounded-3xl object-cover" />
                ) : (
                  <img src={previewUrl} alt={item.url || `preview-${index}`} className="h-full w-full object-cover" />
                )}
              </div>
            </PhotoView>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">无预览</div>
          )}
        </div>
      );

      return {
        key: item.url ?? index,
        preview: previewNode,
        name: item.url || "未命名文件",
        time: formatDateTime(item.time || item.created_at),
        referer,
        ip,
        pv: item.total ?? item.pv ?? 0,
        rating: item.rating ?? 0,
        previewUrl,
        linkOptions,
        raw: item,
      };
    });
  }, [data, getImgUrl]);

  const cardClass = isDark
    ? "rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur"
    : "rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm";
  const metaLabelClass = isDark ? "text-xs font-semibold text-slate-300" : "text-xs font-semibold text-slate-500";
  const metaValueClass = isDark ? "text-sm text-white" : "text-sm text-slate-800";
  const secondaryTextClass = isDark ? "text-xs text-slate-400" : "text-xs text-slate-500";
  const dividerClass = isDark ? "border-white/10" : "border-slate-200";
  const subtleButtonClass = isDark
    ? "rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-100 transition hover:border-blue-400/60"
    : "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 transition hover:border-blue-400/60";
  const primaryButtonClass =
    "rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_12px_45px_-18px_rgba(37,99,235,0.8)] transition hover:scale-[1.03]";

  if (cards.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-[26px] border ${dividerClass} bg-white/5 py-16 text-sm ${
          isDark ? "text-slate-300" : "text-slate-600"
        }`}
      >
        暂无数据，试试调整筛选条件或上传文件。
      </div>
    );
  }

  return (
    <PhotoProvider maskOpacity={0.65}>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.key} className={`${cardClass} group flex flex-col space-y-4`}>
            {card.preview}
            <div className="flex flex-col gap-3">
              <div className="space-y-1">
                <TooltipItem tooltipsText={card.name} position="top">
                  <p className="truncate text-sm font-semibold">{card.name}</p>
                </TooltipItem>
                <p className={secondaryTextClass}>{card.previewUrl}</p>
              </div>

              <div className="grid gap-3 text-sm">
                <div>
                  <p className={metaLabelClass}>上传时间</p>
                  <p className={metaValueClass}>{card.time}</p>
                </div>
                <div>
                  <p className={metaLabelClass}>来源地址</p>
                  <p className={metaValueClass}>
                    <TooltipItem tooltipsText={card.referer} position="bottom">
                      <span className="truncate">{card.referer}</span>
                    </TooltipItem>
                  </p>
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

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => handleCopy(card.previewUrl, "直链已复制")} className={primaryButtonClass}>
                  复制直链
                </button>
                <button type="button" onClick={() => handleOpen(card.previewUrl)} className={subtleButtonClass}>
                  打开链接
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(card.linkOptions[1].value, "Markdown 已复制")}
                  className={subtleButtonClass}
                >
                  复制 Markdown
                </button>
              </div>

              <div className={`my-2 border-t ${dividerClass}`} />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={metaLabelClass}>限制访问</span>
                  <Switcher initialChecked={card.raw.rating} initName={card.raw.url} />
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(card.raw.url)}
                  className="rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_12px_32px_-18px_rgba(244,63,94,0.7)] transition hover:scale-[1.04]"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PhotoProvider>
  );
}
