import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "../../../../lib/session";

export async function POST(request: NextRequest) {
  clearSessionCookie();
  return NextResponse.redirect(new URL("/login?success=logged_out", request.url), 303);
}
