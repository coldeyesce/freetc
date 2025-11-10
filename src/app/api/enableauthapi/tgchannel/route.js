export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { getBooleanConfig } from '@/lib/config';
import {
  ensureUploadLogsTable,
  ensureIpBlockTable,
  isIpBlocked,
  recordUploadLog,
  maybeAutoBlockIp,
} from '@/lib/uploadLogs';



const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'Content-Type',
	'Access-Control-Max-Age': '86400', // 24 hours
	'Content-Type': 'application/json'
};

let tgMetaTableEnsured = false;
async function ensureTelegramMetaTable(db) {
	if (tgMetaTableEnsured) return;
	try {
		await db
			.prepare(
				`CREATE TABLE IF NOT EXISTS tg_file_meta (
          file_id TEXT PRIMARY KEY,
          file_name TEXT,
          message_id INTEGER,
          chat_id TEXT
        )`,
			)
			.run();
	} finally {
		tgMetaTableEnsured = true;
	}
}

async function saveTelegramMeta(db, { fileId, fileName, messageId, chatId }) {
	if (!db || !fileId) return;
	await ensureTelegramMetaTable(db);
	await db
		.prepare(
			`INSERT INTO tg_file_meta (file_id, file_name, message_id, chat_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(file_id) DO UPDATE SET
         file_name = excluded.file_name,
         message_id = excluded.message_id,
         chat_id = excluded.chat_id`,
		)
		.bind(fileId, fileName ?? null, messageId ?? null, chatId ?? null)
		.run();
}

