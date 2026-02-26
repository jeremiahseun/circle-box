import { NextRequest, NextResponse } from "next/server";
import { createUserAccount } from "../../../../lib/control-plane";
import { setKeyPreviewCookie } from "../../../../lib/key-preview";
import { setSessionCookie } from "../../../../lib/session";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = asString(form.get("email"));
  const password = asString(form.get("password"));
  const organizationName = asString(form.get("organization_name"));
  const projectName = asString(form.get("project_name"));
  const regionRaw = asString(form.get("region"));
  const region = regionRaw === "eu" ? "eu" : "us";

  if (!email || !password || !organizationName || !projectName) {
    return NextResponse.redirect(new URL("/signup?error=missing_fields", request.url), 303);
  }

  try {
    const created = await createUserAccount({
      email,
      password,
      organizationName,
      projectName,
      region,
    });
    setSessionCookie({
      userId: created.user.id,
      email: created.user.email,
    });
    setKeyPreviewCookie({
      projectId: created.project.id,
      generatedAtUnixMs: Date.now(),
      keys: created.keys.map((key) => ({
        key_type: key.key.key_type,
        secret: key.secret,
      })),
    });
    return NextResponse.redirect(new URL(`/app/projects/${created.project.id}/keys?success=account_created`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "signup_failed";
    return NextResponse.redirect(new URL(`/signup?error=${message}`, request.url), 303);
  }
}

function asString(input: FormDataEntryValue | null): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = input.trim();
  return value.length > 0 ? value : null;
}
