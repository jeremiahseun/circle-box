import { NextRequest, NextResponse } from "next/server";
import { rotateApiKey } from "../../../../../../../lib/control-plane";
import { setKeyPreviewCookie } from "../../../../../../../lib/key-preview";
import { getSession } from "../../../../../../../lib/session";

type RouteContext = {
  params: {
    projectId: string;
    keyId: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }
  const { projectId, keyId } = context.params;

  try {
    const rotated = await rotateApiKey({
      userId: session.userId,
      projectId,
      apiKeyId: keyId,
    });
    setKeyPreviewCookie({
      projectId,
      generatedAtUnixMs: Date.now(),
      keys: [
        {
          key_type: rotated.key.key_type,
          secret: rotated.secret,
        },
      ],
    });
    return NextResponse.redirect(new URL(`/app/projects/${projectId}/keys?success=key_rotated`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "key_rotate_failed";
    return NextResponse.redirect(new URL(`/app/projects/${projectId}/keys?error=${message}`, request.url), 303);
  }
}
