import { NextRequest, NextResponse } from "next/server";
import { createInviteForProject } from "../../../../../../lib/control-plane";
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
  const expiresInDaysRaw = asString(form.get("expires_in_days"));
  const expiresInDays = Number(expiresInDaysRaw ?? "7");

  try {
    const created = await createInviteForProject({
      userId: session.userId,
      projectId,
      expiresInDays: Number.isFinite(expiresInDays) ? expiresInDays : 7,
    });
    const inviteToken = encodeURIComponent(created.inviteToken);
    return NextResponse.redirect(
      new URL(`/app/projects/${projectId}/invites?success=invite_created&invite_token=${inviteToken}`, request.url),
      303,
    );
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "invite_create_failed";
    return NextResponse.redirect(new URL(`/app/projects/${projectId}/invites?error=${message}`, request.url), 303);
  }
}

function asString(input: FormDataEntryValue | null): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = input.trim();
  return value.length > 0 ? value : null;
}
