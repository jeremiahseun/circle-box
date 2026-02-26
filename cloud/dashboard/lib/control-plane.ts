import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { getControlPlaneRuntimeConfig } from "./control-env";

export type ControlRegion = "us" | "eu";
export type ControlKeyType = "ingest" | "usage_beacon";

export type DashboardProject = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  region: ControlRegion;
  plan_tier: string;
  status: string;
  created_at: string;
};

export type DashboardApiKey = {
  id: string;
  project_id: string;
  key_type: ControlKeyType;
  key_prefix: string;
  region_scope: "us" | "eu" | "auto";
  active: boolean;
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
};

export type CreatedApiKey = {
  key: DashboardApiKey;
  secret: string;
};

export type UsageRow = {
  usage_date: string;
  reports_count: number;
  events_count: number;
  bytes_count: number;
};

export type UsageBeaconRow = {
  usage_date: string;
  sdk_family: string;
  sdk_version: string;
  mode: string;
  active_apps: number;
  crash_reports: number;
  events_emitted: number;
};

type ControlUser = {
  id: string;
  email: string;
  password_hash: string;
};

type Membership = {
  organization_id: string;
  role: "owner" | "admin" | "member";
};

type InsertPreferences = {
  prefer?: string;
};

export async function createUserAccount(input: {
  email: string;
  password: string;
  organizationName: string;
  projectName: string;
  region: ControlRegion;
}): Promise<{ user: { id: string; email: string }; project: DashboardProject; keys: CreatedApiKey[] }> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error("invalid_email");
  }
  if (input.password.length < 8) {
    throw new Error("password_too_short");
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error("account_already_exists");
  }

  const userId = randomUUID();
  const passwordHash = hashPassword(input.password);
  await restInsert("app_users", [
    {
      id: userId,
      email,
      password_hash: passwordHash,
    },
  ]);

  const organization = await createOrganization({
    name: input.organizationName,
  });
  await restInsert("organization_members", [
    {
      organization_id: organization.id,
      user_id: userId,
      role: "owner",
    },
  ]);

  const project = await createProject({
    organizationId: organization.id,
    name: input.projectName,
    region: input.region,
  });

  const ingestKey = await createApiKeyForProjectInternal({
    projectId: project.id,
    projectRegion: project.region,
    keyType: "ingest",
    actorUserId: userId,
  });
  const usageKey = await createApiKeyForProjectInternal({
    projectId: project.id,
    projectRegion: project.region,
    keyType: "usage_beacon",
    actorUserId: userId,
  });

  return {
    user: { id: userId, email },
    project,
    keys: [ingestKey, usageKey],
  };
}

export async function authenticateUser(input: {
  email: string;
  password: string;
}): Promise<{ id: string; email: string } | null> {
  const email = normalizeEmail(input.email);
  if (!email || input.password.length === 0) {
    return null;
  }
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }
  if (!verifyPassword(input.password, user.password_hash)) {
    return null;
  }
  return { id: user.id, email: user.email };
}

export async function listProjectsForUser(userId: string): Promise<DashboardProject[]> {
  const memberships = await listMemberships(userId);
  if (memberships.length === 0) {
    return [];
  }

  const orgIds = memberships.map((row) => row.organization_id);
  const query = new URLSearchParams({
    select: "id,organization_id,name,slug,region,plan_tier,status,created_at",
    order: "created_at.desc",
    organization_id: `in.(${orgIds.join(",")})`,
    limit: "100",
  });
  const rows = await restSelect("projects", query);
  return rows.map(parseProjectRow).filter((row): row is DashboardProject => row !== null);
}

export async function getProjectForUser(input: {
  userId: string;
  projectId: string;
}): Promise<DashboardProject | null> {
  const query = new URLSearchParams({
    id: `eq.${input.projectId}`,
    select: "id,organization_id,name,slug,region,plan_tier,status,created_at",
    limit: "1",
  });
  const rows = await restSelect("projects", query);
  if (rows.length === 0) {
    return null;
  }

  const project = parseProjectRow(rows[0]);
  if (!project) {
    return null;
  }

  const membership = await findMembership(input.userId, project.organization_id);
  return membership ? project : null;
}

