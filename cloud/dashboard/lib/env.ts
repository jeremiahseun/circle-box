export type DashboardRegion = "us" | "eu";

export type DashboardSearchParams = Record<string, string | string[] | undefined>;

export type DashboardRuntimeConfig = {
  defaultProjectId: string | null;
  defaultRegion: DashboardRegion;
  workerBaseUrl: string;
  workerToken: string;
  usSupabaseUrl: string;
  usServiceRoleKey: string;
  euSupabaseUrl: string;
  euServiceRoleKey: string;
};

type DashboardScope = {
  projectId: string | null;
  region: DashboardRegion;
};

let cachedConfig: DashboardRuntimeConfig | null = null;

export function getDashboardRuntimeConfig(): DashboardRuntimeConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const defaultRegion = parseRegion(readRequiredEnv("DASHBOARD_DEFAULT_REGION"), "DASHBOARD_DEFAULT_REGION");
  cachedConfig = {
    defaultProjectId: readOptionalEnv("DASHBOARD_DEFAULT_PROJECT_ID"),
    defaultRegion,
    workerBaseUrl: trimTrailingSlash(readRequiredEnv("DASHBOARD_WORKER_BASE_URL")),
    workerToken: readRequiredEnv("DASHBOARD_WORKER_TOKEN"),
    usSupabaseUrl: trimTrailingSlash(readRequiredEnv("DASHBOARD_US_SUPABASE_URL")),
    usServiceRoleKey: readRequiredEnv("DASHBOARD_US_SUPABASE_SERVICE_ROLE_KEY"),
    euSupabaseUrl: trimTrailingSlash(readRequiredEnv("DASHBOARD_EU_SUPABASE_URL")),
    euServiceRoleKey: readRequiredEnv("DASHBOARD_EU_SUPABASE_SERVICE_ROLE_KEY"),
  };

  return cachedConfig;
}

export function resolveDashboardScope(searchParams: DashboardSearchParams = {}): DashboardScope {
  const cfg = getDashboardRuntimeConfig();
  const projectFromQuery = firstValue(searchParams.project_id)?.trim();
  const regionFromQuery = firstValue(searchParams.region)?.trim();

  return {
    projectId: projectFromQuery && projectFromQuery.length > 0 ? projectFromQuery : cfg.defaultProjectId,
    region: regionFromQuery ? parseRegion(regionFromQuery, "region") : cfg.defaultRegion,
  };
}

export function firstValue(input: string | string[] | undefined): string | undefined {
  if (typeof input === "string") {
    return input;
  }
  if (Array.isArray(input) && input.length > 0 && typeof input[0] === "string") {
    return input[0];
  }
  return undefined;
}

function readRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function readOptionalEnv(key: string): string | null {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : null;
}

function parseRegion(input: string, source: string): DashboardRegion {
  if (input === "us" || input === "eu") {
    return input;
  }
  throw new Error(`Invalid region in ${source}: ${input}`);
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
