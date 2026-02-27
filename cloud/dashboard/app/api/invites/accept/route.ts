import { NextRequest, NextResponse } from "next/server";
import { acceptInviteForUser } from "../../../../lib/control-plane";
import { getSession } from "../../../../lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }

  const form = await request.formData();
  const inviteToken = asString(form.get("invite_token"));
  if (!inviteToken) {
    return NextResponse.redirect(new URL("/app/onboarding?error=missing_invite_token", request.url), 303);
  }

  try {
    await acceptInviteForUser({
      userId: session.userId,
      inviteToken,
    });
    return NextResponse.redirect(new URL("/app/onboarding?success=invite_accepted", request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "invite_accept_failed";
    return NextResponse.redirect(new URL(`/app/onboarding?error=${message}&token=${encodeURIComponent(inviteToken)}`, request.url), 303);
  }
}

function asString(input: FormDataEntryValue | null): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = input.trim();
  return value.length > 0 ? value : null;
}
