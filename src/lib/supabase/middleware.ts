import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isWorkspaceRoute } from "@/lib/navigation/app-nav";

const AUTH_ROUTES = ["/login", "/signup"];

function isProtectedRoute(pathname: string) {
  return pathname.startsWith("/onboarding") || isWorkspaceRoute(pathname);
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = isProtectedRoute(pathname);
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname === p);

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const completed = profile?.onboarding_completed ?? false;

    if (isAuthRoute) {
      const dest = completed ? "/dashboard" : "/onboarding";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    if (pathname.startsWith("/onboarding") && completed) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (isWorkspaceRoute(pathname) && !completed) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return supabaseResponse;
}
