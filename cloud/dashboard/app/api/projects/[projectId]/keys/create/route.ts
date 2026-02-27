import { NextRequest, NextResponse } from "next/server";
import { createApiKeyForProject } from "../../../../../../lib/control-plane";
import { setKeyPreviewCookie } from "../../../../../../lib/key-preview";
import { getSession } from "../../../../../../lib/session";

type RouteContext = {
  params: {
    projectId: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }
  const projectId = context.params.projectId;
  const form = await request.formData();
  const keyTypeRaw = asString(form.get("key_type"));
  const keyType = keyTypeRaw === "usage_beacon" ? "usage_beacon" : "ingest";

  try {
    const created = await createApiKeyForProject({
      userId: session.userId,
      projectId,
      keyType,
    });
    setKeyPreviewCookie({
      projectId,
      generatedAtUnixMs: Date.now(),
      keys: [
        {
          key_type: created.key.key_type,
          secret: created.secret,
        },
      ],
    });
    return NextResponse.redirect(new URL(`/app/projects/${projectId}/keys?success=key_created`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "key_create_failed";
    return NextResponse.redirect(new URL(`/app/projects/${projectId}/keys?error=${message}`, request.url), 303);
  }
}

function asString(input: FormDataEntryValue | null): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = input.trim();
  return value.length > 0 ? value : null;
}
