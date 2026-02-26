type CircleBoxRegion = "us" | "eu";
type CircleBoxIngestType = "report" | "fragment";
type CircleBoxKeyType = "ingest" | "usage_beacon";
type CircleBoxIdempotentResponse = Record<string, unknown>;
type DashboardDownloadTokenPayload = {
  project_id: string;
  report_id: string;
  region: CircleBoxRegion;
  exp_unix_ms: number;
};

type CircleBoxEvent = {
  seq: number;
  timestamp_unix_ms: number;
  uptime_ms: number;
  type: string;
  thread: string;
  severity: string;
  attrs: Record<string, string>;
};

type CircleBoxEnvelopeV2 = {
  schema_version: 2;
  session_id: string;
  platform: "ios" | "android";
  app_version: string;
  build_number: string;
  os_version: string;
  device_model: string;
  export_source: "pending_crash" | "live_snapshot";
  capture_reason: "uncaught_exception" | "manual_export" | "startup_pending_detection";
  generated_at_unix_ms: number;
  events: CircleBoxEvent[];
};

type ProjectAuthContext = {
  projectId: string;
  region: CircleBoxRegion;
  keyType: CircleBoxKeyType;
};

type RegionalSupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

type ControlPlaneSupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

type ApiKeyRecord = {
  id: string;
  project_id: string;
  key_type: CircleBoxKeyType;
  region_scope: "us" | "eu" | "auto";
  hashed_secret: string;
  expires_at: string | null;
};

type ParsedApiKey = {
  rawKey: string;
  prefix: string;
  keyType: CircleBoxKeyType;
  regionHint: CircleBoxRegion;
};

type UsageTelemetryPayload = {
  sdk_family: string;
  sdk_version: string;
  mode: "offline_only" | "core_cloud" | "core_adapters" | "core_cloud_adapters" | "self_host";
  usage_date?: string;
  active_apps?: number;
  crash_reports?: number;
  events_emitted?: number;
};

export interface Env {
  US_SUPABASE_URL: string;
  EU_SUPABASE_URL: string;
  US_SUPABASE_SERVICE_ROLE_KEY: string;
  EU_SUPABASE_SERVICE_ROLE_KEY: string;
  CONTROL_SUPABASE_URL?: string;
  CONTROL_SUPABASE_SERVICE_ROLE_KEY?: string;
  DASHBOARD_WORKER_TOKEN?: string;
  DASHBOARD_SHARED_SECRET?: string;
  CIRCLEBOX_R2_BUCKET_RAW_NAME?: string;
  CB_REPORTS_RAW: R2Bucket;
}

const MAX_REPORT_BODY_BYTES = 2 * 1024 * 1024;
const MAX_FRAGMENT_BODY_BYTES = 256 * 1024;
const ALLOWED_SEVERITIES = new Set(["info", "warn", "error", "fatal"]);
const ALLOWED_THREADS = new Set(["main", "background", "crash"]);
const ALLOWED_USAGE_MODES = new Set(["offline_only", "core_cloud", "core_adapters", "core_cloud_adapters", "self_host"]);
const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;
const KEY_CACHE_TTL_MS = 60_000;
const keyAuthCache = new Map<string, { context: ProjectAuthContext; expiresAtUnixMs: number }>();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/v1/dashboard/")) {
      return handleDashboardRoute(request, env, url);
    }

    if (request.method !== "POST") {
      return json(405, { error: "method_not_allowed" });
    }

    if (
      url.pathname !== "/v1/ingest/report" &&
      url.pathname !== "/v1/ingest/fragment" &&
      url.pathname !== "/v1/telemetry/usage"
    ) {
      return json(404, { error: "not_found" });
    }

    let auth: ProjectAuthContext;
    if (url.pathname === "/v1/telemetry/usage") {
      const usageKey = request.headers.get("x-circlebox-usage-key");
      if (!usageKey) {
        return json(401, { error: "invalid_usage_key" });
      }
      try {
        auth = await authenticateApiKey(usageKey, env, "usage_beacon");
      } catch (error) {
        return json(401, {
          error: "invalid_usage_key",
          message: error instanceof Error ? error.message : "unknown_error",
        });
      }
      return handleUsageTelemetry(request, env, auth);
    }

    const ingestKey = request.headers.get("x-circlebox-ingest-key");
    if (!ingestKey) {
      return json(401, { error: "invalid_ingest_key" });
    }

    try {
      auth = await authenticateApiKey(ingestKey, env, "ingest");
    } catch (error) {
      return json(401, {
        error: "invalid_ingest_key",
        message: error instanceof Error ? error.message : "unknown_error",
      });
    }

    if (url.pathname === "/v1/ingest/report") {
      return handleIngestReport(request, env, auth);
    }
    return handleIngestFragment(request, env, auth);
  },
};

