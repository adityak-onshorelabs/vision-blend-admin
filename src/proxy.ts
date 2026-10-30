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
  matcher: ["/((?!_next|images|favicon.ico|robots.txt|.*\..*).*)"],
};
