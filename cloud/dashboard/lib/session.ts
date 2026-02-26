import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getControlPlaneRuntimeConfig } from "./control-env";

const SESSION_COOKIE = "circlebox_session_v1";
const SESSION_TTL_SEC = 60 * 60 * 24 * 30;

export type DashboardSession = {
  userId: string;
  email: string;
  expUnixMs: number;
};

export async function getSession(): Promise<DashboardSession | null> {
  const store = cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return parseSessionToken(token);
}

export async function requireSession(): Promise<DashboardSession> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export function setSessionCookie(input: { userId: string; email: string }): void {
  const token = signSessionToken({
    userId: input.userId,
    email: input.email,
    expUnixMs: Date.now() + SESSION_TTL_SEC * 1000,
  });
  cookies().set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export function clearSessionCookie(): void {
  cookies().set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

function signSessionToken(payload: DashboardSession): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getControlPlaneRuntimeConfig().sessionSecret)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function parseSessionToken(token: string): DashboardSession | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", getControlPlaneRuntimeConfig().sessionSecret)
    .update(encodedPayload)
    .digest("base64url");

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof decoded !== "object" || decoded === null || Array.isArray(decoded)) {
    return null;
  }

  const payload = decoded as Record<string, unknown>;
  const userId = asNonEmptyString(payload.userId);
  const email = asNonEmptyString(payload.email);
  const expUnixMs = typeof payload.expUnixMs === "number" ? payload.expUnixMs : NaN;
  if (!userId || !email || !Number.isFinite(expUnixMs) || expUnixMs <= Date.now()) {
    return null;
  }

  return {
    userId,
    email,
    expUnixMs,
  };
}

function asNonEmptyString(input: unknown): string | null {
  return typeof input === "string" && input.trim().length > 0 ? input.trim() : null;
}