async function handleDashboardRoute(request: Request, env: Env, url: URL): Promise<Response> {
  const tokenMatch = url.pathname.match(/^\/v1\/dashboard\/reports\/([^/]+)\/download-token$/);
  if (tokenMatch) {
    if (request.method !== "POST") {
      return json(405, { error: "method_not_allowed" });
    }
    return handleIssueDownloadToken(request, env, tokenMatch[1]);
  }

  const downloadMatch = url.pathname.match(/^\/v1\/dashboard\/download\/([^/]+)$/);
  if (downloadMatch) {
    if (request.method !== "GET") {
      return json(405, { error: "method_not_allowed" });
    }
    return handleDownloadRequest(env, decodeURIComponent(downloadMatch[1]));
  }

  return json(404, { error: "not_found" });
}

async function handleIngestReport(request: Request, env: Env, auth: ProjectAuthContext): Promise<Response> {
  const regional = resolveRegionalSupabase(env, auth.region);

  let idempotencyKey: string | null = null;
  try {
    idempotencyKey = parseIdempotencyKey(request);
  } catch (error) {
    return json(400, {
      error: "invalid_payload",
      message: error instanceof Error ? error.message : "invalid_idempotency_key",
    });
  }

  try {
    if (idempotencyKey) {
      const cached = await readIdempotentResponse(regional, auth.projectId, "report", idempotencyKey);
      if (cached) {
        return json(202, {
          ...cached,
          deduplicated: true,
          idempotency_key: idempotencyKey,
        });
      }
    }
  } catch (error) {
    return json(503, {
      error: "ingest_dependency_unavailable",
      message: error instanceof Error ? error.message : "idempotency_read_failed",
    });
  }

  let rawBody: Uint8Array;
  let envelope: CircleBoxEnvelopeV2;
  let payloadWasGzip: boolean;
  try {
    rawBody = new Uint8Array(await request.arrayBuffer());
    if (rawBody.byteLength > MAX_REPORT_BODY_BYTES) {
      return json(413, { error: "payload_too_large" });
    }

    const contentType = request.headers.get("content-type");
    payloadWasGzip = isLikelyGzip(rawBody) || (contentType ?? "").toLowerCase().includes("gzip");
    const decoded = await decodeJsonBody(rawBody, contentType);
    envelope = parseEnvelopeV2(JSON.parse(decoded));
  } catch (error) {
    return json(400, {
      error: "invalid_payload",
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }

  const reportId = crypto.randomUUID();
  const crashFingerprint = deriveCrashFingerprint(envelope);
  const objectPath = buildReportStoragePath(
    auth.projectId,
    reportId,
    envelope.generated_at_unix_ms,
    payloadWasGzip,
  );
  const r2Key = `${auth.region}/${objectPath}`;
  const bucketName = env.CIRCLEBOX_R2_BUCKET_RAW_NAME ?? "cb-reports-raw";
  const storagePath = `r2://${bucketName}/${r2Key}`;

  try {
    await env.CB_REPORTS_RAW.put(r2Key, rawBody, {
      httpMetadata: {
        contentType: payloadWasGzip ? "application/json+gzip" : "application/json",
      },
    });

    await restInsert(regional, "reports", [
      {
        id: reportId,
        project_id: auth.projectId,
        schema_version: envelope.schema_version,
        session_id: envelope.session_id,
        platform: envelope.platform,
        app_version: envelope.app_version,
        build_number: envelope.build_number,
        os_version: envelope.os_version,
        device_model: envelope.device_model,
        export_source: envelope.export_source,
        capture_reason: envelope.capture_reason,
        generated_at_unix_ms: envelope.generated_at_unix_ms,
        event_count: envelope.events.length,
        has_crash_marker: crashFingerprint !== null,
        crash_fingerprint: crashFingerprint,
        storage_path: storagePath,
      },
    ]);

    const indexedEvents = envelope.events.slice(-20).map((event) => ({
      report_id: reportId,
      seq: event.seq,
      timestamp_unix_ms: event.timestamp_unix_ms,
      type: event.type,
      thread: event.thread,
      severity: event.severity,
      attrs: event.attrs,
    }));
    if (indexedEvents.length > 0) {
      await restInsert(regional, "report_event_index?on_conflict=report_id,seq", indexedEvents, {
        prefer: "resolution=merge-duplicates,return=minimal",
      });
    }

    if (crashFingerprint) {
      await invokeRpc(regional, "increment_crash_fingerprint_daily", {
        p_project_id: auth.projectId,
        p_usage_date: dayFromUnixMs(envelope.generated_at_unix_ms),
        p_crash_fingerprint: crashFingerprint,
      });
    }

    const responsePayload: CircleBoxIdempotentResponse = {
      status: "accepted",
      report_id: reportId,
      project_id: auth.projectId,
      accepted_region: auth.region,
      event_count: envelope.events.length,
      crash_fingerprint: crashFingerprint,
      storage_path: storagePath,
      fragment_preview: makeFragment(envelope, crashFingerprint),
    };

    if (idempotencyKey) {
      await persistIdempotentResponse(regional, {
        projectId: auth.projectId,
        ingestType: "report",
        idempotencyKey,
        response: responsePayload,
        referenceId: reportId,
      });
    }

    return json(202, responsePayload);
  } catch (error) {
    const deadLetterId = await writeDeadLetter(regional, {
      projectId: auth.projectId,
      ingestType: "report",
      reason: error instanceof Error ? error.message : "persist_report_failed",
      payload: {
        project_id: auth.projectId,
        report_id: reportId,
        idempotency_key: idempotencyKey,
        payload_size_bytes: rawBody.byteLength,
        payload_was_gzip: payloadWasGzip,
      },
    });

    return json(503, {
      error: "ingest_persistence_failed",
      message: error instanceof Error ? error.message : "unknown_error",
      dead_letter_id: deadLetterId,
    });
  }
}

async function handleIngestFragment(request: Request, env: Env, auth: ProjectAuthContext): Promise<Response> {
  const regional = resolveRegionalSupabase(env, auth.region);

  let idempotencyKey: string | null = null;
  try {
    idempotencyKey = parseIdempotencyKey(request);
  } catch (error) {
    return json(400, {
      error: "invalid_request",
      message: error instanceof Error ? error.message : "invalid_idempotency_key",
    });
  }

  try {
    if (idempotencyKey) {
      const cached = await readIdempotentResponse(regional, auth.projectId, "fragment", idempotencyKey);
      if (cached) {
        return json(202, {
          ...cached,
          deduplicated: true,
          idempotency_key: idempotencyKey,
        });
      }
    }
  } catch (error) {
    return json(503, {
      error: "ingest_dependency_unavailable",
      message: error instanceof Error ? error.message : "idempotency_read_failed",
    });
  }

  let payloadRecord: Record<string, unknown>;
  try {
    const rawBody = new Uint8Array(await request.arrayBuffer());
    if (rawBody.byteLength > MAX_FRAGMENT_BODY_BYTES) {
      return json(413, { error: "payload_too_large" });
    }
    const payload = JSON.parse(await decodeJsonBody(rawBody, request.headers.get("content-type")));
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new Error("invalid_fragment");
    }
    payloadRecord = payload as Record<string, unknown>;
  } catch (error) {
    return json(400, {
      error: "invalid_request",
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }

  const fragmentId = crypto.randomUUID();
  try {
    await restInsert(regional, "fragments", [
      {
        id: fragmentId,
        project_id: auth.projectId,
        report_id: asNullableUuid(payloadRecord["report_id"]),
        session_id: asString(payloadRecord["session_id"]) ?? "unknown",
        platform: asString(payloadRecord["platform"]) ?? "unknown",
        crash_fingerprint: asNullableString(payloadRecord["crash_fingerprint"]),
        payload: payloadRecord,
      },
    ]);

    const responsePayload: CircleBoxIdempotentResponse = {
      status: "accepted",
      fragment_id: fragmentId,
      project_id: auth.projectId,
      accepted_region: auth.region,
      session_id: payloadRecord["session_id"] ?? null,
    };

    if (idempotencyKey) {
      await persistIdempotentResponse(regional, {
        projectId: auth.projectId,
        ingestType: "fragment",
        idempotencyKey,
        response: responsePayload,
        referenceId: fragmentId,
      });
    }

    return json(202, responsePayload);
  } catch (error) {
    const deadLetterId = await writeDeadLetter(regional, {
      projectId: auth.projectId,
      ingestType: "fragment",
      reason: error instanceof Error ? error.message : "persist_fragment_failed",
      payload: {
        idempotency_key: idempotencyKey,
        payload: payloadRecord,
      },
    });

    return json(503, {
      error: "ingest_persistence_failed",
      message: error instanceof Error ? error.message : "unknown_error",
      dead_letter_id: deadLetterId,
    });
  }
}

async function handleUsageTelemetry(
  request: Request,
  env: Env,
  auth: ProjectAuthContext,
): Promise<Response> {
  const control = resolveControlPlaneSupabase(env);
  if (!control) {
    return json(503, {
      error: "usage_telemetry_not_configured",
      message: "missing_control_plane_config",
    });
  }

  let payload: UsageTelemetryPayload;
  try {
    const raw = await request.json();
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error("invalid_payload");
    }
    payload = raw as UsageTelemetryPayload;
    if (typeof payload.sdk_family !== "string" || payload.sdk_family.trim().length === 0) {
      throw new Error("missing_sdk_family");
    }
    if (typeof payload.sdk_version !== "string" || payload.sdk_version.trim().length === 0) {
      throw new Error("missing_sdk_version");
    }
    if (typeof payload.mode !== "string" || !ALLOWED_USAGE_MODES.has(payload.mode)) {
      throw new Error("invalid_mode");
    }
  } catch (error) {
    return json(400, {
      error: "invalid_payload",
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }

  const usageDate = typeof payload.usage_date === "string" && payload.usage_date.length > 0
    ? payload.usage_date
    : dayFromUnixMs(Date.now());
  const activeApps = clampNumber(payload.active_apps, 0, 1_000_000);
  const crashReports = clampNumber(payload.crash_reports, 0, 10_000_000);
  const eventsEmitted = clampNumber(payload.events_emitted, 0, 100_000_000);

  try {
    await restInsertControl(
      control,
      "usage_beacon_daily?on_conflict=project_id,usage_date,sdk_family,sdk_version,mode",
      [
        {
          project_id: auth.projectId,
          usage_date: usageDate,
          sdk_family: payload.sdk_family.trim(),
          sdk_version: payload.sdk_version.trim(),
          mode: payload.mode,
          active_apps: activeApps,
          crash_reports: crashReports,
          events_emitted: eventsEmitted,
        },
      ],
      {
        prefer: "resolution=merge-duplicates,return=minimal",
      },
    );
  } catch (error) {
    return json(503, {
      error: "usage_telemetry_persistence_failed",
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }

  return json(202, {
    status: "accepted",
    project_id: auth.projectId,
    usage_date: usageDate,
  });
}

async function handleIssueDownloadToken(request: Request, env: Env, rawReportId: string): Promise<Response> {
  const dashboardToken = env.DASHBOARD_WORKER_TOKEN?.trim();
  const sharedSecret = env.DASHBOARD_SHARED_SECRET?.trim();
  if (!dashboardToken || !sharedSecret) {
    return json(503, {
      error: "dashboard_not_configured",
      message: "missing_dashboard_secrets",
    });
  }

  const callerToken = request.headers.get("x-circlebox-dashboard-token")?.trim() ?? "";
  if (!secureEquals(callerToken, dashboardToken)) {
    return json(401, { error: "unauthorized_dashboard_request" });
  }

  let payloadRecord: Record<string, unknown>;
  try {
    const payload = await request.json();
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      throw new Error("invalid_body");
    }
    payloadRecord = payload as Record<string, unknown>;
  } catch {
    return json(400, { error: "invalid_request", message: "invalid_json_body" });
  }

  const projectRaw = asString(payloadRecord["project_id"]);
  if (!projectRaw) {
    return json(400, { error: "invalid_request", message: "missing_project_id" });
  }

  const requestedRegion = asString(payloadRecord["region"]) ?? "us";
  if (requestedRegion !== "us" && requestedRegion !== "eu") {
    return json(400, { error: "invalid_request", message: "invalid_region" });
  }

  const reportId = rawReportId.trim();
  if (!isUuid(reportId)) {
    return json(400, { error: "invalid_request", message: "invalid_report_id" });
  }

  const expiresInRaw = payloadRecord["expires_in_sec"];
  const parsedExpiry = typeof expiresInRaw === "number" ? Math.floor(expiresInRaw) : 300;
  const expiresInSec = clamp(parsedExpiry, 30, 900);
  const projectId = normalizeProjectId(projectRaw);
  const regional = resolveRegionalSupabase(env, requestedRegion);

  let reportStoragePath: string;
  try {
    const report = await readReportStoragePath(regional, projectId, reportId);
    if (!report) {
      return json(404, { error: "report_not_found" });
    }
    reportStoragePath = report;
  } catch (error) {
    return json(503, {
      error: "ingest_dependency_unavailable",
      message: error instanceof Error ? error.message : "report_lookup_failed",
    });
  }

  const r2Key = parseStoragePathToR2Key(reportStoragePath);
  const expectedPrefix = `${requestedRegion}/reports/${projectId}/`;
  if (!r2Key || !r2Key.startsWith(expectedPrefix)) {
    return json(403, { error: "storage_scope_mismatch" });
  }

  const expiresAt = Date.now() + (expiresInSec * 1000);
  const tokenPayload: DashboardDownloadTokenPayload = {
    project_id: projectId,
    report_id: reportId,
    region: requestedRegion,
    exp_unix_ms: expiresAt,
  };
  const token = await signDashboardToken(sharedSecret, tokenPayload);
  const downloadUrl = new URL(`/v1/dashboard/download/${encodeURIComponent(token)}`, request.url).toString();

  return json(200, {
    status: "ok",
    project_id: projectId,
    report_id: reportId,
    region: requestedRegion,
    expires_at_unix_ms: expiresAt,
    download_url: downloadUrl,
  });
}

async function handleDownloadRequest(env: Env, token: string): Promise<Response> {
  const sharedSecret = env.DASHBOARD_SHARED_SECRET?.trim();
  if (!sharedSecret) {
    return json(503, { error: "dashboard_not_configured", message: "missing_dashboard_secret" });
  }

  const parsed = await verifyDashboardToken(sharedSecret, token);
  if (!parsed) {
    return json(401, { error: "invalid_download_token" });
  }
  if (Date.now() > parsed.exp_unix_ms) {
    return json(401, { error: "expired_download_token" });
  }

  const regional = resolveRegionalSupabase(env, parsed.region);
  let reportStoragePath: string;
  try {
    const report = await readReportStoragePath(regional, parsed.project_id, parsed.report_id);
    if (!report) {
      return json(404, { error: "report_not_found" });
    }
    reportStoragePath = report;
  } catch (error) {
    return json(503, {
      error: "ingest_dependency_unavailable",
      message: error instanceof Error ? error.message : "report_lookup_failed",
    });
  }

  const r2Key = parseStoragePathToR2Key(reportStoragePath);
  const expectedPrefix = `${parsed.region}/reports/${parsed.project_id}/`;
  if (!r2Key || !r2Key.startsWith(expectedPrefix)) {
    return json(403, { error: "storage_scope_mismatch" });
  }

  const object = await env.CB_REPORTS_RAW.get(r2Key);
  if (!object || !object.body) {
    return json(404, { error: "report_blob_not_found" });
  }

  const contentType = object.httpMetadata?.contentType ?? guessContentTypeFromKey(r2Key);
  const filenameSuffix = r2Key.endsWith(".json.gz") ? "json.gz" : "json";
  const filename = `circlebox-${parsed.report_id}.${filenameSuffix}`;

  return new Response(object.body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
      "x-circlebox-report-id": parsed.report_id,
    },
  });
}

function resolveRegionalSupabase(env: Env, region: CircleBoxRegion): RegionalSupabaseConfig {
  if (region === "eu") {
    return {
      url: trimTrailingSlash(env.EU_SUPABASE_URL),
      serviceRoleKey: env.EU_SUPABASE_SERVICE_ROLE_KEY,
    };
  }
  return {
    url: trimTrailingSlash(env.US_SUPABASE_URL),
    serviceRoleKey: env.US_SUPABASE_SERVICE_ROLE_KEY,
  };
}

function resolveControlPlaneSupabase(env: Env): ControlPlaneSupabaseConfig | null {
  const url = env.CONTROL_SUPABASE_URL?.trim();
  const key = env.CONTROL_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return null;
  }

  return {
    url: trimTrailingSlash(url),
    serviceRoleKey: key,
  };
}

async function readIdempotentResponse(
  regional: RegionalSupabaseConfig,
  projectId: string,
  ingestType: CircleBoxIngestType,
  idempotencyKey: string,
): Promise<CircleBoxIdempotentResponse | null> {
  const query = new URLSearchParams({
    project_id: `eq.${projectId}`,
    ingest_type: `eq.${ingestType}`,
    idempotency_key: `eq.${idempotencyKey}`,
    select: "response",
    limit: "1",
  });
  const response = await fetch(`${regional.url}/rest/v1/ingest_idempotency?${query.toString()}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${regional.serviceRoleKey}`,
      apikey: regional.serviceRoleKey,
      accept: "application/json",
    },
  });
  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`rest_select_failed:ingest_idempotency:${response.status}:${body}`);
  }

  const rows = await response.json() as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return null;
  }
  const payload = rows[0]["response"];
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }
  return payload as CircleBoxIdempotentResponse;
}

