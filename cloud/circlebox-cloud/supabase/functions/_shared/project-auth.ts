export type ProjectAuthContext = {
  projectId: string;
  region: "us" | "eu";
  planTier: "free" | "pro" | "enterprise";
};

/**
 * Placeholder key verification.
 *
 * In production, this function should verify against control-plane key hashes
 * and cache project metadata in edge KV/DO.
 */
export function authenticateIngestKey(rawKey: string): ProjectAuthContext {
  if (!rawKey.startsWith("cb_live_")) {
    throw new Error("Invalid ingest key prefix");
  }

  const parts = rawKey.split("_");
  const region = parts.includes("eu") ? "eu" : "us";
  const projectToken = parts[2] ?? "project_demo";

  return {
    projectId: normalizeProjectId(projectToken),
    region,
    planTier: "free",
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

/**
 * Produces a deterministic UUIDv4-like identifier for non-UUID project tokens.
 * This keeps local/dev ingestion stable without requiring control-plane lookups.
 */
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

  // UUIDv4 markers.
  canonical[14] = "4";
  canonical[19] = ["8", "9", "a", "b"][parseInt(canonical[19], 16) % 4];

  return canonical.join("");
}
