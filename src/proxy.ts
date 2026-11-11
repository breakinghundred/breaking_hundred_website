import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-session";

/** Sends visitors without an admin session to the sign-in page. Each page and action re-checks it. */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (verifySession(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = pathname === "/admin" && !search ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
