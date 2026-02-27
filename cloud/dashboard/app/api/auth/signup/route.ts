import { NextRequest, NextResponse } from "next/server";
import { createUserAccount } from "../../../../lib/control-plane";
import { clearKeyPreviewCookie } from "../../../../lib/key-preview";
import { setSessionCookie } from "../../../../lib/session";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = asString(form.get("email"));
  const password = asString(form.get("password"));
  const organizationName = asNullableString(form.get("organization_name"));
  const inviteToken = asNullableString(form.get("invite_token"));
  const inviteParam = inviteToken ? `&invite_token=${encodeURIComponent(inviteToken)}` : "";

  if (!email || !password) {
    return NextResponse.redirect(new URL(`/signup?error=missing_fields${inviteParam}`, request.url), 303);
  }

  try {
    const created = await createUserAccount({
      email,
      password,
      organizationName,
      inviteToken,
    });
    setSessionCookie({
      userId: created.user.id,
      email: created.user.email,
    });
    clearKeyPreviewCookie();
    const successParam = created.joinedViaInvite ? "account_created_invite_joined" : "account_created";
    return NextResponse.redirect(new URL(`/app/onboarding?success=${successParam}`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "signup_failed";
    return NextResponse.redirect(new URL(`/signup?error=${message}${inviteParam}`, request.url), 303);
  }
}

function asString(input: FormDataEntryValue | null): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = input.trim();
  return value.length > 0 ? value : null;
}

function asNullableString(input: FormDataEntryValue | null): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }
  const value = input.trim();
  return value.length > 0 ? value : undefined;
}