export async function createProjectForUser(input: {
  userId: string;
  organizationId?: string;
  projectName: string;
  region: ControlRegion;
}): Promise<DashboardProject> {
  const memberships = await listMemberships(input.userId);
  if (memberships.length === 0) {
    throw new Error("membership_required");
  }

  const orgId = input.organizationId?.trim() || memberships[0].organization_id;
  const authorized = memberships.some((membership) => membership.organization_id === orgId);
  if (!authorized) {
    throw new Error("forbidden_project_create");
  }

  return createProject({
    organizationId: orgId,
    name: input.projectName,
    region: input.region,
  });
}

export async function listApiKeysForProject(input: {
  userId: string;
  projectId: string;
}): Promise<DashboardApiKey[]> {
  const project = await getProjectForUser(input);
  if (!project) {
    throw new Error("project_not_found_or_forbidden");
  }

  const query = new URLSearchParams({
    project_id: `eq.${project.id}`,
    select: "id,project_id,key_type,key_prefix,region_scope,active,expires_at,created_at,last_used_at",
    order: "created_at.desc",
    limit: "200",
  });
  const rows = await restSelect("api_keys", query);
  return rows.map(parseApiKeyRow).filter((row): row is DashboardApiKey => row !== null);
}

export async function createApiKeyForProject(input: {
  userId: string;
  projectId: string;
  keyType: ControlKeyType;
}): Promise<CreatedApiKey> {
  const project = await getProjectForUser({
    userId: input.userId,
    projectId: input.projectId,
  });
  if (!project) {
    throw new Error("project_not_found_or_forbidden");
  }
  return createApiKeyForProjectInternal({
    projectId: project.id,
    projectRegion: project.region,
    keyType: input.keyType,
    actorUserId: input.userId,
  });
}

export async function rotateApiKey(input: {
  userId: string;
  projectId: string;
  apiKeyId: string;
}): Promise<CreatedApiKey> {
  const project = await getProjectForUser({
    userId: input.userId,
    projectId: input.projectId,
  });
  if (!project) {
    throw new Error("project_not_found_or_forbidden");
  }

  const key = await readApiKey(input.projectId, input.apiKeyId);
  if (!key) {
    throw new Error("api_key_not_found");
  }

  await patchById("api_keys", input.apiKeyId, {
    active: false,
  });
  await restInsert("api_key_audit_log", [
    {
      api_key_id: key.id,
      project_id: key.project_id,
      actor_user_id: input.userId,
      action: "rotate",
      metadata: {
        previous_prefix: key.key_prefix,
      },
    },
  ]);

  return createApiKeyForProjectInternal({
    projectId: key.project_id,
    projectRegion: project.region,
    keyType: key.key_type,
    actorUserId: input.userId,
  });
}

export async function revokeApiKey(input: {
  userId: string;
  projectId: string;
  apiKeyId: string;
}): Promise<void> {
  const project = await getProjectForUser({
    userId: input.userId,
    projectId: input.projectId,
  });
  if (!project) {
    throw new Error("project_not_found_or_forbidden");
  }

  const key = await readApiKey(project.id, input.apiKeyId);
  if (!key) {
    throw new Error("api_key_not_found");
  }

  await patchById("api_keys", input.apiKeyId, {
    active: false,
  });
  await restInsert("api_key_audit_log", [
    {
      api_key_id: key.id,
      project_id: key.project_id,
      actor_user_id: input.userId,
      action: "revoke",
      metadata: {
        key_prefix: key.key_prefix,
      },
    },
  ]);
}

