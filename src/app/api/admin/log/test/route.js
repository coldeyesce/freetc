import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

// 测试日志记录的 API
export async function GET(request) {
  const { env } = getRequestContext();
  
  try {
    if (!env.IMG) {
      return Response.json({
        success: false,
        message: "Database not configured",
        details: {}
      }, { status: 500 });
    }

    // 测试插入日志
    const testTime = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const testUrl = '/test/log/test';
    const testReferer = 'test-referer';
    const testIp = '127.0.0.1';

    try {
      const insertResult = await env.IMG.prepare('INSERT INTO tgimglog (url, referer, ip, time) VALUES (?, ?, ?, ?)')
        .bind(testUrl, testReferer, testIp, testTime)
        .run();

      // 立即查询验证
      const verifyResult = await env.IMG.prepare('SELECT * FROM tgimglog WHERE url = ? ORDER BY id DESC LIMIT 1')
        .bind(testUrl)
        .first();

      // 获取总数
      const countResult = await env.IMG.prepare('SELECT COUNT(*) as total FROM tgimglog').first();

      return Response.json({
        success: true,
        message: "Log test successful",
        details: {
          insertResult: insertResult?.meta || insertResult,
          verifyResult,
          totalLogs: countResult?.total || 0,
          testData: { url: testUrl, referer: testReferer, ip: testIp, time: testTime }
        }
      });
    } catch (dbError) {
      return Response.json({
        success: false,
        message: "Database operation failed",
        error: dbError.message,
        details: {
          testData: { url: testUrl, referer: testReferer, ip: testIp, time: testTime }
        }
      }, { status: 500 });
    }

  } catch (error) {
    return Response.json({
      success: false,
      message: error.message || "Unknown error",
      details: {}
    }, { status: 500 });
  }
}
