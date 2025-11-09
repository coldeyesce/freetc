"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  faImages,
  faTrashAlt,
  faUpload,
  faSearchPlus,
  faSun,
  faMoon,
  faEye,
  faLink,
  faCode,
  faFileLines,
  faFileCode,
  faInbox,
  faFile,
  faVideo,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ToastContainer, toast } from "react-toastify";
import Footer from "@/components/Footer";
import Link from "next/link";
import LoadingOverlay from "@/components/LoadingOverlay";

const LoginButton = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-blue-300/60"
  >
    {children}
  </button>
);

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

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedFilesNum, setUploadedFilesNum] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState("preview");
  const [uploading, setUploading] = useState(false);
  const [IP, setIP] = useState("");
  const [Total, setTotal] = useState("?");
  const [selectedOption, setSelectedOption] = useState("r2");
  const [isAuthapi, setisAuthapi] = useState(false);
  const [Loginuser, setLoginuser] = useState("");
  const [boxType, setBoxtype] = useState("img");
  const [theme, setTheme] = useState("light");
  const [moderationEnabled, setModerationEnabled] = useState(false);
  const [moderationLoading, setModerationLoading] = useState(false);

  const parentRef = useRef(null);


  const determineKindTag = (file) => {
    const type = (file.type || "").toLowerCase();
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    const name = (file.name || "").toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    if (IMAGE_EXTENSIONS.includes(ext)) return "image";
    if (VIDEO_EXTENSIONS.includes(ext)) return "video";
    return "file";
  };

  const tabs = [
    { id: "preview", label: "预览", icon: faEye },
    { id: "viewLinks", label: "访问链接", icon: faLink },
    { id: "htmlLinks", label: "HTML", icon: faCode },
    { id: "markdownLinks", label: "Markdown", icon: faFileLines },
    { id: "bbcodeLinks", label: "BBCode", icon: faFileCode },
  ];

  const linkBuilders = {
    preview: [
      {
        label: "直链",
        value: (data) => data.url,
      },
      {
        label: "Markdown",
        value: (data) => `![${data.name}](${data.url})`,
      },
      {
        label: "HTML",
        value: (data) =>
          `<a href="${data.url}" target="_blank"><img src="${data.url}" alt="${data.name}" /></a>`,
      },
      {
        label: "BBCode",
        value: (data) => `[img]${data.url}[/img]`,
      },
    ],
    viewLinks: (data) => data.url,
    htmlLinks: (data) => `<img src="${data.url}" alt="${data.name}" />`,
    markdownLinks: (data) => `![${data.name}](${data.url})`,
    bbcodeLinks: (data) => `[img]${data.url}[/img]`,
  };

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
  };

  const fetchModerationStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/moderation");
      if (!res.ok) return;
      const data = await res.json();
      setModerationEnabled(Boolean(data?.data?.enabled));
    } catch (error) {
      console.error("获取内容检测状态失败", error);
    }
  }, []);

  useEffect(() => {
    ip();
    getTotal();
    isAuth();
    fetchModerationStatus();
  }, [fetchModerationStatus]);

  useEffect(() => {
    if (Loginuser === "admin") {
      fetchModerationStatus();
    }
  }, [Loginuser, fetchModerationStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("upload-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }
    const hour = new Date().getHours();
    setTheme(hour >= 7 && hour < 19 ? "light" : "dark");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("upload-theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const handleModerationToggle = useCallback(async () => {
    if (Loginuser !== "admin") return;
    setModerationLoading(true);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: !moderationEnabled }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "更新内容检测状态失败");
      }
      setModerationEnabled(Boolean(data?.data?.enabled));
      toast.success(data?.message || (data?.data?.enabled ? "内容检测已开启" : "内容检测已关闭"));
    } catch (error) {
      toast.error(error.message || "更新内容检测状态失败");
    } finally {
      setModerationLoading(false);
    }
  }, [Loginuser, moderationEnabled]);

  const isDark = theme === "dark";
  const isAdmin = Loginuser === "admin";
  const pageBackground = isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900";
  const heroGlow = isDark
    ? "from-blue-500/25 via-cyan-500/15 to-transparent"
    : "from-blue-300/35 via-cyan-200/25 to-transparent";
  const heroGlowRight = isDark ? "bg-indigo-600/30" : "bg-indigo-200/40";
  const heroGlowLeft = isDark ? "bg-cyan-500/20" : "bg-cyan-200/40";
  const surfaceClass = isDark ? "border-white/10 bg-white/5 backdrop-blur" : "border-slate-200 bg-white shadow-sm";
  const mutedTextClass = isDark ? "text-slate-300" : "text-slate-600";
  const dropZoneClass = isDark
    ? "border-white/20 hover:border-blue-400/50 hover:bg-white/5"
    : "border-slate-300 hover:border-blue-400 hover:bg-blue-50";
  const actionButtonClass = isDark
    ? "border-white/15 bg-white/10 text-white hover:border-blue-400/60"
    : "border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-600";
  const moderationButtonClass = moderationEnabled
    ? isDark
      ? "flex items-center gap-2 rounded-full border border-emerald-400/70 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/80"
      : "flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400"
    : isDark
      ? "flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-blue-400/70"
      : "flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-400/60";
  const moderationBadgeClass = moderationEnabled
    ? "text-xs font-semibold text-emerald-500"
    : "text-xs font-semibold text-slate-400";
  const headerSelectClass = isDark
    ? "rounded-md border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-100 outline-none transition focus:border-blue-400 focus:bg-slate-900/80 focus:text-white"
    : "rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:text-slate-900";
  const mobileSelectClass = isDark
    ? "ml-4 rounded-md border border-white/10 bg-slate-900/60 px-2 py-1 text-sm text-slate-100 outline-none transition focus:border-blue-400 focus:bg-slate-900/80 focus:text-white"
    : "ml-4 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:text-slate-900";
  const pillBarClass = isDark ? "bg-white/10" : "bg-slate-200";
  const pillInactiveClass = isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900";
  const footerClass = isDark ? "border-t border-white/10 bg-slate-950/85 text-slate-400" : "border-t border-slate-200 bg-white text-slate-600";

  const stats = [
    {
      title: "累计托管",
      value: Total,
      description: "站点历史文件总量",
    },
    {
      title: "本次成功",
      value: uploadedFilesNum,
      description: "当前会话成功上传",
    },
    {
      title: "当前 IP",
      value: IP || "加载中...",
      description: "访问者网络地址",
    },
  ];

  const ip = async () => {
    try {
      const res = await fetch(`/api/ip`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      setIP(data.ip);
    } catch (error) {
      console.error("获取 IP 失败", error);
    }
  };

  const isAuth = async () => {
    try {
      const res = await fetch(`/api/enableauthapi/isauth`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setisAuthapi(true);
        setLoginuser(data.role);
      } else {
        setisAuthapi(false);
        setSelectedOption("58img");
      }
    } catch (error) {
      console.error("鉴权检测失败", error);
    }
  };

  const getTotal = async () => {
    try {
      const res = await fetch(`/api/total`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      setTotal(data.total);
    } catch (error) {
      console.error("获取统计信息失败", error);
    }
  };

  const handleFileChange = (event) => {
    const newFiles = event.target.files;
    const filteredFiles = Array.from(newFiles).filter(
      (file) => !selectedFiles.find((selFile) => selFile.name === file.name)
    );
    const uniqueFiles = filteredFiles.filter(
      (file) => !uploadedImages.find((upImg) => upImg.name === file.name)
    );
    setSelectedFiles((prev) => [...prev, ...uniqueFiles]);
  };

  const handleClear = () => {
    setSelectedFiles([]);
  };

  const getTotalSizeInMB = (files) => {
    const totalSizeInBytes = Array.from(files).reduce((acc, file) => acc + file.size, 0);
    return (totalSizeInBytes / (1024 * 1024)).toFixed(2);
  };

  const handleUpload = async (file = null) => {
    setUploading(true);
    const filesToUpload = file ? [file] : selectedFiles;

    if (filesToUpload.length === 0) {
      toast.error("请先选择文件再上传");
      setUploading(false);
      return;
    }

    const formFieldName = selectedOption === "tencent" ? "media" : "file";
    let successCount = 0;

    try {
      for (const item of filesToUpload) {
        const formData = new FormData();
        formData.append(formFieldName, item);

        const kindTag = determineKindTag(item);
        const tagList = [kindTag];
        formData.append("tags", tagList.join(","));

        try {
          const targetUrl =
            selectedOption === "tgchannel" || selectedOption === "r2"
              ? `/api/enableauthapi/${selectedOption}`
              : `/api/${selectedOption}`;

          const response = await fetch(targetUrl, {
            method: "POST",
            body: formData,
            headers,
          });

          if (response.ok) {
            const result = await response.json();
            const itemTags =
              Array.isArray(result.tags) && result.tags.length > 0 ? result.tags : tagList;
            const enrichedItem = Object.assign({}, item, {
              url: result.url,
              tags: itemTags,
            });
            setUploadedImages((prev) => [...prev, enrichedItem]);
            setSelectedFiles((prev) => prev.filter((f) => f !== item));
            successCount += 1;
          } else {
            let errorMsg;
            try {
              const errorData = await response.json();
              errorMsg = errorData.message || `上传 ${item.name} 时出错`;
            } catch {
              errorMsg = `上传 ${item.name} 时发生未知错误`;
            }

            switch (response.status) {
              case 400:
                toast.error(`请求无效：${errorMsg}`);
                break;
              case 403:
                toast.error(`无权限访问资源：${errorMsg}`);
                break;
              case 404:
                toast.error(`接口不存在：${errorMsg}`);
                break;
              case 500:
                toast.error(`服务器异常：${errorMsg}`);
                break;
              case 401:
                toast.error(`未授权：${errorMsg}`);
                break;
              default:
                toast.error(`上传 ${item.name} 时出错：${errorMsg}`);
            }
          }
        } catch (error) {
          toast.error(`上传 ${item.name} 时出错`);
        }
      }

      setUploadedFilesNum((prev) => prev + successCount);
      if (successCount > 0) {
        toast.success(`已成功上传 ${successCount} 个文件`);
      }
    } catch (error) {
      console.error("上传过程中出现错误", error);
      toast.error("上传失败，请稍后再试");
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (event) => {
    const clipboardItems = event.clipboardData.items;
    for (let i = 0; i < clipboardItems.length; i += 1) {
      const item = clipboardItems[i];
      if (item.kind === "file" && item.type.includes("image")) {
        const file = item.getAsFile();
        setSelectedFiles((prev) => [...prev, file]);
        break;
      }
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const filteredFiles = Array.from(files).filter(
        (file) => !selectedFiles.find((selFile) => selFile.name === file.name)
      );
      setSelectedFiles((prev) => [...prev, ...filteredFiles]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const calculateMinHeight = () => {
    const rows = Math.ceil(selectedFiles.length / 3);
    return `${Math.max(rows * 180, 320)}px`;
  };

  const handleImageClick = (index) => {
    const file = selectedFiles[index];
    if (file.type.startsWith("image/")) {
      setBoxtype("img");
    } else if (file.type.startsWith("video/")) {
      setBoxtype("video");
    } else {
      setBoxtype("other");
    }
    setSelectedImage(URL.createObjectURL(file));
  };

  const handleCloseImage = () => {
    setSelectedImage(null);
  };

  const handleRemoveImage = (index) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("链接已复制到剪贴板");
    } catch (error) {
      toast.error("复制失败，请稍后再试");
    }
  };

  const handleCopyCode = async () => {
    const codeElements = parentRef.current?.querySelectorAll("code");
    if (!codeElements) return;
    const values = Array.from(codeElements).map((code) => code.textContent || "");
    try {
      await navigator.clipboard.writeText(values.join("\n"));
      toast.success("链接已复制到剪贴板");
    } catch (error) {
      toast.error("复制失败，请稍后再试");
    }
  };

  const copyAllPreviewLinks = () => {
    if (uploadedImages.length === 0) {
      toast.info("暂无可复制的链接");
      return;
    }
    const lines = uploadedImages
      .map((data) =>
        linkBuilders.preview
          .map((item) => `${item.label}: ${item.value(data)}`)
          .join("\n")
      )
      .join("\n\n");
    handleCopy(lines);
  };

  const openPreviewFromUploaded = (url, type) => {
    setBoxtype(type);
    setSelectedImage(url);
  };

  const renderEmptyState = (message) => (
    <div className={`flex flex-col items-center justify-center py-12 text-sm ${mutedTextClass}`}>
      <FontAwesomeIcon icon={faInbox} className={`mb-4 h-10 w-10 ${isDark ? "text-slate-600" : "text-slate-300"}`} />
      <span>{message}</span>
    </div>
  );

  const renderUploadedPreviews = () => {
    const resolveKind = (fileMeta) => {
      const type = fileMeta.type || "";
      if (type.startsWith("image/")) return "image";
      if (type.startsWith("video/")) return "video";
      const name = (fileMeta.name || fileMeta.url || "").toLowerCase();
      const ext = name.includes(".") ? name.split(".").pop() : "";
      if (IMAGE_EXTENSIONS.includes(ext)) return "image";
      if (VIDEO_EXTENSIONS.includes(ext)) return "video";
      return "other";
    };

    if (uploadedImages.length === 0) {
      return renderEmptyState("暂无上传结果");
    }

    return (
      <div className="space-y-4">
        {uploadedImages.map((data, index) => {
          const kind = resolveKind(data);
          const tagDisplayList = Array.isArray(data.tags)
            ? data.tags
            : String(data.tags || "")
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean);

          const renderThumb = () => {
            if (kind === "image") {
              return (
                <img
                  src={data.url}
                  alt={data.name}
                  className="h-28 w-28 rounded-2xl object-cover sm:h-32 sm:w-32"
                  onClick={() => openPreviewFromUploaded(data.url, "img")}
                />
              );
            }
            if (kind === "video") {
              return (
                <video
                  src={data.url}
                  className="h-28 w-28 rounded-2xl object-cover sm:h-32 sm:w-32"
                  controls
                  onClick={() => openPreviewFromUploaded(data.url, "video")}
                />
              );
            }
            return (
              <div
                className={`flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-2xl border text-center text-xs sm:h-32 sm:w-32 ${
                  isDark ? "border-white/10 bg-white/5 text-slate-200" : "border-slate-200 bg-white text-slate-600"
                }`}
                onClick={() => openPreviewFromUploaded(data.url, "other")}
              >
                <FontAwesomeIcon icon={faFile} className="h-6 w-6" />
                <span className="line-clamp-2 break-all px-2">{data.name}</span>
              </div>
            );
          };

          return (
            <div
              key={index}
              className={`flex flex-col gap-4 rounded-2xl border p-4 transition-colors md:flex-row ${surfaceClass}`}
            >
              <div className="flex items-center justify-center md:w-40">{renderThumb()}</div>
              <div className="flex flex-1 flex-col gap-2">
                {tagDisplayList.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {tagDisplayList.map((tag) => (
                      <span
                        key={`${data.url}-${tag}`}
                        className="rounded-full border border-blue-400/40 px-3 py-1 text-blue-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                {linkBuilders.preview.map((builder) => {
                  const value = builder.value(data);
                  return (
                    <div key={`${builder.label}-${index}`} className="flex flex-col gap-1 sm:flex-row sm:items-center">
                      <span className={`text-xs font-semibold uppercase tracking-[0.3em] ${mutedTextClass} sm:w-28 sm:flex-shrink-0`}>
                        {builder.label}
                      </span>
                      <div className="flex flex-1 gap-2">
                        <input
                          readOnly
                          value={value}
                          onClick={() => handleCopy(value)}
                          className={`flex-1 rounded-xl border px-3 py-2 text-sm shadow-inner focus:outline-none focus:ring-2 ${actionButtonClass}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy(value)}
                          className="rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.03]"
                        >
                          复制
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCodeTemplate = (builder) => {
    if (uploadedImages.length === 0) {
      return renderEmptyState("暂无链接可显示");
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">可复制链接</h3>
          <button
            type="button"
            onClick={handleCopyCode}
            className="rounded-full border border-blue-400/60 px-4 py-1.5 text-xs font-semibold text-blue-400 transition hover:bg-blue-500 hover:text-white"
          >
            一键复制全部
          </button>
        </div>
        <div className="space-y-3">
          {uploadedImages.map((data, index) => {
            const value = builder(data);
            return (
              <div key={`${data.url}-${index}`} className={`rounded-2xl border p-4 ${surfaceClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{data.name}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(value)}
                    className="rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:scale-[1.03]"
                  >
                    复制
                  </button>
                </div>
                <pre
                  className={`mt-3 whitespace-pre-wrap break-words rounded-xl border px-4 py-3 text-sm ${
                    isDark ? "border-white/10 bg-white/5 text-slate-100" : "border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  <code>{value}</code>
                </pre>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSelectedCards = () => {
    if (selectedFiles.length === 0) {
      return (
        <div className={`flex h-full flex-col items-center justify-center text-center ${mutedTextClass}`}>
          <span
            className={`mb-6 flex h-20 w-20 items-center justify-center rounded-3xl ${
              isDark ? "bg-white/10 text-blue-200 shadow-inner shadow-blue-500/30" : "bg-blue-50 text-blue-600 shadow-inner shadow-blue-200/40"
            }`}
          >
            <FontAwesomeIcon icon={faUpload} className="h-8 w-8" />
          </span>
          <p className="text-lg font-semibold">拖拽或单击即可上传</p>
          <p className="mt-2 text-sm">支持截图粘贴与批量选择，极速处理。</p>
          <label
            htmlFor="file-upload"
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:scale-[1.05]"
          >
            <FontAwesomeIcon icon={faImages} className="h-4 w-4" />
            选择文件
          </label>
        </div>
      );
    }

    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {selectedFiles.map((file, index) => (
          <div
            key={index}
            className={`group flex h-full flex-col rounded-2xl border p-4 transition ${surfaceClass} hover:border-blue-400/60`}
          >
            <div
              className={`relative mb-4 flex h-40 w-full items-center justify-center overflow-hidden rounded-2xl border ${
                isDark ? "border-white/10 bg-slate-900/60" : "border-slate-200 bg-slate-100"
              }`}
              onClick={() => handleImageClick(index)}
            >
              {file.type.startsWith("image/") && (
                <Image src={URL.createObjectURL(file)} alt={`Preview ${file.name}`} fill className="object-cover" />
              )}
              {file.type.startsWith("video/") && (
                <video src={URL.createObjectURL(file)} controls className="h-full w-full rounded-2xl object-cover" />
              )}
              {!file.type.startsWith("image/") && !file.type.startsWith("video/") && (
                <span className={`px-3 text-sm ${mutedTextClass}`}>{file.name}</span>
              )}
            </div>
            <span className="truncate text-sm font-medium" title={file.name}>
              {file.name}
            </span>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${actionButtonClass}`}
                onClick={() => handleImageClick(index)}
              >
                <FontAwesomeIcon icon={faSearchPlus} className="mr-1 h-3 w-3" />
                预览
              </button>
              <button
                type="button"
                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  isDark
                    ? "border-red-300/30 bg-red-500/10 text-red-200 hover:border-red-400/50 hover:text-red-100"
                    : "border-red-200 bg-red-50 text-red-500 hover:border-red-300 hover:text-red-600"
                }`}
                onClick={() => handleRemoveImage(index)}
              >
                <FontAwesomeIcon icon={faTrashAlt} className="mr-1 h-3 w-3" />
                删除
              </button>
              <button
                type="button"
                className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-white transition ${
                  uploading ? "bg-emerald-400/40 text-emerald-50" : "bg-gradient-to-r from-emerald-500 to-emerald-400 hover:scale-[1.03]"
                }`}
                onClick={() => handleUpload(file)}
                disabled={uploading}
              >
                <FontAwesomeIcon icon={faUpload} className="mr-1 h-3 w-3" />
                上传
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "preview":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">可复制格式</h3>
              <button
                type="button"
                onClick={copyAllPreviewLinks}
                className="rounded-full border border-blue-400/60 px-4 py-1.5 text-xs font-semibold text-blue-400 transition hover:bg-blue-500 hover:text-white"
              >
                一键复制全部
              </button>
            </div>
            {renderUploadedPreviews()}
          </div>
        );
      case "viewLinks":
      case "htmlLinks":
      case "markdownLinks":
      case "bbcodeLinks":
        return renderCodeTemplate(linkBuilders[activeTab]);
      default:
        return null;
    }
  };

  const handleSelectChange = (event) => {
    setSelectedOption(event.target.value);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const renderButton = () => {
    if (!isAuthapi) {
      return (
        <Link href="/login">
          <LoginButton>登录</LoginButton>
        </Link>
      );
    }

    switch (Loginuser) {
      case "user":
        return <LoginButton onClick={handleSignOut}>登出</LoginButton>;
      case "admin":
        return (
          <Link href="/admin">
            <LoginButton>管理后台</LoginButton>
          </Link>
        );
      default:
        return (
          <Link href="/login">
            <LoginButton>登录</LoginButton>
          </Link>
        );
    }
  };

  return (
    <main className={`min-h-screen w-full overflow-x-hidden ${pageBackground}`}>
      <div className="relative flex min-h-screen flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className={`absolute left-1/2 top-[-220px] h-[420px] w-[540px] -translate-x-1/2 rounded-full bg-gradient-to-br ${heroGlow} blur-[160px]`} />
          <div className={`absolute -bottom-24 right-12 h-[280px] w-[280px] rounded-full ${heroGlowRight} blur-[160px]`} />
          <div className={`absolute bottom-28 left-12 h-[220px] w-[220px] rounded-full ${heroGlowLeft} blur-[140px]`} />
        </div>

        <header className={`relative z-20 border-b ${isDark ? "border-white/10 bg-slate-950/70 backdrop-blur" : "border-slate-200 bg-white/80 backdrop-blur"}`}>
          <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30">
                <FontAwesomeIcon icon={faImages} className="h-5 w-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-4xl font-semibold">文件上传中心</span>
                <span className={`text-sm ${mutedTextClass}`}>轻盈、稳定、随处可见</span>
              </div>
            </div>
            <div className="hidden flex-1 items-center gap-4 md:flex justify-between">
              <div className="flex items-center gap-4">
                <label className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${actionButtonClass}`}>
                  <span>上传接口</span>
                  <select
                    value={selectedOption}
                    onChange={handleSelectChange}
                    className={headerSelectClass}
                  >
                    <option value="tgchannel">TG Channel</option>
                    <option value="r2">R2</option>
                  </select>
                </label>
                <div className="flex items-center gap-3 flex-nowrap">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${isDark ? "border-white/15 bg-white/5 text-white hover:border-blue-400/60" : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-400/60"}`}
                  >
                    <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="h-4 w-4" />
                    {isDark ? "浅色模式" : "暗色模式"}
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={handleModerationToggle}
                      className={`${moderationButtonClass} ${moderationLoading ? "opacity-70" : ""}`}
                      disabled={moderationLoading}
                    >
                      <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4" />
                      {moderationEnabled ? "内容检测已开启" : "开启内容检测"}
                    </button>
                  ) : (
                    <span
                      className={`rounded-full border px-4 py-2 text-xs font-semibold ${moderationEnabled ? "border-emerald-300 text-emerald-500" : isDark ? "border-white/15 text-slate-300" : "border-slate-200 text-slate-500"}`}
                    >
                      内容检测：{moderationEnabled ? "已开启" : "未开启"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                {renderButton()}
              </div>
            </div>
          </div>
        </header>



        <div className="relative z-20 flex-1 px-4 pb-24">
          <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 pt-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-semibold tracking-wide">上传、管理一站完成</h1>
                <p className={`text-base leading-7 ${mutedTextClass}`}>
                  支持多格式快速上传，日间明亮、夜间护眼，随时随地管理你的素材。
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {stats.map((item) => (
                    <div key={item.title} className={`rounded-2xl border px-4 py-3 ${surfaceClass}`}>
                      <span className="text-xs font-medium tracking-[0.2em] text-blue-400">{item.title}</span>
                      <p className="mt-2 text-2xl font-semibold">{item.value}</p>
                      <p className={`text-xs ${mutedTextClass}`}>{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 md:hidden">
                <label className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition ${surfaceClass}`}>
                  <span>上传接口</span>
                  <select
                    value={selectedOption}
                    onChange={handleSelectChange}
                    className={mobileSelectClass}
                  >
                    {/* <option value="tg">TG（会失效）</option> */}
                    <option value="tgchannel">TG Channel</option>
                    <option value="r2">R2</option>
                    {/* <option value="58img">58 图床</option> */}
                  </select>
                </label>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                      isDark ? "border-white/15 bg-white/5 text-white hover:border-blue-400/60" : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-400/60"
                    }`}
                  >
                    <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="h-4 w-4" />
                    {isDark ? "浅色模式" : "暗色模式"}
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={handleModerationToggle}
                      className={`${moderationButtonClass} flex-1 justify-center ${moderationLoading ? "opacity-70" : ""}`}
                      disabled={moderationLoading}
                    >
                      <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4" />
                      {moderationEnabled ? "检测已开" : "开启检测"}
                    </button>
                  ) : (
                    <span className={`flex flex-1 items-center justify-center rounded-full border px-3 py-2 text-xs font-semibold ${moderationEnabled ? "border-emerald-300 bg-emerald-50 text-emerald-600" : mutedTextClass}`}>
                      内容检测：{moderationEnabled ? "已开启" : "未开启"}
                    </span>
                  )}
                  {renderButton()}
                </div>
              </div>
            </div>

            <section className="space-y-6">
              <div className={`rounded-2xl border px-5 py-4 ${surfaceClass}`}>
                <p className={`text-xs ${mutedTextClass}`}>
                  提示：系统会根据文件类型自动归类为
                  <span className="mx-1 font-medium text-blue-400">图片</span>/
                  <span className="mx-1 font-medium text-blue-400">视频</span>/
                  <span className="mx-1 font-medium text-blue-400">文件</span>标签，便于在后台快速筛选。
                </p>
              </div>
              <div
                className={`relative rounded-3xl border-2 border-dashed p-8 transition ${dropZoneClass}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onPaste={handlePaste}
                style={{ minHeight: calculateMinHeight() }}
              >
                <LoadingOverlay loading={uploading} />
                {renderSelectedCards()}
              </div>

              <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} multiple />

              <div className={`flex flex-col gap-4 rounded-2xl border px-5 py-4 text-sm ${surfaceClass} ${mutedTextClass} sm:flex-row sm:items-center sm:justify-between`}>
                <div>
                  已选择 <span className="font-semibold text-blue-500">{selectedFiles.length}</span> 个文件 · 总计{" "}
                  {getTotalSizeInMB(selectedFiles)} MB
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor="file-upload"
                    className={`inline-flex cursor-pointer items-center rounded-xl border px-4 py-2 text-sm font-semibold transition ${actionButtonClass}`}
                  >
                    <FontAwesomeIcon icon={faImages} className="mr-2 h-4 w-4" />
                    添加文件
                  </label>
                  <button
                    type="button"
                    onClick={handleClear}
                    className={`inline-flex items-center rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      isDark
                        ? "border-red-300/30 bg-red-500/10 text-red-200 hover:border-red-400/50 hover:text-red-100"
                        : "border-red-200 bg-red-50 text-red-500 hover:border-red-300 hover:text-red-600"
                    }`}
                  >
                    <FontAwesomeIcon icon={faTrashAlt} className="mr-2 h-4 w-4" />
                    清除
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpload()}
                    disabled={uploading}
                    className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                      uploading ? "bg-emerald-400/40 text-emerald-50" : "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:scale-[1.04]"
                    }`}
                  >
                    <FontAwesomeIcon icon={faUpload} className="mr-2 h-4 w-4" />
                    {uploading ? "上传中..." : "开始上传"}
                  </button>
                </div>
              </div>
            </section>

            <section className={`rounded-3xl border p-6 ${surfaceClass}`}>
              <div className={`flex flex-wrap items-center gap-2 rounded-full p-1 ${pillBarClass}`}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 text-white shadow-sm shadow-blue-500/40"
                        : pillInactiveClass
                    }`}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
              <div ref={parentRef} className="mt-6">
                {renderTabContent()}
              </div>
            </section>
          </section>
        </div>

        {selectedImage && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4" onClick={handleCloseImage}>
            <div className={`relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border ${
              isDark ? "border-white/10 bg-slate-950/95 shadow-[0_40px_120px_-40px_rgba(59,130,246,0.7)]" : "border-slate-200 bg-white shadow-2xl"
            }`}>
              <button
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-red-500/90 text-white shadow-lg shadow-red-500/40"
                onClick={handleCloseImage}
              >
                &times;
              </button>
              {boxType === "img" ? (
                <img src={selectedImage} alt="Selected" className="h-full w-full object-contain" />
              ) : boxType === "video" ? (
                <video src={selectedImage} className="h-full w-full bg-black object-contain" controls />
              ) : (
                <div className="flex flex-1 items-center justify-center p-6 text-center text-slate-500">Unsupported file type</div>
              )}
            </div>
          </div>
        )}

        <div className={`relative z-20 mt-16 ${footerClass}`}>
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-center px-4">
            <Footer />
          </div>
        </div>
      </div>

      <ToastContainer />
    </main>
  );
}
