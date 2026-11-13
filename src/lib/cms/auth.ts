import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getUser, type Role } from "./db";

/*
  Admin sessions: a signed, HttpOnly cookie (HS256, SESSION_SECRET) holding the editor's email and
  their account's session version. Every page and Server Action checks the account in the database
  (requireSession), so removing an editor, changing their role or changing a password takes
  effect at once, not when the cookie expires. Passwords are stored as scrypt hashes. No
  third-party auth service.
*/

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const SESSION_COOKIE = "vb_admin";
const SESSION_DAYS = 7;

export type Session = { email: string; name: string; role: Role };
type Token = { email: string; v: number };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (32+ characters) to use the admin.");
  return new TextEncoder().encode("vision-blend-local-development-only-secret");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

// Checked when the email has no account, so a wrong email takes as long as a wrong password
const DUMMY_HASH = `scrypt$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(64).toString("base64")}`;

/** `stored` undefined (no such account) still runs the hash, then fails */
export async function verifyPassword(password: string, stored: string | undefined) {
  const [scheme, salt, hash] = (stored ?? DUMMY_HASH).split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected) && stored !== undefined;
}

async function createSessionToken(token: Token) {
  return new SignJWT({ ...token })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

/** The signed token's contents, without the account check (the proxy uses this to redirect early). */
export async function readSessionToken(token: string | undefined): Promise<Token | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.email !== "string" || typeof payload.v !== "number") return null;
    return { email: payload.email, v: payload.v };
  } catch {
    return null;
  }
}

export async function startSession(user: { email: string; session_version: number }) {
  (await cookies()).set(SESSION_COOKIE, await createSessionToken({ email: user.email, v: user.session_version }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax so links into the admin (from chat, email) open signed in; Server Actions check the Origin
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in editor, checked against their account (once per request) */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = await readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!token) return null;
  const user = await getUser(token.email);
  if (!user || user.session_version !== token.v) return null;
  return { email: user.email, name: user.name, role: user.role };
});

/** For admin pages and actions: the signed-in editor, or a redirect to the login page. */
export async function requireSession(role?: Role): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (role === "owner" && session.role !== "owner") redirect("/");
  return session;
}
