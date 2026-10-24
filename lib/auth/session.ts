import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 horas

function getSecret(){
    const secret = process.env.JWT_SECRET;
    if (!secret || new TextEncoder().encode(secret).length < 32){
        throw new Error("JWT_SECRET debe tener al menos 32 bytes.");
    }

    return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: string){
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userId)
        .setIssuer("eco-drive-alert")
        .setAudience("eco-drive-alert-app")
        .setIssuedAt(now)
        .setExpirationTime(now + SESSION_DURATION_SECONDS)
        .sign(getSecret());
}

export function sessionCookieOptions(){
    return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}

export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      issuer: "eco-drive-alert",
      audience: "eco-drive-alert-app",
    });

    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export const sessionCookieName = COOKIE_NAME;