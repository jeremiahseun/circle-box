export type CircleBoxEvent = {
  seq: number;
  timestamp_unix_ms: number;
  uptime_ms: number;
  type: string;
  thread: string;
  severity: string;
  attrs: Record<string, string>;
};

export type CircleBoxEnvelopeV2 = {
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

const ALLOWED_SEVERITIES = new Set(["info", "warn", "error", "fatal"]);
const ALLOWED_THREADS = new Set(["main", "background", "crash"]);

export function parseEnvelopeV2(input: unknown): CircleBoxEnvelopeV2 {
  if (typeof input !== "object" || input === null) {
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
    if (typeof event !== "object" || event === null) {
      throw new Error(`events[${index}] must be an object`);
    }

    const record = event as Record<string, unknown>;
    const numericKeys = ["seq", "timestamp_unix_ms", "uptime_ms"];
    for (const key of numericKeys) {
      if (typeof record[key] !== "number") {
        throw new Error(`events[${index}].${key} must be a number`);
      }
    }

    const stringKeys = ["type", "thread", "severity"];
    for (const key of stringKeys) {
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

  return envelope as CircleBoxEnvelopeV2;
}

export function deriveCrashFingerprint(envelope: CircleBoxEnvelopeV2): string | null {
  const crashEvent = [...envelope.events].reverse().find((event) =>
    event.type === "native_exception_prehook" || event.severity === "fatal"
  );
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

export function makeFragment(envelope: CircleBoxEnvelopeV2, crashFingerprint: string | null) {
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
