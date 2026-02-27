import { NextRequest, NextResponse } from "next/server";
import { revokeApiKey } from "../../../../../../../lib/control-plane";
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
    await revokeApiKey({
      userId: session.userId,
      projectId,
      apiKeyId: keyId,
    });
    return NextResponse.redirect(new URL(`/app/projects/${projectId}/keys?success=key_revoked`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "key_revoke_failed";
    return NextResponse.redirect(new URL(`/app/projects/${projectId}/keys?error=${message}`, request.url), 303);
  }
}
