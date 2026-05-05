import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isAppRoute = request.nextUrl.pathname.startsWith("/app");

  if (!user && (isAdminRoute || isAppRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user) {
    // Читаем роль из cookie, которую мы установили при логине
    const role = request.cookies.get("user_role")?.value;

    if (isLoginPage) {
      if (role === "admin") {
        return NextResponse.redirect(new URL("/admin", request.url));
      } else {
        return NextResponse.redirect(new URL("/app/scan", request.url));
      }
    }

    if (isAdminRoute && role !== "admin") {
      return NextResponse.redirect(new URL("/app/scan", request.url));
    }

    if (isAppRoute && role === "admin") {
       // Админы тоже могут зайти в PWA, если нужно, 
       // но обычно перенаправляем на /admin
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
