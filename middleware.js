import { NextResponse } from "next/server";

/** Next.js routes match the folder name exactly. Send /hok, /Hok, and so on to /HOK. */
export function middleware(request) {
  const url = request.nextUrl.clone();
  const segments = url.pathname.split("/");
  const head = segments[1];
  if (!head || head === "HOK" || head.toLowerCase() !== "hok") {
    return NextResponse.next();
  }
  segments[1] = "HOK";
  url.pathname = segments.join("/");
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
