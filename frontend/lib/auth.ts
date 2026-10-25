import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "lazylens_session";
const SESSION_SECRET_STRING =
  process.env.SESSION_SECRET ||
  "lazylens-secure-session-key-fallback-must-be-configured-in-production-env-32bytes";
const ENCODED_KEY = new TextEncoder().encode(SESSION_SECRET_STRING);

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  plan?: string;
  iat?: number;
  exp?: number;
}

// 1. Password Management
export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hashed);
  } catch {
    return false;
  }
}

// 2. Token Creation & Verification
export async function createSessionToken(payload: {
  userId: string;
  email: string;
  name: string;
  plan?: string;
}): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(ENCODED_KEY);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ENCODED_KEY, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// 3. Server-side Cookie Helpers (Next.js App Router)
export function getCookieSettings() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  };
}

export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

// 4. Rate Limiter (In-Memory sliding window for login/register brute-force prevention)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(key: string, limit: number = 5, windowMs: number = 60000): { allowed: boolean; remainingMs: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remainingMs: windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remainingMs: record.resetAt - now };
  }

  record.count++;
  return { allowed: true, remainingMs: record.resetAt - now };
}