async function readReportStoragePath(
  regional: RegionalSupabaseConfig,
  projectId: string,
  reportId: string,
): Promise<string | null> {
  const query = new URLSearchParams({
    id: `eq.${reportId}`,
    project_id: `eq.${projectId}`,
    select: "storage_path",
    limit: "1",
  });

  const response = await fetch(`${regional.url}/rest/v1/reports?${query.toString()}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${regional.serviceRoleKey}`,
      apikey: regional.serviceRoleKey,
      accept: "application/json",
    },
  });
  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`rest_select_failed:reports:${response.status}:${body}`);
  }

  const rows = await response.json() as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return null;
  }

  const storagePath = rows[0]["storage_path"];
  return typeof storagePath === "string" && storagePath.length > 0 ? storagePath : null;
}

async function readApiKeyRecords(
  control: ControlPlaneSupabaseConfig,
  keyPrefix: string,
  keyType: CircleBoxKeyType,
): Promise<ApiKeyRecord[]> {
  const query = new URLSearchParams({
    key_prefix: `eq.${keyPrefix}`,
    key_type: `eq.${keyType}`,
    active: "is.true",
    select: "id,project_id,key_type,region_scope,hashed_secret,expires_at",
  });

  const response = await fetch(`${control.url}/rest/v1/api_keys?${query.toString()}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${control.serviceRoleKey}`,
      apikey: control.serviceRoleKey,
      accept: "application/json",
    },
  });
  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`rest_select_failed:api_keys:${response.status}:${body}`);
  }

  const rows = await response.json() as Array<Record<string, unknown>>;
  return rows
    .map((row) => {
      const id = asString(row["id"]);
      const projectId = asString(row["project_id"]);
      const rowKeyType = asString(row["key_type"]);
      const regionScope = asString(row["region_scope"]);
      const hashedSecret = asString(row["hashed_secret"]);
      const expiresAt = asNullableString(row["expires_at"]);
      if (!id || !projectId || !rowKeyType || !regionScope || !hashedSecret) {
        return null;
      }
      if ((rowKeyType !== "ingest" && rowKeyType !== "usage_beacon")) {
        return null;
      }
      if ((regionScope !== "us" && regionScope !== "eu" && regionScope !== "auto")) {
        return null;
      }

      return {
        id,
        project_id: projectId,
        key_type: rowKeyType,
        region_scope: regionScope,
        hashed_secret: hashedSecret,
        expires_at: expiresAt,
      } as ApiKeyRecord;
    })
    .filter((item): item is ApiKeyRecord => item !== null);
}

