import { NextRequest, NextResponse } from "next/server";
import { createProjectForUser } from "../../../../lib/control-plane";
import { getSession } from "../../../../lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", request.url), 303);
  }
  const form = await request.formData();
  const projectName = asString(form.get("project_name"));
  const regionRaw = asString(form.get("region"));
  const region = regionRaw === "eu" ? "eu" : "us";
  if (!projectName) {
    return NextResponse.redirect(new URL("/app/projects/new?error=missing_project_name", request.url), 303);
  }

  try {
    const project = await createProjectForUser({
      userId: session.userId,
      projectName,
      region,
    });
    return NextResponse.redirect(new URL(`/app/projects/${project.id}/keys?success=project_created`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? encodeURIComponent(error.message) : "project_create_failed";
    return NextResponse.redirect(new URL(`/app/projects/new?error=${message}`, request.url), 303);
  }
}

function asString(input: FormDataEntryValue | null): string | null {
  if (typeof input !== "string") {
    return null;
  }
  const value = input.trim();
  return value.length > 0 ? value : null;
}
