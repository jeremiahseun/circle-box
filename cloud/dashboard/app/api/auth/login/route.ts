import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, listProjectsForUser } from "../../../../lib/control-plane";
import { setSessionCookie } from "../../../../lib/session";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const email = asString(form.get("email"));
  const password = asString(form.get("password"));
  if (!email || !password) {
    return NextResponse.redirect(new URL("/login?error=missing_credentials", request.url), 303);
  }

  const user = await authenticateUser({ email, password });
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=invalid_credentials", request.url), 303);
  }

  setSessionCookie({
    userId: user.id,
    email: user.email,
  });

  const projects = await listProjectsForUser(user.id);
  const targetPath = projects.length > 0 ? `/app/projects/${projects[0].id}/keys?success=login` : "/app/onboarding?success=login";
  return NextResponse.redirect(new URL(targetPath, request.url), 303);
}

function asString(input: FormDataEntryValue | null): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = input.trim();
  return value.length > 0 ? value : null;
}