async function touchApiKey(control: ControlPlaneSupabaseConfig, keyId: string): Promise<void> {
  const query = new URLSearchParams({
    id: `eq.${keyId}`,
  });
  await fetch(`${control.url}/rest/v1/api_keys?${query.toString()}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${control.serviceRoleKey}`,
      apikey: control.serviceRoleKey,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      last_used_at: new Date().toISOString(),
    }),
  });
}

async function persistIdempotentResponse(
  regional: RegionalSupabaseConfig,
  input: {
    projectId: string;
    ingestType: CircleBoxIngestType;
    idempotencyKey: string;
    response: CircleBoxIdempotentResponse;
    referenceId: string;
  },
): Promise<void> {
  await restInsert(
    regional,
    "ingest_idempotency?on_conflict=project_id,ingest_type,idempotency_key",
    [
      {
        project_id: input.projectId,
        ingest_type: input.ingestType,
        idempotency_key: input.idempotencyKey,
        response: input.response,
        reference_id: input.referenceId,
      },
    ],
    {
      prefer: "resolution=ignore-duplicates,return=minimal",
    },
  );
}

async function writeDeadLetter(
  regional: RegionalSupabaseConfig,
  input: {
    projectId: string;
    ingestType: CircleBoxIngestType;
    reason: string;
    payload: unknown;
  },
): Promise<string | null> {
  const id = crypto.randomUUID();
  try {
    await restInsert(regional, "ingest_dead_letter", [
      {
        id,
        project_id: input.projectId,
        ingest_type: input.ingestType,
        reason: input.reason,
        payload: input.payload,
      },
    ]);
    return id;
  } catch {
    return null;
  }
}

