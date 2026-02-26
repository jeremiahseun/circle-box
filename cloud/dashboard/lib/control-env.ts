export type ControlPlaneRuntimeConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
  sessionSecret: string;
};

let cachedConfig: ControlPlaneRuntimeConfig | null = null;

export function getControlPlaneRuntimeConfig(): ControlPlaneRuntimeConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    supabaseUrl: trimTrailingSlash(readRequiredEnv("DASHBOARD_CONTROL_SUPABASE_URL")),
    serviceRoleKey: readRequiredEnv("DASHBOARD_CONTROL_SUPABASE_SERVICE_ROLE_KEY"),
    sessionSecret: readRequiredEnv("DASHBOARD_APP_SESSION_SECRET"),
  };
  return cachedConfig;
}

function readRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
