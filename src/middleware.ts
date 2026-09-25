import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/onboarding/:path*",
    "/dashboard/:path*",
    "/create/:path*",
    "/calendar/:path*",
    "/campaigns/:path*",
    "/analytics/:path*",
    "/social/:path*",
    "/clients/:path*",
    "/reports/:path*",
    "/messages/:path*",
    "/notifications/:path*",
    "/publishing/:path*",
    "/intelligence/:path*",
    "/assistant/:path*",
    "/ai/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/login",
    "/signup",
  ],
};
