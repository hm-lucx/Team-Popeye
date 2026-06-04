import type { Queryable } from '../../lib/db.js';

export type UserWithProfileRecord = {
  id: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  inviteCode: string;
};

export type RefreshTokenRecord = {
  refreshTokenId: string;
  userId: string;
  expiresAt: string;
  revokedAt: string | null;
  rotatedFromTokenId: string | null;
  email: string;
  passwordHash: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  inviteCode: string;
};

export async function findUserByEmail(
  db: Queryable,
  email: string,
): Promise<UserWithProfileRecord | null> {
  const result = await db.query<UserWithProfileRecord>(
    `
      select
        u.id,
        u.email::text as email,
        u.password_hash as "passwordHash",
        u.email_verified_at as "emailVerifiedAt",
        u.last_login_at as "lastLoginAt",
        u.created_at as "createdAt",
        p.display_name as "displayName",
        p.avatar_url as "avatarUrl",
        p.timezone,
        p.invite_code as "inviteCode"
      from public.users u
      join public.profiles p on p.id = u.id
      where u.email = $1
      limit 1
    `,
    [email],
  );

  return result.rows[0] ?? null;
}

export async function findUserById(
  db: Queryable,
  userId: string,
): Promise<UserWithProfileRecord | null> {
  const result = await db.query<UserWithProfileRecord>(
    `
      select
        u.id,
        u.email::text as email,
        u.password_hash as "passwordHash",
        u.email_verified_at as "emailVerifiedAt",
        u.last_login_at as "lastLoginAt",
        u.created_at as "createdAt",
        p.display_name as "displayName",
        p.avatar_url as "avatarUrl",
        p.timezone,
        p.invite_code as "inviteCode"
      from public.users u
      join public.profiles p on p.id = u.id
      where u.id = $1
      limit 1
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function createUser(
  db: Queryable,
  input: {
    email: string;
    passwordHash: string;
    displayName: string;
    timezone: string;
  },
): Promise<UserWithProfileRecord> {
  const insertedUser = await db.query<{ id: string }>(
    `
      insert into public.users (email, password_hash)
      values ($1, $2)
      returning id
    `,
    [input.email, input.passwordHash],
  );

  const userId = insertedUser.rows[0]?.id;

  if (!userId) {
    throw new Error('Failed to create user.');
  }

  await db.query(
    `
      update public.profiles
      set display_name = $2,
          timezone = $3
      where id = $1
    `,
    [userId, input.displayName, input.timezone],
  );

  const user = await findUserById(db, userId);

  if (!user) {
    throw new Error('Failed to load created user.');
  }

  return user;
}

export async function touchLastLogin(
  db: Queryable,
  userId: string,
): Promise<void> {
  await db.query(
    `
      update public.users
      set last_login_at = timezone('utc', now())
      where id = $1
    `,
    [userId],
  );
}

export async function createRefreshToken(
  db: Queryable,
  input: {
    userId: string;
    tokenHash: string;
    expiresAt: string;
    rotatedFromTokenId?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
  },
): Promise<void> {
  await db.query(
    `
      insert into public.refresh_tokens (
        user_id,
        token_hash,
        expires_at,
        rotated_from_token_id,
        user_agent,
        ip_address
      )
      values ($1, $2, $3, $4, $5, $6)
    `,
    [
      input.userId,
      input.tokenHash,
      input.expiresAt,
      input.rotatedFromTokenId ?? null,
      input.userAgent ?? null,
      input.ipAddress ?? null,
    ],
  );
}

export async function revokeRefreshTokenByHash(
  db: Queryable,
  tokenHash: string,
): Promise<void> {
  await db.query(
    `
      update public.refresh_tokens
      set revoked_at = timezone('utc', now())
      where token_hash = $1
        and revoked_at is null
    `,
    [tokenHash],
  );
}

export async function findActiveRefreshTokenByHash(
  db: Queryable,
  tokenHash: string,
): Promise<RefreshTokenRecord | null> {
  const result = await db.query<RefreshTokenRecord>(
    `
      select
        rt.id as "refreshTokenId",
        rt.user_id as "userId",
        rt.expires_at as "expiresAt",
        rt.revoked_at as "revokedAt",
        rt.rotated_from_token_id as "rotatedFromTokenId",
        u.email::text as email,
        u.password_hash as "passwordHash",
        u.email_verified_at as "emailVerifiedAt",
        u.last_login_at as "lastLoginAt",
        u.created_at as "createdAt",
        p.display_name as "displayName",
        p.avatar_url as "avatarUrl",
        p.timezone,
        p.invite_code as "inviteCode"
      from public.refresh_tokens rt
      join public.users u on u.id = rt.user_id
      join public.profiles p on p.id = u.id
      where rt.token_hash = $1
        and rt.revoked_at is null
        and rt.expires_at > timezone('utc', now())
      for update
      limit 1
    `,
    [tokenHash],
  );

  return result.rows[0] ?? null;
}