async function restInsert(
  regional: RegionalSupabaseConfig,
  resource: string,
  rows: Array<Record<string, unknown>>,
  options: { prefer?: string } = {},
): Promise<void> {
  const response = await fetch(`${regional.url}/rest/v1/${resource}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${regional.serviceRoleKey}`,
      apikey: regional.serviceRoleKey,
      "content-type": "application/json",
      prefer: options.prefer ?? "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`rest_insert_failed:${resource}:${response.status}:${body}`);
  }
}

async function restInsertControl(
  control: ControlPlaneSupabaseConfig,
  resource: string,
  rows: Array<Record<string, unknown>>,
  options: { prefer?: string } = {},
): Promise<void> {
  const response = await fetch(`${control.url}/rest/v1/${resource}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${control.serviceRoleKey}`,
      apikey: control.serviceRoleKey,
      "content-type": "application/json",
      prefer: options.prefer ?? "return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`control_insert_failed:${resource}:${response.status}:${body}`);
  }
}

async function invokeRpc(
  regional: RegionalSupabaseConfig,
  functionName: string,
  args: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(`${regional.url}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${regional.serviceRoleKey}`,
      apikey: regional.serviceRoleKey,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`rpc_failed:${functionName}:${response.status}:${body}`);
  }
}

function parseEnvelopeV2(input: unknown): CircleBoxEnvelopeV2 {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Payload must be a JSON object");
  }

  const envelope = input as Record<string, unknown>;
  if (envelope["schema_version"] !== 2) {
    throw new Error("schema_version must be 2");
  }

  const requiredStringKeys = [
    "session_id",
    "platform",
    "app_version",
    "build_number",
    "os_version",
    "device_model",
    "export_source",
    "capture_reason",
  ];
  for (const key of requiredStringKeys) {
    if (typeof envelope[key] !== "string" || (envelope[key] as string).length === 0) {
      throw new Error(`Missing or invalid string field: ${key}`);
    }
  }
  if (typeof envelope["generated_at_unix_ms"] !== "number") {
    throw new Error("generated_at_unix_ms must be a number");
  }

  const events = envelope["events"];
  if (!Array.isArray(events)) {
    throw new Error("events must be an array");
  }

  for (const [index, event] of events.entries()) {
    if (typeof event !== "object" || event === null || Array.isArray(event)) {
      throw new Error(`events[${index}] must be an object`);
    }
    const record = event as Record<string, unknown>;

    for (const key of ["seq", "timestamp_unix_ms", "uptime_ms"]) {
      if (typeof record[key] !== "number") {
        throw new Error(`events[${index}].${key} must be a number`);
      }
    }
    for (const key of ["type", "thread", "severity"]) {
      if (typeof record[key] !== "string" || (record[key] as string).length === 0) {
        throw new Error(`events[${index}].${key} must be a non-empty string`);
      }
    }
    if (!ALLOWED_THREADS.has(record["thread"] as string)) {
      throw new Error(`events[${index}].thread has unsupported value`);
    }
    if (!ALLOWED_SEVERITIES.has(record["severity"] as string)) {
      throw new Error(`events[${index}].severity has unsupported value`);
    }
    if (typeof record["attrs"] !== "object" || record["attrs"] === null || Array.isArray(record["attrs"])) {
      throw new Error(`events[${index}].attrs must be an object`);
    }
  }

  return envelope as unknown as CircleBoxEnvelopeV2;
}

