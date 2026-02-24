import type { CircleBoxEnvelopeV2 } from "./schema.ts";

export type CircleBoxRegion = "us" | "eu";
export type CircleBoxIngestType = "report" | "fragment";
export type CircleBoxIdempotentResponse = Record<string, unknown>;

type DataPlaneConfig = {
  url: string;
  serviceRoleKey: string;
};

type R2UploadConfig = {
  uploadBaseUrl: string;
  internalToken: string;
  bucket: string;
};

type PersistReportInput = {
  region: CircleBoxRegion;
  projectId: string;
  reportId: string;
  envelope: CircleBoxEnvelopeV2;
  crashFingerprint: string | null;
  rawPayload: Uint8Array;
  payloadWasGzip: boolean;
};

type PersistFragmentInput = {
  region: CircleBoxRegion;
  fragmentId: string;
  projectId: string;
  payload: Record<string, unknown>;
};

type PersistIdempotentResponseInput = {
  region: CircleBoxRegion;
  projectId: string;
  ingestType: CircleBoxIngestType;
  idempotencyKey: string;
  response: CircleBoxIdempotentResponse;
  referenceId: string;
};

const RAW_REPORT_BUCKET = "cb-reports-raw";

export async function persistReport(input: PersistReportInput): Promise<{ storagePath: string }> {
  const objectPath = buildReportStoragePath(
    input.projectId,
    input.reportId,
    input.envelope.generated_at_unix_ms,
    input.payloadWasGzip,
  );

  const storagePath = await uploadObject(input.region, RAW_REPORT_BUCKET, objectPath, input.rawPayload, input.payloadWasGzip
    ? "application/json+gzip"
    : "application/json");

  await restInsert(input.region, "reports", [
    {
      id: input.reportId,
      project_id: input.projectId,
      schema_version: input.envelope.schema_version,
      session_id: input.envelope.session_id,
      platform: input.envelope.platform,
      app_version: input.envelope.app_version,
      build_number: input.envelope.build_number,
      os_version: input.envelope.os_version,
      device_model: input.envelope.device_model,
      export_source: input.envelope.export_source,
      capture_reason: input.envelope.capture_reason,
      generated_at_unix_ms: input.envelope.generated_at_unix_ms,
      event_count: input.envelope.events.length,
      has_crash_marker: input.crashFingerprint !== null,
      crash_fingerprint: input.crashFingerprint,
      storage_path: storagePath,
    },
  ]);

  const indexedEvents = input.envelope.events.slice(-20).map((event) => ({
    report_id: input.reportId,
    seq: event.seq,
    timestamp_unix_ms: event.timestamp_unix_ms,
    type: event.type,
    thread: event.thread,
    severity: event.severity,
    attrs: event.attrs,
  }));

  if (indexedEvents.length > 0) {
    await restInsert(input.region, "report_event_index?on_conflict=report_id,seq", indexedEvents, {
      prefer: "resolution=merge-duplicates,return=minimal",
    });
  }

  if (input.crashFingerprint) {
    await invokeRpc(input.region, "increment_crash_fingerprint_daily", {
      p_project_id: input.projectId,
      p_usage_date: dayFromUnixMs(input.envelope.generated_at_unix_ms),
      p_crash_fingerprint: input.crashFingerprint,
    });
  }

  return { storagePath };
}

export async function persistFragment(input: PersistFragmentInput): Promise<void> {
  const payload = input.payload;

  await restInsert(input.region, "fragments", [
    {
      id: input.fragmentId,
      project_id: input.projectId,
      report_id: asNullableUuid(payload["report_id"]),
      session_id: asString(payload["session_id"]) ?? "unknown",
      platform: asString(payload["platform"]) ?? "unknown",
      crash_fingerprint: asNullableString(payload["crash_fingerprint"]),
      payload,
    },
  ]);
}

