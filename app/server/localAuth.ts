import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { COOKIE_NAME } from "@shared/const";
import type { User } from "../drizzle/schema";
import { ensureLocalAdmin, getUserByOpenId } from "./db";

const scrypt = promisify(scryptCallback);
const LOCAL_ADMIN_OPEN_ID = "local-admin";
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

type AttemptWindow = { attempts: number; startedAt: number };
const failedLoginAttempts = new Map<string, AttemptWindow>();

function requiredConfig() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const jwtSecret = process.env.JWT_SECRET;
  if (!email || !passwordHash || !jwtSecret) return null;
  return { email, passwordHash, jwtSecret };
}

function sessionKey() {
  const config = requiredConfig();
  if (!config) throw new Error("Local administrator authentication is not configured");
  return new TextEncoder().encode(config.jwtSecret);
}

export async function hashLocalPassword(password: string, salt = randomBytes(16).toString("base64url")) {
  if (password.length < 12) throw new Error("Password must be at least 12 characters long");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyLocalPassword(password: string, storedHash: string) {
  const [algorithm, salt, stored] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !stored) return false;
  try {
    const expected = Buffer.from(stored, "base64url");
    const derived = await scrypt(password, salt, expected.length) as Buffer;
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

function requestKey(req: Request) {
  const forwarded = req.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.ip || "unknown";
}

export function isLoginRateLimited(req: Request) {
  const key = requestKey(req);
  const entry = failedLoginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.startedAt >= LOGIN_WINDOW_MS) {
    failedLoginAttempts.delete(key);
    return false;
  }
  return entry.attempts >= MAX_LOGIN_ATTEMPTS;
}

export function recordFailedLogin(req: Request) {
  const key = requestKey(req);
  const now = Date.now();
  const current = failedLoginAttempts.get(key);
  if (!current || now - current.startedAt >= LOGIN_WINDOW_MS) {
    failedLoginAttempts.set(key, { attempts: 1, startedAt: now });
    return;
  }
  current.attempts += 1;
}

export function clearFailedLogins(req: Request) {
  failedLoginAttempts.delete(requestKey(req));
}

export function resetLoginRateLimitsForTesting() {
  if (process.env.NODE_ENV === "production") throw new Error("Rate-limit reset is unavailable in production");
  failedLoginAttempts.clear();
}

export async function authenticateLocalAdmin(email: string, password: string): Promise<User | null> {
  const config = requiredConfig();
  if (!config || email.trim().toLowerCase() !== config.email) return null;
  if (!(await verifyLocalPassword(password, config.passwordHash))) return null;
  return ensureLocalAdmin(config.email);
}

export async function createLocalSession(user: User) {
  return new SignJWT({ scope: "commentloom-admin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.openId)
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_DURATION_MS) / 1000))
    .sign(sessionKey());
}

export async function getLocalSessionUser(req: Request): Promise<User | null> {
  const token = parseCookieHeader(req.headers.cookie ?? "")[COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
    if (payload.sub !== LOCAL_ADMIN_OPEN_ID || payload.scope !== "commentloom-admin") return null;
    const user = await getUserByOpenId(LOCAL_ADMIN_OPEN_ID);
    return user?.role === "admin" ? user : null;
  } catch {
    return null;
  }
}

export function getSessionDurationMs() {
  return SESSION_DURATION_MS;
}

export function localAdminFingerprint(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}