function deriveCrashFingerprint(envelope: CircleBoxEnvelopeV2): string | null {
  const crashEvent = [...envelope.events]
    .reverse()
    .find((event) => event.type === "native_exception_prehook" || event.severity === "fatal");
  if (!crashEvent) {
    return null;
  }

  const base = `${envelope.platform}|${envelope.app_version}|${crashEvent.type}|${crashEvent.attrs["details"] ?? ""}`;
  const bytes = new TextEncoder().encode(base);
  let hash = 0;
  for (const byte of bytes) {
    hash = ((hash << 5) - hash + byte) | 0;
  }
  return `fp_${Math.abs(hash).toString(16)}`;
}

function makeFragment(envelope: CircleBoxEnvelopeV2, crashFingerprint: string | null) {
  const criticalEvents = envelope.events
    .filter((event) => event.severity === "fatal" || event.type === "native_exception_prehook")
    .slice(-3)
    .map((event) => ({
      seq: event.seq,
      type: event.type,
      severity: event.severity,
      attrs: event.attrs,
      timestamp_unix_ms: event.timestamp_unix_ms,
    }));

  return {
    schema_version: envelope.schema_version,
    session_id: envelope.session_id,
    platform: envelope.platform,
    app_version: envelope.app_version,
    build_number: envelope.build_number,
    export_source: envelope.export_source,
    capture_reason: envelope.capture_reason,
    generated_at_unix_ms: envelope.generated_at_unix_ms,
    crash_fingerprint: crashFingerprint,
    event_count: envelope.events.length,
    critical_events: criticalEvents,
  };
}

