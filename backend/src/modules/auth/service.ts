import argon2 from 'argon2';
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { PoolClient } from 'pg';

import { env } from '../../config/env.js';
import { generateOpaqueToken, hashOpaqueToken } from '../../lib/crypto.js';
import { withTransaction } from '../../lib/db.js';
import { AppError, isDatabaseError } from '../../lib/errors.js';
import { isValidTimeZone } from '../../lib/time.js';
import {
  createRefreshToken,
  createUser,
  findActiveRefreshTokenByHash,
  findUserByEmail,
  findUserById,
  revokeRefreshTokenByHash,
  touchLastLogin,
  type UserWithProfileRecord,
} from './repository.js';

export const REFRESH_TOKEN_COOKIE_NAME = 'catchup_refresh_token';

type AuthMetadata = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  inviteCode: string;
  avatarUrl: string | null;
};

type SessionResult = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(displayName: string): string {
  return displayName.trim();
}

function toPublicUser(record: UserWithProfileRecord): PublicUser {
  return {
    id: record.id,
    email: record.email,
    displayName: record.displayName,
    timezone: record.timezone,
    inviteCode: record.inviteCode,
    avatarUrl: record.avatarUrl,
  };
}

function refreshTokenExpiresAt(): string {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + env.refreshTokenTtlDays);
  return expiresAt.toISOString();
}

function refreshCookieOptions() {
  return {
    path: '/',
    httpOnly: true,
    secure: env.secureCookies,
    sameSite: 'lax' as const,
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60,
  };
}

function setRefreshCookie(reply: FastifyReply, refreshToken: string) {
  reply.setCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_TOKEN_COOKIE_NAME, refreshCookieOptions());
}

async function buildSession(
  fastify: FastifyInstance,
  client: PoolClient,
  user: UserWithProfileRecord,
  metadata: AuthMetadata,
  rotatedFromTokenId?: string | null,
): Promise<SessionResult> {
  const refreshToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(refreshToken);

  await createRefreshToken(client, {
    userId: user.id,
    tokenHash,
    expiresAt: refreshTokenExpiresAt(),
    rotatedFromTokenId: rotatedFromTokenId ?? null,
    userAgent: metadata.userAgent ?? null,
    ipAddress: metadata.ipAddress ?? null,
  });

  const accessToken = await fastify.jwt.sign({
    sub: user.id,
    email: user.email,
  });

  return {
    accessToken,
    refreshToken,
    user: toPublicUser(user),
  };
}

export async function signup(
  fastify: FastifyInstance,
  input: {
    email: string;
    password: string;
    displayName: string;
    timezone: string;
  },
  metadata: AuthMetadata,
): Promise<SessionResult> {
  const email = normalizeEmail(input.email);
  const displayName = normalizeDisplayName(input.displayName);

  if (displayName.length < 1 || displayName.length > 50) {
    throw new AppError(400, 'invalid_display_name', 'Display name must be between 1 and 50 characters.');
  }

  if (!isValidTimeZone(input.timezone.trim())) {
    throw new AppError(400, 'invalid_timezone', 'Timezone must be a valid IANA timezone.');
  }

  const passwordHash = await argon2.hash(input.password);

  try {
    return await withTransaction(fastify.db, async (client) => {
      const user = await createUser(client, {
        email,
        passwordHash,
        displayName,
        timezone: input.timezone.trim(),
      });

      return buildSession(fastify, client, user, metadata);
    });
  } catch (error) {
    if (isDatabaseError(error) && error.code === '23505') {
      throw new AppError(409, 'email_already_used', 'This email is already registered.');
    }

    throw error;
  }
}

export async function login(
  fastify: FastifyInstance,
  input: {
    email: string;
    password: string;
  },
  metadata: AuthMetadata,
): Promise<SessionResult> {
  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(fastify.db, email);

  if (!user) {
    throw new AppError(401, 'invalid_credentials', 'Email or password is incorrect.');
  }

  const passwordMatches = await argon2.verify(user.passwordHash, input.password);

  if (!passwordMatches) {
    throw new AppError(401, 'invalid_credentials', 'Email or password is incorrect.');
  }

  return withTransaction(fastify.db, async (client) => {
    await touchLastLogin(client, user.id);
    return buildSession(fastify, client, user, metadata);
  });
}

export async function refreshSession(
  fastify: FastifyInstance,
  refreshToken: string,
  metadata: AuthMetadata,
): Promise<SessionResult> {
  const tokenHash = hashOpaqueToken(refreshToken);

  return withTransaction(fastify.db, async (client) => {
    const tokenRecord = await findActiveRefreshTokenByHash(client, tokenHash);

    if (!tokenRecord) {
      throw new AppError(401, 'invalid_refresh_token', 'Refresh token is invalid or expired.');
    }

    await revokeRefreshTokenByHash(client, tokenHash);

    return buildSession(
      fastify,
      client,
      {
        id: tokenRecord.userId,
        email: tokenRecord.email,
        passwordHash: tokenRecord.passwordHash,
        emailVerifiedAt: tokenRecord.emailVerifiedAt,
        lastLoginAt: tokenRecord.lastLoginAt,
        createdAt: tokenRecord.createdAt,
        displayName: tokenRecord.displayName,
        avatarUrl: tokenRecord.avatarUrl,
        timezone: tokenRecord.timezone,
        inviteCode: tokenRecord.inviteCode,
      },
      metadata,
      tokenRecord.refreshTokenId,
    );
  });
}

export async function logout(
  fastify: FastifyInstance,
  refreshToken: string | undefined,
): Promise<void> {
  if (!refreshToken) {
    return;
  }

  await revokeRefreshTokenByHash(fastify.db, hashOpaqueToken(refreshToken));
}

export async function getCurrentUser(
  fastify: FastifyInstance,
  userId: string,
): Promise<PublicUser> {
  const user = await findUserById(fastify.db, userId);

  if (!user) {
    throw new AppError(404, 'user_not_found', 'User could not be found.');
  }

  return toPublicUser(user);
}

export function applySessionToReply(
  reply: FastifyReply,
  session: SessionResult,
): Omit<SessionResult, 'refreshToken'> {
  setRefreshCookie(reply, session.refreshToken);
  return {
    accessToken: session.accessToken,
    user: session.user,
  };
}
