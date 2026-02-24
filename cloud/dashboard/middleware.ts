import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const username = process.env.DASHBOARD_ADMIN_USERNAME?.trim();
  const password = process.env.DASHBOARD_ADMIN_PASSWORD?.trim();

  if (!username || !password) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorized();
  }

  const encoded = authHeader.slice("Basic ".length).trim();
  let decoded = "";
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) {
    return unauthorized();
  }
  const providedUsername = decoded.slice(0, separator);
  const providedPassword = decoded.slice(separator + 1);
  if (providedUsername !== username || providedPassword !== password) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/reports/:path*"],
};

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "www-authenticate": 'Basic realm="CircleBox Dashboard"',
    },
  });
}
