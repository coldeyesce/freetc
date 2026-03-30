import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function deprecated() {
  return NextResponse.json(
    {
      ok: false,
      message: "Auth.js route removed. Use /api/login and /api/logout.",
    },
    { status: 410 },
  );
}

export const GET = deprecated;
export const POST = deprecated;
