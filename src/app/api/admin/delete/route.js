import { getRequestContext } from '@cloudflare/next-on-pages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Content-Type': 'application/json'
};

export const runtime = 'edge';

// 获取当前时间
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
  return formattedDate;
}

// 插入日志记录
async function insertTgImgLog(DB, url, referer, ip, time) {
  try {
    const result = await DB.prepare('INSERT INTO tgimglog (url, referer, ip, time) VALUES (?, ?, ?, ?)')
      .bind(url, referer, ip, time)
      .run();
    // Cloudflare D1 的 run() 方法不返回 { success }，而是直接返回结果对象
    // 如果执行成功，result 会包含 metadata 等信息
    if (result && (result.meta || result.success !== false)) {
      return { success: true, result };
    }
    return { success: false, error: 'Unknown error' };
  } catch (error) {
    console.error('Error inserting log:', error);
    console.error('Log insert error details:', { url, referer, ip, time, error: error.message });
    // 返回错误信息以便调试
    return { success: false, error: error.message };
  }
}

export async function DELETE(request) {
  const { env } = getRequestContext();
  
  if (!env.IMG) {
    console.error('Database IMG not configured in delete API');
    return Response.json({
      "code": 500,
      "success": false,
      "message": "Database not configured",
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }

  try {
    let { name } = await request.json();
    
    if (!name) {
      return Response.json({
        "code": 400,
        "success": false,
        "message": "Missing file name",
      }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 获取请求信息用于日志
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown';
    const clientIp = ip ? ip.split(',')[0].trim() : 'Unknown';
    const referer = request.headers.get('Referer') || '/admin';
    const nowTime = await get_nowTime();

    // 删除文件记录（使用参数化查询防止SQL注入）
    const setData = await env.IMG.prepare('DELETE FROM imginfo WHERE url = ?').bind(name).run();
    
    // 记录删除操作到日志（必须在删除之后，确保有内容可记录）
    const logResult = await insertTgImgLog(env.IMG, name, `删除操作-${referer}`, clientIp, nowTime);
    if (!logResult.success) {
      console.error('Failed to log delete operation:', logResult.error);
      console.error('Delete operation details:', { url: name, referer, ip: clientIp, time: nowTime });
    } else {
      console.log('Delete operation logged successfully:', { url: name, referer, ip: clientIp });
    }

    return Response.json({
      "code": 200,
      "success": true,
      "message": "Deleted successfully",
    }, {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Delete error:', error);
    return Response.json({
      "code": 500,
      "success": false,
      "message": error.message || "Internal server error",
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}
