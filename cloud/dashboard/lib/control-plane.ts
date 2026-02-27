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
  max_reports_per_minute: number;
  max_fragments_per_minute: number;
  burst_limit: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
};

export type DashboardMember = {
  user_id: string;
  email: string;
  role: "owner" | "admin" | "member";
  created_at: string;
};

export type DashboardInvite = {
  id: string;
  organization_id: string;
  mode: "open_token";
  role: "member";
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
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
  organizationName?: string;
  inviteToken?: string;
}): Promise<{ user: { id: string; email: string }; organizationId: string; joinedViaInvite: boolean }> {
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

  const normalizedInviteToken = input.inviteToken?.trim();
  const invite = normalizedInviteToken
    ? await readActiveInviteByToken(normalizedInviteToken)
    : null;
  if (normalizedInviteToken && !invite) {
    throw new Error("invite_not_found_or_inactive");
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

  if (invite) {
    await restInsert(
      "organization_members?on_conflict=organization_id,user_id",
      [
        {
          organization_id: invite.organization_id,
          user_id: userId,
          role: "member",
        },
      ],
      {
        prefer: "resolution=merge-duplicates,return=minimal",
      },
    );

    await patchById("organization_invites", invite.id, {
      accepted_at: new Date().toISOString(),
    });

    await insertAuditEvent({
      actionType: "signup",
      actorUserId: userId,
      organizationId: invite.organization_id,
      metadata: {
        email,
        mode: "invite",
        invite_id: invite.id,
      },
    });
    await insertAuditEvent({
      actionType: "invite_accept",
      actorUserId: userId,
      organizationId: invite.organization_id,
      metadata: {
        invite_id: invite.id,
      },
    });

    return {
      user: { id: userId, email },
      organizationId: invite.organization_id,
      joinedViaInvite: true,
    };
  }

  const organizationName = normalizeDisplayName(
    input.organizationName ?? `${email.split("@")[0]} Workspace`,
    "CircleBox Workspace",
  );
  const organization = await createOrganization({
    name: organizationName,
  });
  await restInsert("organization_members", [
    {
      organization_id: organization.id,
      user_id: userId,
      role: "owner",
    },
  ]);
  await insertAuditEvent({
    actionType: "signup",
    actorUserId: userId,
    organizationId: organization.id,
    metadata: {
      email,
      mode: "owner",
    },
  });

  return {
    user: { id: userId, email },
    organizationId: organization.id,
    joinedViaInvite: false,
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
  await insertAuditEvent({
    actionType: "login_success",
    actorUserId: user.id,
    metadata: {
      email: user.email,
    },
  });
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

export async function getProjectRoleForUser(input: {
  userId: string;
  projectId: string;
}): Promise<"owner" | "admin" | "member" | null> {
  const project = await getProjectForUser(input);
  if (!project) {
    return null;
  }
  const membership = await findMembership(input.userId, project.organization_id);
  return membership?.role ?? null;
}

export async function recordProjectAuditEvent(input: {
  userId: string;
  projectId: string;
  actionType: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const project = await getProjectForUser({
    userId: input.userId,
    projectId: input.projectId,
  });
  if (!project) {
    return;
  }
  await insertAuditEvent({
    actionType: input.actionType,
    actorUserId: input.userId,
    organizationId: project.organization_id,
    projectId: project.id,
    metadata: input.metadata,
  });
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
    select: "id,project_id,key_type,key_prefix,region_scope,max_reports_per_minute,max_fragments_per_minute,burst_limit,active,expires_at,created_at,last_used_at",
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
  const membership = await findMembership(input.userId, project.organization_id);
  if (!membership || membership.role !== "owner") {
    throw new Error("owner_required");
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
  const membership = await findMembership(input.userId, project.organization_id);
  if (!membership || membership.role !== "owner") {
    throw new Error("owner_required");
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
  await insertAuditEvent({
    actionType: "key_rotate",
    actorUserId: input.userId,
    organizationId: project.organization_id,
    projectId: project.id,
    metadata: {
      key_id: key.id,
      key_type: key.key_type,
    },
  });

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
  const membership = await findMembership(input.userId, project.organization_id);
  if (!membership || membership.role !== "owner") {
    throw new Error("owner_required");
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
  await insertAuditEvent({
    actionType: "key_revoke",
    actorUserId: input.userId,
    organizationId: project.organization_id,
    projectId: project.id,
    metadata: {
      key_id: key.id,
      key_type: key.key_type,
    },
  });
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

export async function listMembersForProject(input: {
  userId: string;
  projectId: string;
}): Promise<DashboardMember[]> {
  const project = await getProjectForUser({
    userId: input.userId,
    projectId: input.projectId,
  });
  if (!project) {
    throw new Error("project_not_found_or_forbidden");
  }

  const membersQuery = new URLSearchParams({
    organization_id: `eq.${project.organization_id}`,
    select: "organization_id,user_id,role,created_at",
    order: "created_at.asc",
    limit: "500",
  });
  const rawMembers = await restSelect("organization_members", membersQuery);
  const members = rawMembers.map(parseMemberRow).filter((row): row is DashboardMember => row !== null);

  const uniqueUserIds = Array.from(new Set(members.map((member) => member.user_id)));
  const emailMap = new Map<string, string>();
  if (uniqueUserIds.length > 0) {
    const usersQuery = new URLSearchParams({
      id: `in.(${uniqueUserIds.join(",")})`,
      select: "id,email",
      limit: "500",
    });
    const users = await restSelect("app_users", usersQuery);
    for (const row of users) {
      const id = asString(row.id);
      const email = asString(row.email);
      if (id && email) {
        emailMap.set(id, email);
      }
    }
  }

  return members.map((member) => ({
    ...member,
    email: emailMap.get(member.user_id) ?? "unknown@pending",
  }));
}

export async function listInvitesForProject(input: {
  userId: string;
  projectId: string;
}): Promise<DashboardInvite[]> {
  const project = await getProjectForUser({
    userId: input.userId,
    projectId: input.projectId,
  });
  if (!project) {
    throw new Error("project_not_found_or_forbidden");
  }

  const query = new URLSearchParams({
    organization_id: `eq.${project.organization_id}`,
    select: "id,organization_id,email,role,expires_at,created_at,accepted_at,revoked_at",
    order: "created_at.desc",
    limit: "200",
  });
  const rows = await restSelect("organization_invites", query);
  return rows.map(parseInviteRow).filter((row): row is DashboardInvite => row !== null);
}

export async function createInviteForProject(input: {
  userId: string;
  projectId: string;
  expiresInDays?: number;
}): Promise<{ invite: DashboardInvite; inviteToken: string }> {
  const project = await getProjectForUser({
    userId: input.userId,
    projectId: input.projectId,
  });
  if (!project) {
    throw new Error("project_not_found_or_forbidden");
  }

  const membership = await findMembership(input.userId, project.organization_id);
  if (!membership || membership.role !== "owner") {
    throw new Error("owner_required");
  }

  const inviteToken = randomBytes(24).toString("hex");
  const expiresInDays = Math.max(1, Math.min(input.expiresInDays ?? 7, 30));
  const expiresAt = new Date(Date.now() + (expiresInDays * 24 * 60 * 60 * 1000)).toISOString();
  const inviteId = randomUUID();

  await restInsert("organization_invites", [
    {
      id: inviteId,
      organization_id: project.organization_id,
      email: "open_invite",
      role: "member",
      invite_token_hash: sha256Hex(inviteToken),
      invited_by: input.userId,
      expires_at: expiresAt,
    },
  ]);

  await insertAuditEvent({
    actionType: "invite_create",
    actorUserId: input.userId,
    organizationId: project.organization_id,
    projectId: project.id,
    metadata: {
      mode: "open_token",
      expires_at: expiresAt,
    },
  });

  const invite = await readInviteById(project.organization_id, inviteId);
  if (!invite) {
    throw new Error("invite_create_failed");
  }
  return {
    invite,
    inviteToken,
  };
}

export async function revokeInviteForProject(input: {
  userId: string;
  projectId: string;
  inviteId: string;
}): Promise<void> {
  const project = await getProjectForUser({
    userId: input.userId,
    projectId: input.projectId,
  });
  if (!project) {
    throw new Error("project_not_found_or_forbidden");
  }

  const membership = await findMembership(input.userId, project.organization_id);
  if (!membership || membership.role !== "owner") {
    throw new Error("owner_required");
  }

  const invite = await readInviteById(project.organization_id, input.inviteId);
  if (!invite) {
    throw new Error("invite_not_found");
  }

  await patchById("organization_invites", input.inviteId, {
    revoked_at: new Date().toISOString(),
  });

  await insertAuditEvent({
    actionType: "invite_revoke",
    actorUserId: input.userId,
    organizationId: project.organization_id,
    projectId: project.id,
    metadata: {
      invite_id: input.inviteId,
      mode: invite.mode,
    },
  });
}

export async function acceptInviteForUser(input: {
  userId: string;
  inviteToken: string;
}): Promise<{ organizationId: string }> {
  const token = input.inviteToken.trim();
  if (token.length < 16) {
    throw new Error("invalid_invite_token");
  }
  const invite = await readActiveInviteByToken(token);
  if (!invite) {
    throw new Error("invite_not_found");
  }

  await restInsert(
    "organization_members?on_conflict=organization_id,user_id",
    [
      {
        organization_id: invite.organization_id,
        user_id: input.userId,
        role: "member",
      },
    ],
    {
      prefer: "resolution=merge-duplicates,return=minimal",
    },
  );
  await patchById("organization_invites", invite.id, {
    accepted_at: new Date().toISOString(),
  });

  await insertAuditEvent({
    actionType: "invite_accept",
    actorUserId: input.userId,
    organizationId: invite.organization_id,
    metadata: {
      invite_id: invite.id,
      mode: "open_token",
    },
  });

  return {
    organizationId: invite.organization_id,
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
    max_reports_per_minute: 120,
    max_fragments_per_minute: 240,
    burst_limit: 40,
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
  await insertAuditEvent({
    actionType: "key_create",
    actorUserId: input.actorUserId,
    projectId: input.projectId,
    metadata: {
      key_type: input.keyType,
      key_prefix: material.prefix,
    },
  });

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
      await restInsert(
        "project_retention_policies",
        [
          {
            project_id: created.id,
            raw_retention_days: 30,
            aggregate_retention_days: 180,
          },
        ],
        {
          prefer: "resolution=ignore-duplicates,return=minimal",
        },
      );
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
    select: "id,project_id,key_type,key_prefix,region_scope,max_reports_per_minute,max_fragments_per_minute,burst_limit,active,expires_at,created_at,last_used_at",
    limit: "1",
  });
  const rows = await restSelect("api_keys", query);
  if (rows.length === 0) {
    return null;
  }
  return parseApiKeyRow(rows[0]);
}

async function readInviteById(organizationId: string, inviteId: string): Promise<DashboardInvite | null> {
  const query = new URLSearchParams({
    id: `eq.${inviteId}`,
    organization_id: `eq.${organizationId}`,
    select: "id,organization_id,email,role,expires_at,created_at,accepted_at,revoked_at",
    limit: "1",
  });
  const rows = await restSelect("organization_invites", query);
  if (rows.length === 0) {
    return null;
  }
  return parseInviteRow(rows[0]);
}

async function readActiveInviteByToken(inviteToken: string): Promise<DashboardInvite | null> {
  const hashed = sha256Hex(inviteToken.trim());
  const query = new URLSearchParams({
    invite_token_hash: `eq.${hashed}`,
    select: "id,organization_id,email,role,expires_at,created_at,accepted_at,revoked_at",
    limit: "1",
  });
  const rows = await restSelect("organization_invites", query);
  if (rows.length === 0) {
    return null;
  }
  const invite = parseInviteRow(rows[0]);
  if (!invite) {
    return null;
  }
  if (invite.revoked_at) {
    return null;
  }
  if (Date.parse(invite.expires_at) <= Date.now()) {
    return null;
  }
  return invite;
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

async function insertAuditEvent(input: {
  actionType: string;
  actorUserId?: string;
  organizationId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await restInsert("audit_events", [
      {
        action_type: input.actionType,
        actor_user_id: input.actorUserId ?? null,
        organization_id: input.organizationId ?? null,
        project_id: input.projectId ?? null,
        metadata: input.metadata ?? {},
      },
    ]);
  } catch {
    // Audit writes are best-effort and should not break user workflows.
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
  const maxReportsPerMinute = asNumber(row.max_reports_per_minute) ?? 120;
  const maxFragmentsPerMinute = asNumber(row.max_fragments_per_minute) ?? 240;
  const burstLimit = asNumber(row.burst_limit) ?? 40;
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
    max_reports_per_minute: maxReportsPerMinute,
    max_fragments_per_minute: maxFragmentsPerMinute,
    burst_limit: burstLimit,
    active,
    expires_at: expiresAt,
    created_at: createdAt,
    last_used_at: lastUsedAt,
  };
}

function parseMemberRow(row: Record<string, unknown>): DashboardMember | null {
  const userId = asString(row.user_id);
  const role = asString(row.role);
  const createdAt = asString(row.created_at);
  if (!userId || !createdAt || (role !== "owner" && role !== "admin" && role !== "member")) {
    return null;
  }
  return {
    user_id: userId,
    email: "unknown@pending",
    role,
    created_at: createdAt,
  };
}

function parseInviteRow(row: Record<string, unknown>): DashboardInvite | null {
  const id = asString(row.id);
  const organizationId = asString(row.organization_id);
  const role = asString(row.role);
  const expiresAt = asString(row.expires_at);
  const createdAt = asString(row.created_at);
  const acceptedAt = asNullableString(row.accepted_at);
  const revokedAt = asNullableString(row.revoked_at);
  if (!id || !organizationId || role !== "member" || !expiresAt || !createdAt) {
    return null;
  }
  return {
    id,
    organization_id: organizationId,
    mode: "open_token",
    role,
    expires_at: expiresAt,
    created_at: createdAt,
    accepted_at: acceptedAt,
    revoked_at: revokedAt,
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
