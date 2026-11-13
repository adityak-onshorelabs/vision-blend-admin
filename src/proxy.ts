import { NextResponse, type NextRequest } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/cms/auth";

// Every page but the login needs a valid session; each page and Server Action checks it again
// (requireSession), this just sends visitors to the login first.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/login") return;
  if (await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value)) return;
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Skips Next internals and files with an extension (images, favicon.ico, robots.txt). The dot
  // must reach the pattern escaped ("\\." in this string): unescaped, ".*..*" matched every path
  // and the proxy only ever ran on "/".
  matcher: ["/((?!_next/|images/|.*\\..*).*)"],
};
