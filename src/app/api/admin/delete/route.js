
import { getRequestContext } from '@cloudflare/next-on-pages';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Content-Type': 'application/json'
};

export const runtime = 'edge';






export async function DELETE(request) {
  let { name } = await request.json()
  const { env, cf, ctx } = getRequestContext();
  try {
    const setData = await env.IMG.prepare(`DELETE FROM imginfo WHERE url='${name}'`).run()

    let r2Deleted = false;
    if (env.IMGRS) {
      try {
        let key = name;
        if (key.startsWith("http")) {
          const url = new URL(key);
          key = url.pathname;
        }
        if (key.startsWith("/api/rfile/")) {
          key = key.replace("/api/rfile/", "");
        }
        if (key.startsWith("/rfile/")) {
          key = key.replace("/rfile/", "");
        }
        if (key) {
          await env.IMGRS.delete(key);
          r2Deleted = true;
        }
      } catch (r2Error) {
        console.warn("Failed to delete R2 object:", r2Error);
      }
    }

    return Response.json({
      "code": 200,
      "success": true,
      "message": setData.success,
      "r2Deleted": r2Deleted,
    });

  } catch (error) {
    return Response.json({
      "code": 500,
      "success": false,
      "message": error.message,
    }, {
      status: 500,
      headers: corsHeaders,
    })
  }
}
