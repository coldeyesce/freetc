export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import { auth } from "@/auth";

export async function GET(request) {
  const enableAuthapi = String(process.env.ENABLE_AUTH_API || '').trim().toLowerCase() === 'true';
  const session = await auth(request);
  const role = session?.user?.role ?? null;
 
  return new Response(
    JSON.stringify({
      status: role ? "success" : "guest",
      message: role ? "You are logged in by user !" : "No active session",
      success: Boolean(role),
      enableAuthapi,
      role,
    }),
    {
      status: role ? 200 : 401,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  )
}