export async function readIdempotentResponse(
  region: CircleBoxRegion,
  projectId: string,
  ingestType: CircleBoxIngestType,
  idempotencyKey: string,
): Promise<CircleBoxIdempotentResponse | null> {
  const config = resolveDataPlaneConfig(region);
  const query = new URLSearchParams({
    project_id: `eq.${projectId}`,
    ingest_type: `eq.${ingestType}`,
    idempotency_key: `eq.${idempotencyKey}`,
    select: "response",
    limit: "1",
  });

  const response = await fetch(`${config.url}/rest/v1/ingest_idempotency?${query.toString()}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
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

export async function persistIdempotentResponse(input: PersistIdempotentResponseInput): Promise<void> {
  await restInsert(
    input.region,
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

export async function writeDeadLetter(
  region: CircleBoxRegion,
  ingestType: CircleBoxIngestType,
  reason: string,
  payload: unknown,
  projectId: string | null,
): Promise<string | null> {
  const id = crypto.randomUUID();
  try {
    await restInsert(region, "ingest_dead_letter", [
      {
        id,
        project_id: projectId,
        ingest_type: ingestType,
        reason,
        payload,
      },
    ]);
    return id;
  } catch {
    return null;
  }
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

async function uploadObject(
  region: CircleBoxRegion,
  bucket: string,
  objectPath: string,
  data: Uint8Array,
  contentType: string,
): Promise<string> {
  const r2Config = resolveR2UploadConfig();
  if (r2Config) {
    return await uploadObjectToR2(region, objectPath, data, contentType, r2Config);
  }

  const config = resolveDataPlaneConfig(region);
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${config.url}/storage/v1/object/${bucket}/${encodedPath}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
      "content-type": contentType,
      "x-upsert": "true",
    },
    body: copyToArrayBuffer(data),
  });

  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`storage_upload_failed:${response.status}:${body}`);
  }

  return `supabase://${bucket}/${objectPath}`;
}

async function uploadObjectToR2(
  region: CircleBoxRegion,
  objectPath: string,
  data: Uint8Array,
  contentType: string,
  config: R2UploadConfig,
): Promise<string> {
  const query = new URLSearchParams({
    region,
    path: objectPath,
    bucket: config.bucket,
  });
  const response = await fetch(`${config.uploadBaseUrl}/internal/r2/store?${query.toString()}`, {
    method: "POST",
    headers: {
      "x-circlebox-r2-token": config.internalToken,
      "content-type": contentType,
    },
    body: copyToArrayBuffer(data),
  });

  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`r2_upload_failed:${response.status}:${body}`);
  }

  const payload = await safeReadJsonObject(response);
  const storagePath = payload?.["storage_path"];
  if (typeof storagePath === "string" && storagePath.length > 0) {
    return storagePath;
  }

  return `r2://${config.bucket}/${region}/${objectPath}`;
}

async function restInsert(
  region: CircleBoxRegion,
  resource: string,
  rows: Array<Record<string, unknown>>,
  options: { prefer?: string } = {},
): Promise<void> {
  const config = resolveDataPlaneConfig(region);
  const response = await fetch(`${config.url}/rest/v1/${resource}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
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

async function invokeRpc(region: CircleBoxRegion, functionName: string, args: Record<string, unknown>): Promise<void> {
  const config = resolveDataPlaneConfig(region);
  const response = await fetch(`${config.url}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
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

function resolveDataPlaneConfig(region: CircleBoxRegion): DataPlaneConfig {
  const upper = region.toUpperCase();
  const regionUrl = readEnv(`CIRCLEBOX_DATA_PLANE_${upper}_URL`);
  const regionServiceKey = readEnv(`CIRCLEBOX_DATA_PLANE_${upper}_SERVICE_ROLE_KEY`);
  const fallbackUrl = readEnv("SUPABASE_URL");
  const fallbackServiceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  const url = regionUrl ?? fallbackUrl;
  const serviceRoleKey = regionServiceKey ?? fallbackServiceKey;

  if (!url || !serviceRoleKey) {
    throw new Error(`missing_data_plane_config:${region}`);
  }

  return {
    url: trimTrailingSlash(url),
    serviceRoleKey,
  };
}

function resolveR2UploadConfig(): R2UploadConfig | null {
  const uploadBaseUrl = readEnv("CIRCLEBOX_R2_UPLOAD_BASE_URL");
  const internalToken = readEnv("CIRCLEBOX_R2_INTERNAL_TOKEN");
  const bucket = readEnv("CIRCLEBOX_R2_BUCKET_RAW") ?? RAW_REPORT_BUCKET;

  if (!uploadBaseUrl || !internalToken) {
    return null;
  }

  return {
    uploadBaseUrl: trimTrailingSlash(uploadBaseUrl),
    internalToken,
    bucket,
  };
}

function readEnv(name: string): string | null {
  const value = Deno.env.get(name);
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input) ? input : null;
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "unreadable_body";
  }
}

async function safeReadJsonObject(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await response.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copied = new Uint8Array(bytes.byteLength);
  copied.set(bytes);
  return copied.buffer;
}
