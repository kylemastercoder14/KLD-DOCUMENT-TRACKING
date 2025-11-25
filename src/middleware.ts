import { NextResponse, type NextRequest } from "next/server";
import { ROLE_CONFIG } from "@/lib/config";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isAuthRoute = ["/login", "/forgot-password"].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // 👇 await the async function (since jose is async)
  const user = await getUserFromToken(request);
  type RoleKey = keyof typeof ROLE_CONFIG;

  // If user is logged in and trying to access auth page, redirect to dashboard
  if (user && isAuthRoute) {
    if (user.role && user.role in ROLE_CONFIG) {
      return NextResponse.redirect(
        new URL(ROLE_CONFIG[user.role as RoleKey].dashboard, request.url)
      );
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("kld-document-tracking-auth-session");
    return response;
  }

  // Check if the route is public
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // If no user session and trying to access protected route, redirect to sign-in
  if (!user) {
    const signInUrl = new URL("/login", request.url);
    if (!isAuthRoute) {
      signInUrl.searchParams.set("redirect", pathname + search);
    }
    return NextResponse.redirect(signInUrl);
  }

  // Check if user has access
  const hasAccess = pathname.startsWith(
    ROLE_CONFIG[user.role as RoleKey].prefix
  );

  if (!hasAccess) {
    if (user.role in ROLE_CONFIG) {
      return NextResponse.redirect(
        new URL(ROLE_CONFIG[user.role as RoleKey].dashboard, request.url)
      );
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("kld-document-tracking-auth-session");
    return response;
  }

  return NextResponse.next();
}

// ✅ jose-compatible JWT decoder
async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get(
    "kld-document-tracking-auth-session"
  )?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      role: payload.role as string,
    };
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|eot|otf)).*)",
  ],
};
