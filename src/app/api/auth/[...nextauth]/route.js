import { handlers } from "@/auth"
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const { GET, POST } = handlers