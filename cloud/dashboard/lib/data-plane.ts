import { getDashboardRuntimeConfig, type DashboardRegion } from "./env";

export type DashboardReport = {
  id: string;
  platform: string;
  app_version: string;
  build_number: string;
  crash_fingerprint: string | null;
  event_count: number;
  generated_at_unix_ms: number;
  export_source: string;
  capture_reason: string;
  storage_path: string;
  created_at: string;
};

export type DashboardEvent = {
  seq: number;
  timestamp_unix_ms: number;
  type: string;
  thread: string;
  severity: string;
  attrs: Record<string, unknown>;
};

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

export async function listReports(input: {
  projectId: string;
  region: DashboardRegion;
  platform?: string;
  crashFingerprint?: string;
  limit?: number;
}): Promise<DashboardReport[]> {
  const query = new URLSearchParams({
    project_id: `eq.${input.projectId}`,
    select: [
      "id",
      "platform",
      "app_version",
      "build_number",
      "crash_fingerprint",
      "event_count",
      "generated_at_unix_ms",
      "export_source",
      "capture_reason",
      "storage_path",
      "created_at",
    ].join(","),
    order: "created_at.desc",
    limit: String(clamp(input.limit ?? 100, 1, 200)),
  });

  if (input.platform && input.platform.trim().length > 0) {
    query.set("platform", `eq.${input.platform.trim()}`);
  }
  if (input.crashFingerprint && input.crashFingerprint.trim().length > 0) {
    query.set("crash_fingerprint", `eq.${input.crashFingerprint.trim()}`);
  }

  const rows = await restSelect(input.region, "reports", query);
  return rows.map((row) => ({
    id: asString(row.id) ?? "",
    platform: asString(row.platform) ?? "unknown",
    app_version: asString(row.app_version) ?? "unknown",
    build_number: asString(row.build_number) ?? "unknown",
    crash_fingerprint: asNullableString(row.crash_fingerprint),
    event_count: asNumber(row.event_count) ?? 0,
    generated_at_unix_ms: asNumber(row.generated_at_unix_ms) ?? 0,
    export_source: asString(row.export_source) ?? "unknown",
    capture_reason: asString(row.capture_reason) ?? "unknown",
    storage_path: asString(row.storage_path) ?? "",
    created_at: asString(row.created_at) ?? "",
  }));
}

export async function getReportDetail(input: {
  projectId: string;
  region: DashboardRegion;
  reportId: string;
}): Promise<{ report: DashboardReport; events: DashboardEvent[] } | null> {
  const reportQuery = new URLSearchParams({
    id: `eq.${input.reportId}`,
    project_id: `eq.${input.projectId}`,
    select: [
      "id",
      "platform",
      "app_version",
      "build_number",
      "crash_fingerprint",
      "event_count",
      "generated_at_unix_ms",
      "export_source",
      "capture_reason",
      "storage_path",
      "created_at",
    ].join(","),
    limit: "1",
  });
  const reports = await restSelect(input.region, "reports", reportQuery);
  if (reports.length === 0) {
    return null;
  }

  const report = reports[0];
  const eventQuery = new URLSearchParams({
    report_id: `eq.${input.reportId}`,
    select: "seq,timestamp_unix_ms,type,thread,severity,attrs",
    order: "seq.asc",
    limit: "500",
  });
  const eventRows = await restSelect(input.region, "report_event_index", eventQuery);

  return {
    report: {
      id: asString(report.id) ?? "",
      platform: asString(report.platform) ?? "unknown",
      app_version: asString(report.app_version) ?? "unknown",
      build_number: asString(report.build_number) ?? "unknown",
      crash_fingerprint: asNullableString(report.crash_fingerprint),
      event_count: asNumber(report.event_count) ?? 0,
      generated_at_unix_ms: asNumber(report.generated_at_unix_ms) ?? 0,
      export_source: asString(report.export_source) ?? "unknown",
      capture_reason: asString(report.capture_reason) ?? "unknown",
      storage_path: asString(report.storage_path) ?? "",
      created_at: asString(report.created_at) ?? "",
    },
    events: eventRows.map((row) => ({
      seq: asNumber(row.seq) ?? 0,
      timestamp_unix_ms: asNumber(row.timestamp_unix_ms) ?? 0,
      type: asString(row.type) ?? "unknown",
      thread: asString(row.thread) ?? "unknown",
      severity: asString(row.severity) ?? "unknown",
      attrs: asObject(row.attrs),
    })),
  };
}

async function restSelect(
  region: DashboardRegion,
  resource: string,
  query: URLSearchParams,
): Promise<Array<Record<string, unknown>>> {
  const config = resolveSupabaseConfig(region);
  const response = await fetch(`${config.url}/rest/v1/${resource}?${query.toString()}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`supabase_query_failed:${resource}:${response.status}:${body}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null);
}

function resolveSupabaseConfig(region: DashboardRegion): SupabaseConfig {
  const cfg = getDashboardRuntimeConfig();
  if (region === "eu") {
    return {
      url: cfg.euSupabaseUrl,
      serviceRoleKey: cfg.euServiceRoleKey,
    };
  }
  return {
    url: cfg.usSupabaseUrl,
    serviceRoleKey: cfg.usServiceRoleKey,
  };
}

function clamp(value: number, minValue: number, maxValue: number): number {
  return Math.max(minValue, Math.min(maxValue, value));
}

function asString(input: unknown): string | null {
  return typeof input === "string" && input.length > 0 ? input : null;
}

function asNullableString(input: unknown): string | null {
  return typeof input === "string" && input.length > 0 ? input : null;
}

function asNumber(input: unknown): number | null {
  return typeof input === "number" && Number.isFinite(input) ? input : null;
}

function asObject(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "unreadable_body";
  }
}