async function authenticateApiKey(
  rawKey: string,
  env: Env,
  expectedType: CircleBoxKeyType,
): Promise<ProjectAuthContext> {
  const parsed = parseApiKey(rawKey, expectedType);
  const cacheHit = keyAuthCache.get(rawKey);
  if (cacheHit && cacheHit.expiresAtUnixMs > Date.now() && cacheHit.context.keyType === expectedType) {
    return cacheHit.context;
  }

  const control = resolveControlPlaneSupabase(env);
  if (!control) {
    if (expectedType !== "ingest") {
      throw new Error("control_plane_required_for_usage_keys");
    }
    const fallback = authenticateLegacyIngestKey(rawKey);
    keyAuthCache.set(rawKey, { context: fallback, expiresAtUnixMs: Date.now() + KEY_CACHE_TTL_MS });
    return fallback;
  }

  const records = await readApiKeyRecords(control, parsed.prefix, expectedType);
  if (records.length === 0) {
    throw new Error("key_not_found_or_inactive");
  }

  const hashed = await sha256Hex(rawKey);
  const matched = records.find((record) => secureEquals(record.hashed_secret, hashed));
  if (!matched) {
    throw new Error("key_secret_mismatch");
  }

  if (matched.expires_at && Date.now() > Date.parse(matched.expires_at)) {
    throw new Error("key_expired");
  }

  const region = matched.region_scope === "auto"
    ? parsed.regionHint
    : matched.region_scope;

  const context: ProjectAuthContext = {
    projectId: normalizeProjectId(matched.project_id),
    region,
    keyType: expectedType,
  };
  keyAuthCache.set(rawKey, {
    context,
    expiresAtUnixMs: Date.now() + KEY_CACHE_TTL_MS,
  });

  void touchApiKey(control, matched.id);

  return context;
}

function authenticateLegacyIngestKey(rawKey: string): ProjectAuthContext {
  if (!rawKey.startsWith("cb_live_")) {
    throw new Error("invalid_ingest_key_prefix");
  }

  const parts = rawKey.split("_");
  const region: CircleBoxRegion = rawKey.includes("_eu_") ? "eu" : "us";
  const projectToken = parts[2] ?? "project_demo";

  return {
    projectId: normalizeProjectId(projectToken),
    region,
    keyType: "ingest",
  };
}

function parseApiKey(rawKey: string, expectedType: CircleBoxKeyType): ParsedApiKey {
  const parts = rawKey.trim().split("_");
  if (parts.length < 4 || parts[0] !== "cb") {
    throw new Error("invalid_key_format");
  }
  const wireType = parts[1];
  if (expectedType === "ingest" && wireType !== "live") {
    throw new Error("invalid_ingest_key_prefix");
  }
  if (expectedType === "usage_beacon" && wireType !== "usage") {
    throw new Error("invalid_usage_key_prefix");
  }

  if (expectedType === "ingest") {
    if (parts.length < 5) {
      throw new Error("invalid_ingest_key_format");
    }
    const projectToken = parts[2] || "project_demo";
    const regionToken = parts[3] === "eu" ? "eu" : "us";
    const keyLabel = parts.length >= 6 ? parts[4] : "";
    const prefix = keyLabel.length > 0
      ? `cb_live_${projectToken}_${regionToken}_${keyLabel}`
      : `cb_live_${projectToken}_${regionToken}`;
    return {
      rawKey,
      keyType: "ingest",
      prefix,
      regionHint: regionToken,
    };
  }

  const projectToken = parts[2] || "project_demo";
  const keyLabel = parts.length >= 5 ? parts[3] : "";
  const prefix = keyLabel.length > 0 ? `cb_usage_${projectToken}_${keyLabel}` : `cb_usage_${projectToken}`;
  return {
    rawKey,
    keyType: "usage_beacon",
    prefix,
    regionHint: "us",
  };
}

