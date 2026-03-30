import { auth } from "@/auth"

const LOGIN = '/login'
const API_ADMIN = "/api/admin"
const ADMIN_PAGE = "/admin"
const AUTH_API = "/api/enableauthapi"

export default async function middleware(req) {
    const { nextUrl } = req;
    const enableAuthapi = String(process.env.ENABLE_AUTH_API || '').trim().toLowerCase() === 'true';
    const session = await auth(req);
    const role = session?.user?.role;

    const isAuthenticated = !!session?.user;
    const isAPI_ADMIN = nextUrl.pathname.startsWith(API_ADMIN);
    const isADMIN_PAGE = nextUrl.pathname.startsWith(ADMIN_PAGE);
    const isAuthAPI = nextUrl.pathname.startsWith(AUTH_API);

    if (!isAuthenticated) {
        if (isAPI_ADMIN) {
            return Response.json(
                { status: "fail", message: "You are not logged in by admin !", success: false },
                { status: 401 },
            )
        }
        if (isADMIN_PAGE) {
            return Response.redirect(new URL(LOGIN, nextUrl));
        }
        if (isAuthAPI && enableAuthapi) {
            return Response.json(
                { status: "fail", message: "You are not logged in by user !", success: false },
                { status: 401 }
            );
        }
        return;
    }

    if (role === 'admin') {
        return;
    }

    if (role === 'user' && (isAPI_ADMIN || isADMIN_PAGE)) {
        return Response.redirect(new URL(LOGIN, nextUrl));
    }
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/api/admin/:path*",
        "/api/enableauthapi/:path*"
    ],
};
