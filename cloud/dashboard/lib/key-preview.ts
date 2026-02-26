import { cookies } from "next/headers";

const PREVIEW_COOKIE = "circlebox_key_preview_v1";
const PREVIEW_TTL_SEC = 60 * 5;

export type KeyPreview = {
  projectId: string;
  generatedAtUnixMs: number;
  keys: Array<{
    key_type: "ingest" | "usage_beacon";
    secret: string;
  }>;
};

export function setKeyPreviewCookie(preview: KeyPreview): void {
  cookies().set({
    name: PREVIEW_COOKIE,
    value: JSON.stringify(preview),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PREVIEW_TTL_SEC,
  });
}

export function clearKeyPreviewCookie(): void {
  cookies().set({
    name: PREVIEW_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function readKeyPreview(projectId: string): KeyPreview | null {
  const raw = cookies().get(PREVIEW_COOKIE)?.value;
  if (!raw) {
    return null;
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof decoded !== "object" || decoded === null || Array.isArray(decoded)) {
    return null;
  }
  const payload = decoded as Record<string, unknown>;
  if (payload.projectId !== projectId || !Array.isArray(payload.keys)) {
    return null;
  }

  const keys = payload.keys
    .map((item) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        return null;
      }
      const row = item as Record<string, unknown>;
      const keyType = row.key_type;
      const secret = row.secret;
      if ((keyType !== "ingest" && keyType !== "usage_beacon") || typeof secret !== "string" || secret.length === 0) {
        return null;
      }
      return {
        key_type: keyType,
        secret,
      } as KeyPreview["keys"][number];
    })
    .filter((row): row is KeyPreview["keys"][number] => row !== null);

  if (keys.length === 0) {
    return null;
  }

  return {
    projectId,
    generatedAtUnixMs: typeof payload.generatedAtUnixMs === "number" ? payload.generatedAtUnixMs : Date.now(),
    keys,
  };
}
