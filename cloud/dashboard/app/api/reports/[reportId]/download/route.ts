import { NextRequest, NextResponse } from "next/server";
import { getProjectForUser, recordProjectAuditEvent } from "../../../../../lib/control-plane";
import { resolveDashboardScope } from "../../../../../lib/env";
import { getSession } from "../../../../../lib/session";

type RouteContext = {
  params: {
    reportId: string;
  };
};

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scope = resolveDashboardScope({
    project_id: request.nextUrl.searchParams.get("project_id") ?? undefined,
    region: request.nextUrl.searchParams.get("region") ?? undefined,
  });
  if (!scope.projectId) {
    return NextResponse.json(
      {
        error: "missing_project_scope",
        message: "Provide project_id or configure DASHBOARD_DEFAULT_PROJECT_ID",
      },
      { status: 400 },
    );
  }
  const project = await getProjectForUser({
    userId: session.userId,
    projectId: scope.projectId,
  });
  if (!project) {
    return NextResponse.json({ error: "forbidden_project_access" }, { status: 403 });
  }

  const workerBaseUrl = process.env.DASHBOARD_WORKER_BASE_URL?.trim();
  const workerToken = process.env.DASHBOARD_WORKER_TOKEN?.trim();
  if (!workerBaseUrl || !workerToken) {
    return NextResponse.json(
      {
        error: "dashboard_misconfigured",
        message: "missing DASHBOARD_WORKER_BASE_URL or DASHBOARD_WORKER_TOKEN",
      },
      { status: 500 },
    );
  }

  const reportId = context.params.reportId;
  const response = await fetch(
    `${trimTrailingSlash(workerBaseUrl)}/v1/dashboard/reports/${encodeURIComponent(reportId)}/download-token`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-circlebox-dashboard-token": workerToken,
      },
      body: JSON.stringify({
        project_id: scope.projectId,
        region: scope.region,
        expires_in_sec: 300,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await safeReadJson(response);
    return NextResponse.json(
      {
        error: "download_token_issue_failed",
        status: response.status,
        body,
      },
      { status: response.status },
    );
  }

  const payload = await safeReadJson(response);
  const downloadUrl = typeof payload?.download_url === "string" ? payload.download_url : null;
  if (!downloadUrl) {
    return NextResponse.json(
      { error: "download_token_issue_failed", message: "missing download_url" },
      { status: 502 },
    );
  }

  await recordProjectAuditEvent({
    userId: session.userId,
    projectId: scope.projectId,
    actionType: "raw_report_download",
    metadata: {
      report_id: reportId,
      region: scope.region,
    },
  });

  return NextResponse.redirect(downloadUrl, 307);
}

async function safeReadJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const decoded = await response.json();
    if (typeof decoded === "object" && decoded !== null && !Array.isArray(decoded)) {
      return decoded as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