export async function listUsageForProject(input: {
  userId: string;
  projectId: string;
  days?: number;
}): Promise<{ usageRows: UsageRow[]; beaconRows: UsageBeaconRow[] }> {
  const project = await getProjectForUser({
    userId: input.userId,
    projectId: input.projectId,
  });
  if (!project) {
    throw new Error("project_not_found_or_forbidden");
  }

  const limit = Math.max(1, Math.min(input.days ?? 30, 90));
  const usageQuery = new URLSearchParams({
    project_id: `eq.${project.id}`,
    select: "usage_date,reports_count,events_count,bytes_count",
    order: "usage_date.desc",
    limit: String(limit),
  });
  const beaconQuery = new URLSearchParams({
    project_id: `eq.${project.id}`,
    select: "usage_date,sdk_family,sdk_version,mode,active_apps,crash_reports,events_emitted",
    order: "usage_date.desc",
    limit: String(limit * 6),
  });

  const [usageRowsRaw, beaconRowsRaw] = await Promise.all([
    restSelect("usage_daily", usageQuery),
    restSelect("usage_beacon_daily", beaconQuery),
  ]);

  return {
    usageRows: usageRowsRaw.map(parseUsageRow).filter((row): row is UsageRow => row !== null),
    beaconRows: beaconRowsRaw.map(parseUsageBeaconRow).filter((row): row is UsageBeaconRow => row !== null),
  };
}

type InternalCreateApiKeyInput = {
  projectId: string;
  projectRegion: ControlRegion;
  keyType: ControlKeyType;
  actorUserId: string;
};

async function createApiKeyForProjectInternal(input: InternalCreateApiKeyInput): Promise<CreatedApiKey> {
  const material = generateApiKey({
    projectId: input.projectId,
    projectRegion: input.projectRegion,
    keyType: input.keyType,
  });

  const row = {
    id: randomUUID(),
    project_id: input.projectId,
    key_type: input.keyType,
    key_prefix: material.prefix,
    hashed_secret: sha256Hex(material.secret),
    region_scope: material.regionScope,
    active: true,
    created_by: input.actorUserId,
  };
  await restInsert("api_keys", [row], {
    prefer: "return=representation",
  });
  await restInsert("api_key_audit_log", [
    {
      api_key_id: row.id,
      project_id: input.projectId,
      actor_user_id: input.actorUserId,
      action: "create",
      metadata: {
        key_type: input.keyType,
        key_prefix: material.prefix,
      },
    },
  ]);

  const created = await readApiKey(input.projectId, row.id);
  if (!created) {
    throw new Error("api_key_create_failed");
  }
  return {
    key: created,
    secret: material.secret,
  };
}

async function createOrganization(input: { name: string }): Promise<{ id: string }> {
  const baseSlug = slugify(input.name);
  const name = normalizeDisplayName(input.name, "CircleBox Org");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomBytes(2).toString("hex")}`;
    try {
      const row = {
        id: randomUUID(),
        name,
        slug,
      };
      await restInsert("organizations", [row]);
      return { id: row.id };
    } catch (error) {
      if (!isConflictError(error)) {
        throw error;
      }
    }
  }

  throw new Error("organization_create_conflict");
}

async function createProject(input: {
  organizationId: string;
  name: string;
  region: ControlRegion;
}): Promise<DashboardProject> {
  const baseSlug = slugify(input.name);
  const name = normalizeDisplayName(input.name, "CircleBox Project");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomBytes(2).toString("hex")}`;
    const row = {
      id: randomUUID(),
      organization_id: input.organizationId,
      name,
      slug,
      region: input.region,
      plan_tier: "free",
      status: "active",
    };
    try {
      await restInsert("projects", [row]);
      const created = await getProjectById(row.id);
      if (!created) {
        throw new Error("project_create_failed");
      }
      return created;
    } catch (error) {
      if (!isConflictError(error)) {
        throw error;
      }
    }
  }

  throw new Error("project_create_conflict");
}

async function getProjectById(projectId: string): Promise<DashboardProject | null> {
  const query = new URLSearchParams({
    id: `eq.${projectId}`,
    select: "id,organization_id,name,slug,region,plan_tier,status,created_at",
    limit: "1",
  });
  const rows = await restSelect("projects", query);
  if (rows.length === 0) {
    return null;
  }
  return parseProjectRow(rows[0]);
}

async function readApiKey(projectId: string, apiKeyId: string): Promise<DashboardApiKey | null> {
  const query = new URLSearchParams({
    id: `eq.${apiKeyId}`,
    project_id: `eq.${projectId}`,
    select: "id,project_id,key_type,key_prefix,region_scope,active,expires_at,created_at,last_used_at",
    limit: "1",
  });
  const rows = await restSelect("api_keys", query);
  if (rows.length === 0) {
    return null;
  }
  return parseApiKeyRow(rows[0]);
}

