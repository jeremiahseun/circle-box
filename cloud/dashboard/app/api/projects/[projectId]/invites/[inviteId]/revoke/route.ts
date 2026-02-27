import { NextRequest, NextResponse } from "next/server";
import { revokeInviteForProject } from "../../../../../../../lib/control-plane";
import { getSession } from "../../../../../../../lib/session";

type RouteContext = {
  params: {
    projectId: string;
    inviteId: string;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const { projectId, inviteId } = context.params;
  try {
    await revokeInviteForProject({
      userId: session.userId,
      projectId,
      inviteId,
    });
    return NextResponse.redirect(new URL(`/app/projects/${projectId}/invites?success=invite_revoked`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "invite_revoke_failed";
    return NextResponse.redirect(new URL(`/app/projects/${projectId}/invites?error=${message}`, request.url), 303);
  }
}