export async function POST(request) {
	const { env, cf, ctx } = getRequestContext();
	let logUploadEvent = async () => {};
	let capturedFileName = "";
	const storageLabel = "tg";
	
	if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) {
		return Response.json({
			status: 500,
			message: `TG_BOT_TOKEN or TG_CHAT_ID is not Set`,
			success: false
		}, {
			status: 500,
			headers: corsHeaders,
		})
	}

	const hasModerationService = Boolean(env.ModerateContentApiKey || env.RATINGAPI);
	const moderationEnabled = hasModerationService && env.IMG ? await getBooleanConfig(env.IMG, "moderation_enabled", false) : false;

	const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.socket.remoteAddress;
	const clientIp = ip ? ip.split(',')[0].trim() : 'IP not found';
	const Referer = request.headers.get('Referer') || "Referer";

	const formData = await request.formData();
	const uploadFile = formData.get('file');
	const originalFileName = typeof uploadFile?.name === "string" ? uploadFile.name : "";
	capturedFileName = originalFileName || `tg-upload-${Date.now()}`;

	if (env.IMG) {
		await ensureUploadLogsTable(env.IMG);
		await ensureIpBlockTable(env.IMG);
	}

	logUploadEvent = async ({ fileName = capturedFileName, status = "success", compliant = true, message: logMessage = "", ratingValue = null } = {}) => {
		if (!env.IMG) return;
		try {
			const rating = typeof ratingValue === "number" && Number.isFinite(ratingValue) ? ratingValue : null;
			await recordUploadLog(env.IMG, {
				fileName,
				storage: storageLabel,
				ip: clientIp,
				referer: Referer,
				rating,
				compliant,
				status,
				message: logMessage,
			});
		} catch (logError) {
			console.error("tg logUploadEvent error:", logError);
		}
	};

	if (!uploadFile || typeof uploadFile !== "object" || typeof uploadFile.stream !== "function") {
		await logUploadEvent({ status: "error", compliant: false, message: "未提供有效文件" });
		return Response.json(
			{
				status: 400,
				message: "请求体缺少有效文件",
				success: false,
			},
			{
				status: 400,
				headers: corsHeaders,
			},
		);
	}

	if (env.IMG) {
		const blockedInfo = await isIpBlocked(env.IMG, clientIp);
		if (blockedInfo) {
			await logUploadEvent({
				status: "blocked",
				compliant: false,
				message: blockedInfo.reason || "当前 IP 已被限制上传",
			});
			return Response.json(
				{
					status: 423,
					message: blockedInfo.reason || "当前 IP 已被限制上传",
					success: false,
				},
				{
					status: 423,
					headers: corsHeaders,
				},
			);
		}
	}
	const fileType = uploadFile.type || "";


	const req_url = new URL(request.url);

	const fileTypeMap = {
		'image/': { url: 'sendPhoto', type: 'photo' },
		'video/': { url: 'sendVideo', type: 'video' },
		'audio/': { url: 'sendAudio', type: 'audio' },
		'application/pdf': { url: 'sendDocument', type: 'document' }
	};

	let defaultType = { url: 'sendDocument', type: 'document' };

	const { url: endpoint, type: fileTypevalue } = Object.keys(fileTypeMap)
		.find(key => fileType.startsWith(key))
		? fileTypeMap[Object.keys(fileTypeMap).find(key => fileType.startsWith(key))]
		: defaultType;


	const up_url = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/${endpoint}`;
	let newformData = new FormData();
	newformData.append("chat_id", env.TG_CHAT_ID);
	newformData.append(fileTypevalue, uploadFile);

	try {
		const res_img = await fetch(up_url, {
			method: "POST",
			headers: {
				"User-Agent": " Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
			},
			body: newformData,
		});


		let responseData = await res_img.json();
		const fileData = await getFile(responseData);

		if (!fileData?.file_id) {
			await logUploadEvent({ status: "error", compliant: true, message: "Telegram 返回数据不完整" });
			return Response.json(
				{
					status: 502,
					message: "Telegram 返回的数据不完整，缺少文件 ID",
					success: false,
				},
				{
					status: 502,
					headers: corsHeaders,
				},
			);
		}


		const chatId = responseData?.result?.chat?.id ?? env.TG_CHAT_ID;
		const messageId = responseData?.result?.message_id ?? null;

		let rating_index = 0;
		if (hasModerationService) {
			rating_index = await getRating(env, `${fileData.file_id}`);
			if (moderationEnabled && rating_index >= 3) {
				if (messageId) {
					try {
						await deleteTelegramMessage(env, chatId, messageId);
					} catch (cleanupError) {
						console.warn("Failed to delete Telegram message after moderation rejection:", cleanupError);
					}
				}
				await logUploadEvent({
					status: "blocked",
					compliant: false,
					ratingValue: rating_index,
					message: "内容检测未通过",
				});
				if (env.IMG) {
					await maybeAutoBlockIp(env.IMG, clientIp);
				}

				return Response.json(
					{
						status: 422,
						message: "内容检测未通过，请更换文件后再试。",
						success: false,
					},
					{
						status: 422,
						headers: corsHeaders,
					},
				);
			}
		}


		const displayName =
			originalFileName ||
			fileData.file_name ||
			`${fileTypevalue || 'file'}-${Date.now()}`;

		const data = {
			"url": `${req_url.origin}/api/cfile/${fileData.file_id}`,
			"code": 200,
			"name": displayName
		}
		if (!env.IMG) {
			data.env_img = "null"
			return Response.json({
				...data,
				msg: "1"
			}, {
				status: 200,
				headers: corsHeaders,
			})
		} else {
			const nowTime = await get_nowTime();
			try {
				await insertImageData(env.IMG, `/cfile/${fileData.file_id}`, Referer, clientIp, rating_index, nowTime);
				await saveTelegramMeta(env.IMG, {
					fileId: fileData.file_id,
					fileName: displayName,
					messageId: responseData?.result?.message_id ?? null,
					chatId: env.TG_CHAT_ID,
				});

				await logUploadEvent({
					status: "success",
					compliant: rating_index < 3,
					ratingValue: rating_index,
				});

				return Response.json({
					...data,
					msg: "2",
					Referer: Referer,
					clientIp: clientIp,
					rating_index: rating_index,
					nowTime: nowTime
				}, {
					status: 200,
					headers: corsHeaders,
				})

			} catch (error) {
			await logUploadEvent({ status: "error", compliant: true, message: error.message || "上传失败" });
				console.log(error);
				await insertImageData(env.IMG, `/cfile/${fileData.file_id}`, Referer, clientIp, -1, nowTime);
				await saveTelegramMeta(env.IMG, {
					fileId: fileData.file_id,
					fileName: displayName,
					messageId: responseData?.result?.message_id ?? null,
					chatId: env.TG_CHAT_ID,
				});

				return Response.json({
					"msg": error.message
				}, {
					status: 500,
					headers: corsHeaders,
				})
			}
		}







	} catch (error) {
		await logUploadEvent({ status: "error", compliant: true, message: error.message || "上传失败" });
		return Response.json({
			status: 500,
			message: ` ${error.message}`,
			success: false
		}, {
			status: 500,
			headers: corsHeaders,
		})
	}

}

async function getFile_path(env, file_id) {
	try {
		const url = `https://api.telegram.org/bot${env.TG_BOT_TOKEN}/getFile?file_id=${file_id}`;
		const res = await fetch(url, {
			method: 'GET',
			headers: {
				"User-Agent": " Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome"
			},
		})

		let responseData = await res.json();

		if (responseData.ok) {
			const file_path = responseData.result.file_path
			return file_path
		} else {
			return "error";
		}
	} catch (error) {
		return "error";

	}
}