async function findUserByEmail(email: string): Promise<ControlUser | null> {
  const query = new URLSearchParams({
    email: `eq.${email}`,
    select: "id,email,password_hash",
    limit: "1",
  });
  const rows = await restSelect("app_users", query);
  if (rows.length === 0) {
    return null;
  }
  const id = asString(rows[0].id);
  const rowEmail = asString(rows[0].email);
  const passwordHash = asString(rows[0].password_hash);
  if (!id || !rowEmail || !passwordHash) {
    return null;
  }
  return {
    id,
    email: rowEmail,
    password_hash: passwordHash,
  };
}

async function listMemberships(userId: string): Promise<Membership[]> {
  const query = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "organization_id,role",
    limit: "200",
  });
  const rows = await restSelect("organization_members", query);
  return rows.map((row) => {
    const organizationId = asString(row.organization_id);
    const role = asString(row.role);
    if (!organizationId || (role !== "owner" && role !== "admin" && role !== "member")) {
      return null;
    }
    return {
      organization_id: organizationId,
      role,
    } as Membership;
  }).filter((row): row is Membership => row !== null);
}

async function findMembership(userId: string, organizationId: string): Promise<Membership | null> {
  const query = new URLSearchParams({
    user_id: `eq.${userId}`,
    organization_id: `eq.${organizationId}`,
    select: "organization_id,role",
    limit: "1",
  });
  const rows = await restSelect("organization_members", query);
  if (rows.length === 0) {
    return null;
  }
  const role = asString(rows[0].role);
  if (role !== "owner" && role !== "admin" && role !== "member") {
    return null;
  }
  return {
    organization_id: organizationId,
    role,
  };
}

function generateApiKey(input: {
  projectId: string;
  projectRegion: ControlRegion;
  keyType: ControlKeyType;
}): { prefix: string; secret: string; regionScope: "us" | "eu" | "auto" } {
  const projectToken = input.projectId.replace(/-/g, "").slice(0, 12) || "projectdemo";
  const keyLabel = randomBytes(3).toString("hex");
  const keySecretPart = randomBytes(16).toString("hex");

  if (input.keyType === "ingest") {
    const regionToken = input.projectRegion === "eu" ? "eu" : "us";
    const prefix = `cb_live_${projectToken}_${regionToken}_${keyLabel}`;
    return {
      prefix,
      secret: `${prefix}_${keySecretPart}`,
      regionScope: regionToken,
    };
  }

  const prefix = `cb_usage_${projectToken}_${keyLabel}`;
  return {
    prefix,
    secret: `${prefix}_${keySecretPart}`,
    regionScope: "auto",
  };
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const parts = encoded.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const salt = parts[1];
  const expected = Buffer.from(parts[2], "hex");
  const digest = scryptSync(password, salt, expected.length);
  return expected.length === digest.length && timingSafeEqual(expected, digest);
}

async function restSelect(resource: string, query: URLSearchParams): Promise<Array<Record<string, unknown>>> {
  const config = getControlPlaneRuntimeConfig();
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${resource}?${query.toString()}`, {
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
    throw new Error(`control_select_failed:${resource}:${response.status}:${body}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
}

async function restInsert(
  resource: string,
  rows: Array<Record<string, unknown>>,
  options: InsertPreferences = {},
): Promise<void> {
  const config = getControlPlaneRuntimeConfig();
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${resource}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
      "content-type": "application/json",
      prefer: options.prefer ?? "return=minimal",
    },
    body: JSON.stringify(rows),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`control_insert_failed:${resource}:${response.status}:${body}`);
  }
}

