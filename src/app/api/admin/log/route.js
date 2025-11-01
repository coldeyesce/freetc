import { getRequestContext } from '@cloudflare/next-on-pages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Content-Type': 'application/json'
};

export const runtime = 'edge';

export async function POST(request) {
  const { env } = getRequestContext();
  
  try {
    // 检查数据库是否存在
    if (!env.IMG) {
      return Response.json({
        "code": 500,
        "success": false,
        "message": "Database not configured",
        "data": [],
      }, {
        status: 500,
        headers: corsHeaders,
      });
    }

    let { page = 0, query = null } = await request.json();
    
    // 确保 page 是数字
    page = parseInt(page) || 0;
    const pageSize = 20; // 匹配前端期望的每页数量
    
    let results, totalResult;

    if (query && query.trim()) {
      // 使用参数化查询防止SQL注入，并使用LEFT JOIN获取所有日志
      const searchQuery = `%${query.trim()}%`;
      const ps = env.IMG.prepare(`
        SELECT 
          tgimglog.id,
          tgimglog.url,
          tgimglog.referer,
          tgimglog.ip,
          tgimglog.time,
          imginfo.rating,
          imginfo.total
        FROM tgimglog
        LEFT JOIN imginfo ON tgimglog.url = imginfo.url
        WHERE tgimglog.url LIKE ? 
           OR tgimglog.ip LIKE ?
           OR tgimglog.referer LIKE ?
        ORDER BY tgimglog.id DESC 
        LIMIT ? OFFSET ?
      `).bind(searchQuery, searchQuery, searchQuery, pageSize, page * pageSize);
      
      const { results: logResults } = await ps.all();
      results = logResults;
      
      // 获取总数
      const totalPs = env.IMG.prepare(`
        SELECT COUNT(*) as total 
        FROM tgimglog
        WHERE url LIKE ? 
           OR ip LIKE ?
           OR referer LIKE ?
      `).bind(searchQuery, searchQuery, searchQuery);
      totalResult = await totalPs.first();
    } else {
      // 无查询条件，获取所有日志，使用LEFT JOIN
      const ps = env.IMG.prepare(`
        SELECT 
          tgimglog.id,
          tgimglog.url,
          tgimglog.referer,
          tgimglog.ip,
          tgimglog.time,
          imginfo.rating,
          imginfo.total
        FROM tgimglog
        LEFT JOIN imginfo ON tgimglog.url = imginfo.url
        ORDER BY tgimglog.id DESC 
        LIMIT ? OFFSET ?
      `).bind(pageSize, page * pageSize);
      
      const { results: logResults } = await ps.all();
      results = logResults;
      
      // 获取总数
      const totalPs = env.IMG.prepare(`SELECT COUNT(*) as total FROM tgimglog`);
      totalResult = await totalPs.first();
    }

    return Response.json({
      "code": 200,
      "success": true,
      "message": "success",
      "data": results || [],
      "page": page,
      "total": totalResult?.total || 0
    }, {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Log API Error:', error);
    return Response.json({
      "code": 500,
      "success": false,
      "message": error.message || "Internal server error",
      "data": [],
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
}