const getFile = async (response) => {
	try {
		if (!response.ok) {
			return null;
		}

		const getFileDetails = (file) => ({
			file_id: file.file_id,
			file_name: file.file_name || file.file_unique_id
		});

		if (response.result.photo) {
			const largestPhoto = response.result.photo.reduce((prev, current) =>
				(prev.file_size > current.file_size) ? prev : current
			);
			return getFileDetails(largestPhoto);
		}

		if (response.result.video) {
			return getFileDetails(response.result.video);
		}

		if (response.result.document) {
			return getFileDetails(response.result.document);
		}

		return null;
	} catch (error) {
		console.error('Error getting file id:', error.message);
		return null;
	}
};




async function deleteTelegramMessage(env, chatId, messageId) {
	if (!env?.TG_BOT_TOKEN || !chatId || !messageId) return;
	try {
		await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/deleteMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
		});
	} catch (error) {
		console.warn("Failed to delete Telegram message:", error);
	}
}

async function insertImageData(env, src, referer, ip, rating, time) {
	try {
		const instdata = await env.prepare(
			`INSERT INTO imginfo (url, referer, ip, rating, total, time)
           VALUES ('${src}', '${referer}', '${ip}', ${rating}, 1, '${time}')`
		).run()
	} catch (error) {

	};
}



async function get_nowTime() {
	const options = {
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	};
	const timedata = new Date();
	const formattedDate = new Intl.DateTimeFormat('zh-CN', options).format(timedata);

	return formattedDate

}



async function getRating(env, fileId) {
	try {
		const filePath = await getFile_path(env, fileId);
		if (!filePath) {
			throw new Error("Failed to resolve Telegram file path");
		}
		const assetUrl = `https://api.telegram.org/file/bot${env.TG_BOT_TOKEN}/${filePath}`;

		const customApi = (env.RATINGAPI || "").trim();
		if (customApi) {
			const target = buildRatingUrl(customApi, assetUrl);
			const res = await fetch(target, { headers: moderationRequestHeaders() });
			if (!res.ok) {
				throw new Error(`Custom rating API responded with ${res.status}`);
			}
			const data = await res.json();
			const interpretedScore = interpretCustomClassification(data);
			if (typeof interpretedScore === "number") {
				return interpretedScore;
			}
			if (Object.prototype.hasOwnProperty.call(data, "rating_index")) {
				return data.rating_index;
			}
		}

		const apikey = (env.ModerateContentApiKey || "").trim();
		if (apikey) {
			const res = await fetch(`https://api.moderatecontent.com/moderate/?key=${apikey}&url=${encodeURIComponent(assetUrl)}`, { headers: moderationRequestHeaders() });
			if (!res.ok) {
				throw new Error(`ModerateContent responded with ${res.status}`);
			}
			const data = await res.json();
			return Object.prototype.hasOwnProperty.call(data, "rating_index") ? data.rating_index : -1;
		}

		return 0;
	} catch (error) {
		console.error("tgchannel getRating error:", error);
		return -1;
	}
}

function buildRatingUrl(base, url) {
	const trimmed = base.trim();
	if (trimmed.endsWith("url=")) {
		return `${trimmed}${encodeURIComponent(url)}`;
	}
	const hasQuery = trimmed.includes("?");
	const endsWithConnector = hasQuery && /[?&]$/.test(trimmed);
	const connector = hasQuery ? (endsWithConnector ? "" : "&") : "?";
	return `${trimmed}${connector}url=${encodeURIComponent(url)}`;
}

function interpretCustomClassification(payload) {
	if (Array.isArray(payload)) {
		const pornEntry = payload.find(
			(item) => typeof item?.className === "string" && item.className.toLowerCase() === "porn",
		);
		const pornScore = Number(pornEntry?.probability) || 0;
		return pornScore >= 0.6 ? 4 : 0;
	}

	if (payload && typeof payload === "object") {
		if (Array.isArray(payload.data)) {
			return interpretCustomClassification(payload.data);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "rating_index")) {
			return payload.rating_index;
		}
	}

	return null;
}

function moderationRequestHeaders() {
	return {
		Accept: "application/json",
		"User-Agent": "FreeTC-Moderation/1.0",
	};
}