function normalizeProjectId(input: string): string {
  const trimmed = input.trim();
  if (isUuid(trimmed)) {
    return trimmed;
  }
  return deterministicUuid(trimmed.length > 0 ? trimmed : "project_demo");
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function deterministicUuid(seed: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  let c = 0x9e3779b9;
  let d = 0x85ebca6b;

  for (const char of seed) {
    const code = char.charCodeAt(0);
    a = Math.imul(a ^ code, 0x01000193) >>> 0;
    b = Math.imul(b ^ (code << 1), 0x85ebca6b) >>> 0;
    c = Math.imul(c ^ (code << 2), 0xc2b2ae35) >>> 0;
    d = Math.imul(d ^ (code << 3), 0x27d4eb2f) >>> 0;
  }

  const hex = [a, b, c, d].map((value) => value.toString(16).padStart(8, "0")).join("");
  const canonical =
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`.split("");
  canonical[14] = "4";
  canonical[19] = ["8", "9", "a", "b"][parseInt(canonical[19], 16) % 4];

  return canonical.join("");
}

function parseIdempotencyKey(request: Request): string | null {
  const raw = request.headers.get("x-circlebox-idempotency-key");
  if (!raw) {
    return null;
  }
  const value = raw.trim();
  if (value.length < 8 || value.length > 128) {
    throw new Error("invalid_idempotency_key_length");
  }
  if (!/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new Error("invalid_idempotency_key_format");
  }
  return value;
}

async function signDashboardToken(secret: string, payload: DashboardDownloadTokenPayload): Promise<string> {
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = base64UrlEncode(new TextEncoder().encode(payloadJson));
  const signature = await hmacSha256Base64Url(secret, payloadBase64);
  return `${payloadBase64}.${signature}`;
}

async function verifyDashboardToken(
  secret: string,
  token: string,
): Promise<DashboardDownloadTokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const payloadPart = parts[0];
  const signaturePart = parts[1];
  if (!payloadPart || !signaturePart) {
    return null;
  }

  const expectedSignature = await hmacSha256Base64Url(secret, payloadPart);
  if (!secureEquals(signaturePart, expectedSignature)) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart)));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const payload = parsed as Record<string, unknown>;
  const projectId = asString(payload["project_id"]);
  const reportId = asString(payload["report_id"]);
  const region = asString(payload["region"]);
  const expUnixMs = payload["exp_unix_ms"];
  if (!projectId || !reportId || !region || typeof expUnixMs !== "number") {
    return null;
  }
  if ((region !== "us" && region !== "eu") || !isUuid(reportId)) {
    return null;
  }

  return {
    project_id: normalizeProjectId(projectId),
    report_id: reportId,
    region: region as CircleBoxRegion,
    exp_unix_ms: expUnixMs,
  };
}

async function hmacSha256Base64Url(secret: string, message: string): Promise<string> {
  const keyData = new TextEncoder().encode(secret);
  const imported = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", imported, new TextEncoder().encode(message));
  return base64UrlEncode(new Uint8Array(signature));
}

function parseStoragePathToR2Key(storagePath: string): string | null {
  const match = storagePath.match(/^r2:\/\/[^/]+\/(.+)$/);
  if (!match) {
    return null;
  }
  const key = match[1];
  return key.length > 0 ? key : null;
}

function guessContentTypeFromKey(key: string): string {
  if (key.endsWith(".json.gz")) {
    return "application/json+gzip";
  }
  return "application/json";
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(encoded: string): Uint8Array {
  const normalized = encoded
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const binary = atob(normalized);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function secureEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function clamp(value: number, minValue: number, maxValue: number): number {
  return Math.max(minValue, Math.min(maxValue, value));
}

function clampNumber(value: unknown, minValue: number, maxValue: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return minValue;
  }
  return clamp(Math.floor(value), minValue, maxValue);
}

function buildReportStoragePath(
  projectId: string,
  reportId: string,
  generatedAtUnixMs: number,
  payloadWasGzip: boolean,
): string {
  const day = dayFromUnixMs(generatedAtUnixMs);
  const ext = payloadWasGzip ? "json.gz" : "json";
  return `reports/${projectId}/${day}/${reportId}.${ext}`;
}

function dayFromUnixMs(unixMs: number): string {
  return new Date(unixMs).toISOString().slice(0, 10);
}

function isLikelyGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === GZIP_MAGIC_0 && bytes[1] === GZIP_MAGIC_1;
}

async function decodeJsonBody(bytes: Uint8Array, contentType: string | null): Promise<string> {
  const lowerContentType = (contentType ?? "").toLowerCase();
  const shouldAttemptGzip = lowerContentType.includes("gzip") || isLikelyGzip(bytes);
  if (!shouldAttemptGzip) {
    return new TextDecoder().decode(bytes);
  }

  try {
    const decompressionCtor = (globalThis as unknown as {
      DecompressionStream?: new (format: string) => TransformStream;
    }).DecompressionStream;
    if (!decompressionCtor) {
      return new TextDecoder().decode(bytes);
    }
    const stream = new Blob([copyToArrayBuffer(bytes)]).stream().pipeThrough(new decompressionCtor("gzip"));
    const decompressed = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(decompressed);
  } catch {
    return new TextDecoder().decode(bytes);
  }
}

function asString(input: unknown): string | null {
  return typeof input === "string" && input.length > 0 ? input : null;
}

function asNullableString(input: unknown): string | null {
  return typeof input === "string" && input.length > 0 ? input : null;
}

function asNullableUuid(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }
  return isUuid(input) ? input : null;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "unreadable_body";
  }
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  return copied.buffer;
}

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}
