import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginRedirectTarget, safeNextPath } from "@/lib/auth/next-path";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  // Skip static assets, brand images, fonts, and files with extensions
  if (
    path.startsWith("/_next") ||
    path.startsWith("/brand/") ||
    path.startsWith("/fonts/") ||
    path.includes(".")
  ) {
    return supabaseResponse;
  }

  // Retrieve authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginRoute = path === "/login";

  // Redirects übernehmen die ggf. soeben erneuerten Session-Cookies.
  const redirectTo = (url: URL) => {
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  if (!user && !isLoginRoute) {
    // Redirect unauthenticated user to login page
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    // Rücksprung nach dem Login (z. B. Home-Bildschirm-App /auslagen).
    // "/" bleibt ohne next → wie bisher nach /start.
    const next = path === "/" ? null : safeNextPath(`${path}${request.nextUrl.search}`);
    if (next) loginUrl.searchParams.set("next", next);
    return redirectTo(loginUrl);
  }

  if (user && isLoginRoute) {
    // Redirect authenticated user away from login page (next bzw. /start)
    const target = loginRedirectTarget(request.nextUrl.searchParams.get("next"));
    return redirectTo(new URL(target, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
