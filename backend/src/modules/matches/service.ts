import type { FastifyInstance } from 'fastify';

import { AppError, isDatabaseError } from '../../lib/errors.js';
import { isValidLocalDay } from '../../lib/time.js';
import {
  attemptMatchForUserOnLocalDay,
  expirePendingMatches,
  findMatchForUser,
  listMatchesForUser,
  respondToMatch,
  type MatchRecord,
  type MatchStatus,
} from './repository.js';

export type MatchView = {
  id: string;
  localDay: string;
  status: MatchStatus;
  overlapStartsAt: string;
  overlapEndsAt: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counterpart: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    timezone: string;
  };
  myResponse: {
    response: MatchRecord['myResponse'];
    respondedAt: string | null;
  };
  counterpartResponse: {
    response: MatchRecord['counterpartResponse'];
    respondedAt: string | null;
  };
};

function toMatchView(record: MatchRecord): MatchView {
  return {
    id: record.id,
    localDay: record.localDay,
    status: record.status,
    overlapStartsAt: record.overlapStartsAt,
    overlapEndsAt: record.overlapEndsAt,
    expiresAt: record.expiresAt,
    acceptedAt: record.acceptedAt,
    declinedAt: record.declinedAt,
    cancelledAt: record.cancelledAt,
    completedAt: record.completedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    counterpart: {
      id: record.counterpartId,
      displayName: record.counterpartDisplayName,
      avatarUrl: record.counterpartAvatarUrl,
      timezone: record.counterpartTimezone,
    },
    myResponse: {
      response: record.myResponse,
      respondedAt: record.myRespondedAt,
    },
    counterpartResponse: {
      response: record.counterpartResponse,
      respondedAt: record.counterpartRespondedAt,
    },
  };
}

function validateLocalDay(localDay: string) {
  if (!isValidLocalDay(localDay)) {
    throw new AppError(400, 'invalid_local_day', 'Local day must be a valid YYYY-MM-DD date.');
  }
}

function publishMatchChanged(
  fastify: FastifyInstance,
  users: {
    userOneId: string;
    userTwoId: string;
    matchId: string;
    status?: MatchStatus;
  },
) {
  const event = {
    type: 'matches.changed',
    data: {
      matchId: users.matchId,
      status: users.status ?? null,
    },
    emittedAt: new Date().toISOString(),
  };

  fastify.publishUserEvent(users.userOneId, event);
  fastify.publishUserEvent(users.userTwoId, event);
}

function mapMatchError(error: unknown): never {
  if (isDatabaseError(error) && error.code === 'P0001') {
    if (error.message === 'match_not_found') {
      throw new AppError(404, 'match_not_found', 'Match could not be found.');
    }

    if (error.message === 'match_not_pending') {
      throw new AppError(409, 'match_not_pending', 'Match is no longer pending.');
    }

    if (error.message === 'invalid_match_response') {
      throw new AppError(400, 'invalid_match_response', 'Match response must be accept or decline.');
    }

    if (error.message === 'match_response_not_found') {
      throw new AppError(404, 'match_response_not_found', 'Match response row could not be found.');
    }

    if (error.message === 'invalid_match_expiry_minutes') {
      throw new AppError(400, 'invalid_match_expiry_minutes', 'Match expiry must be between 1 and 1440 minutes.');
    }
  }

  throw error;
}

export async function getMatches(
  fastify: FastifyInstance,
  userId: string,
  query: {
    status?: MatchStatus | undefined;
    localDay?: string | undefined;
  },
): Promise<{ matches: MatchView[] }> {
  if (query.localDay) {
    validateLocalDay(query.localDay);
  }

  await expirePendingMatches(fastify.db);

  const matches = await listMatchesForUser(fastify.db, {
    userId,
    status: query.status,
    localDay: query.localDay,
  });

  return {
    matches: matches.map(toMatchView),
  };
}

export async function getMatch(
  fastify: FastifyInstance,
  userId: string,
  matchId: string,
): Promise<{ match: MatchView }> {
  await expirePendingMatches(fastify.db);

  const match = await findMatchForUser(fastify.db, userId, matchId);

  if (!match) {
    throw new AppError(404, 'match_not_found', 'Match could not be found.');
  }

  return { match: toMatchView(match) };
}

export async function attemptMatch(
  fastify: FastifyInstance,
  userId: string,
  input: {
    localDay: string;
    expiresInMinutes?: number | undefined;
  },
): Promise<{ match: MatchView | null }> {
  validateLocalDay(input.localDay);

  const expiresInMinutes = input.expiresInMinutes ?? 15;

  try {
    const createdMatch = await attemptMatchForUserOnLocalDay(fastify.db, {
      userId,
      localDay: input.localDay,
      expiresInMinutes,
    });

    if (!createdMatch) {
      return { match: null };
    }

    const match = await findMatchForUser(fastify.db, userId, createdMatch.id);

    if (!match) {
      throw new Error('Failed to load created match.');
    }

    publishMatchChanged(fastify, {
      userOneId: createdMatch.userOneId,
      userTwoId: createdMatch.userTwoId,
      matchId: createdMatch.id,
      status: match.status,
    });

    fastify.log.info(
      {
        event: 'matches.created',
        matchId: createdMatch.id,
        userId,
        status: match.status,
        localDay: input.localDay,
      },
      'Match created.',
    );

    return { match: toMatchView(match) };
  } catch (error) {
    mapMatchError(error);
  }
}

export async function respondToExistingMatch(
  fastify: FastifyInstance,
  userId: string,
  input: {
    matchId: string;
    response: 'accept' | 'decline';
  },
): Promise<{ match: MatchView }> {
  try {
    const response = input.response === 'accept' ? 'accepted' : 'declined';
    const updatedMatch = await respondToMatch(fastify.db, {
      userId,
      matchId: input.matchId,
      response,
    });

    if (!updatedMatch) {
      throw new AppError(404, 'match_not_found', 'Match could not be found.');
    }

    const match = await findMatchForUser(fastify.db, userId, updatedMatch.id);

    if (!match) {
      throw new Error('Failed to load updated match.');
    }

    publishMatchChanged(fastify, {
      userOneId: updatedMatch.userOneId,
      userTwoId: updatedMatch.userTwoId,
      matchId: updatedMatch.id,
      status: updatedMatch.status,
    });

    fastify.log.info(
      {
        event: 'matches.responded',
        matchId: updatedMatch.id,
        userId,
        response: input.response,
        status: updatedMatch.status,
      },
      'Match response processed.',
    );

    return { match: toMatchView(match) };
  } catch (error) {
    mapMatchError(error);
  }
}
