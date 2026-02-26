import { NextRequest, NextResponse } from "next/server";
import { clearKeyPreviewCookie } from "../../../../../../lib/key-preview";
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
  clearKeyPreviewCookie();
  return NextResponse.redirect(new URL(`/app/projects/${context.params.projectId}/keys?success=preview_cleared`, request.url), 303);
}
