export const runtime = 'edge';
import { getRequestContext } from '@cloudflare/next-on-pages';



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

	const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || request.socket.remoteAddress;
	const clientIp = ip ? ip.split(',')[0].trim() : 'IP not found';
	const Referer = request.headers.get('Referer') || "Referer";

	const formData = await request.formData();
	const uploadFile = formData.get('file');
	if (!uploadFile || typeof uploadFile !== "object" || typeof uploadFile.stream !== "function") {
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
	const fileType = uploadFile.type || "";
	const originalFileName = typeof uploadFile.name === "string" ? uploadFile.name : "";

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
			try {
				const rating_index = await getRating(env, `${fileData.file_id}`);
				const nowTime = await get_nowTime()
				await insertImageData(env.IMG, `/cfile/${fileData.file_id}`, Referer, clientIp, rating_index, nowTime);
				await saveTelegramMeta(env.IMG, {
					fileId: fileData.file_id,
					fileName: displayName,
					messageId: responseData?.result?.message_id ?? null,
					chatId: env.TG_CHAT_ID,
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



async function getRating(env, url) {

	try {
		const file_path = await getFile_path(env, url);

		const apikey = env.ModerateContentApiKey
		const ModerateContentUrl = apikey ? `https://api.moderatecontent.com/moderate/?key=${apikey}&` : ""

		const ratingApi = env.RATINGAPI ? `${env.RATINGAPI}?` : ModerateContentUrl;

		if (ratingApi) {
			const res = await fetch(`${ratingApi}url=https://api.telegram.org/file/bot${env.TG_BOT_TOKEN}/${file_path}`);
			const data = await res.json();
			const rating_index = data.hasOwnProperty('rating_index') ? data.rating_index : -1;

			return rating_index;
		} else {
			return 0
		}


	} catch (error) {
		return -1
	}
}