async function patchById(resource: string, id: string, patch: Record<string, unknown>): Promise<void> {
  const config = getControlPlaneRuntimeConfig();
  const query = new URLSearchParams({ id: `eq.${id}` });
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${resource}?${query.toString()}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${config.serviceRoleKey}`,
      apikey: config.serviceRoleKey,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await safeReadBody(response);
    throw new Error(`control_patch_failed:${resource}:${response.status}:${body}`);
  }
}

function parseProjectRow(row: Record<string, unknown>): DashboardProject | null {
  const id = asString(row.id);
  const organizationId = asString(row.organization_id);
  const name = asString(row.name);
  const slug = asString(row.slug);
  const region = asString(row.region);
  const planTier = asString(row.plan_tier);
  const status = asString(row.status);
  const createdAt = asString(row.created_at);
  if (
    !id ||
    !organizationId ||
    !name ||
    !slug ||
    (region !== "us" && region !== "eu") ||
    !planTier ||
    !status ||
    !createdAt
  ) {
    return null;
  }
  return {
    id,
    organization_id: organizationId,
    name,
    slug,
    region,
    plan_tier: planTier,
    status,
    created_at: createdAt,
  };
}

function parseApiKeyRow(row: Record<string, unknown>): DashboardApiKey | null {
  const id = asString(row.id);
  const projectId = asString(row.project_id);
  const keyType = asString(row.key_type);
  const keyPrefix = asString(row.key_prefix);
  const regionScope = asString(row.region_scope);
  const active = typeof row.active === "boolean" ? row.active : null;
  const expiresAt = asNullableString(row.expires_at);
  const createdAt = asString(row.created_at);
  const lastUsedAt = asNullableString(row.last_used_at);

  if (
    !id ||
    !projectId ||
    (keyType !== "ingest" && keyType !== "usage_beacon") ||
    !keyPrefix ||
    (regionScope !== "us" && regionScope !== "eu" && regionScope !== "auto") ||
    active === null ||
    !createdAt
  ) {
    return null;
  }

  return {
    id,
    project_id: projectId,
    key_type: keyType,
    key_prefix: keyPrefix,
    region_scope: regionScope,
    active,
    expires_at: expiresAt,
    created_at: createdAt,
    last_used_at: lastUsedAt,
  };
}

function parseUsageRow(row: Record<string, unknown>): UsageRow | null {
  const usageDate = asString(row.usage_date);
  const reportsCount = asNumber(row.reports_count);
  const eventsCount = asNumber(row.events_count);
  const bytesCount = asNumber(row.bytes_count);
  if (!usageDate || reportsCount === null || eventsCount === null || bytesCount === null) {
    return null;
  }
  return {
    usage_date: usageDate,
    reports_count: reportsCount,
    events_count: eventsCount,
    bytes_count: bytesCount,
  };
}

function parseUsageBeaconRow(row: Record<string, unknown>): UsageBeaconRow | null {
  const usageDate = asString(row.usage_date);
  const sdkFamily = asString(row.sdk_family);
  const sdkVersion = asString(row.sdk_version);
  const mode = asString(row.mode);
  const activeApps = asNumber(row.active_apps);
  const crashReports = asNumber(row.crash_reports);
  const eventsEmitted = asNumber(row.events_emitted);
  if (!usageDate || !sdkFamily || !sdkVersion || !mode || activeApps === null || crashReports === null || eventsEmitted === null) {
    return null;
  }
  return {
    usage_date: usageDate,
    sdk_family: sdkFamily,
    sdk_version: sdkVersion,
    mode,
    active_apps: activeApps,
    crash_reports: crashReports,
    events_emitted: eventsEmitted,
  };
}

function normalizeEmail(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (value.length < 3 || !value.includes("@") || value.length > 256) {
    return null;
  }
  return value;
}

function normalizeDisplayName(input: string, fallback: string): string {
  const value = input.trim().replace(/\s+/g, " ");
  if (value.length === 0) {
    return fallback;
  }
  return value.slice(0, 80);
}

function slugify(input: string): string {
  const clean = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean.length > 0 ? clean.slice(0, 48) : `project-${randomBytes(2).toString("hex")}`;
}

function asString(input: unknown): string | null {
  return typeof input === "string" && input.trim().length > 0 ? input.trim() : null;
}

function asNullableString(input: unknown): string | null {
  return typeof input === "string" && input.trim().length > 0 ? input.trim() : null;
}

function asNumber(input: unknown): number | null {
  return typeof input === "number" && Number.isFinite(input) ? input : null;
}

function isConflictError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes(":409:");
}

async function safeReadBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "unreadable_body";
  }
}
