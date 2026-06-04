import type { FastifyInstance } from 'fastify';

import { withTransaction } from '../../lib/db.js';
import {
  findCallSessionByMatchId,
  listCallParticipants,
  lockMatchForCallById,
  markJoinedParticipantsLeftIfNeeded,
  markMatchCompleted,
  markMatchMissed,
  markParticipantsMissedIfNeverJoined,
  updateCallSessionStatus,
} from '../calls/repository.js';
import type { MatchStatus } from '../matches/repository.js';
import { expirePendingMatchesReturning, listDueAcceptedMatches } from './repository.js';

type MaintenanceSweepResult = {
  expiredPendingCount: number;
  finalizedAcceptedCount: number;
  completedCount: number;
  missedCount: number;
};

function publishMatchChanged(
  fastify: FastifyInstance,
  input: {
    userOneId: string;
    userTwoId: string;
    matchId: string;
    status: MatchStatus;
  },
) {
  const event = {
    type: 'matches.changed',
    data: {
      matchId: input.matchId,
      status: input.status,
    },
    emittedAt: new Date().toISOString(),
  };

  fastify.publishUserEvent(input.userOneId, event);
  fastify.publishUserEvent(input.userTwoId, event);
}

function publishCallChanged(
  fastify: FastifyInstance,
  input: {
    userOneId: string;
    userTwoId: string;
    matchId: string;
    callSessionId: string;
    status: 'ended';
  },
) {
  const event = {
    type: 'calls.changed',
    data: {
      matchId: input.matchId,
      callSessionId: input.callSessionId,
      status: input.status,
    },
    emittedAt: new Date().toISOString(),
  };

  fastify.publishUserEvent(input.userOneId, event);
  fastify.publishUserEvent(input.userTwoId, event);
}

function publishStreakChanged(
  fastify: FastifyInstance,
  input: {
    userOneId: string;
    userTwoId: string;
    localDay: string;
  },
) {
  const event = {
    type: 'streaks.changed',
    data: {
      localDay: input.localDay,
    },
    emittedAt: new Date().toISOString(),
  };

  fastify.publishUserEvent(input.userOneId, event);
  fastify.publishUserEvent(input.userTwoId, event);
}

export async function runMaintenanceSweep(
  fastify: FastifyInstance,
): Promise<MaintenanceSweepResult> {
  const expired = await expirePendingMatchesReturning(fastify.db);

  for (const match of expired) {
    publishMatchChanged(fastify, {
      userOneId: match.userOneId,
      userTwoId: match.userTwoId,
      matchId: match.id,
      status: 'expired',
    });
  }

  const dueMatches = await listDueAcceptedMatches(fastify.db, new Date().toISOString());
  let completedCount = 0;
  let missedCount = 0;
  let finalizedAcceptedCount = 0;

  for (const dueMatch of dueMatches) {
    const outcome = await withTransaction(fastify.db, async (client) => {
      const lockedMatch = await lockMatchForCallById(client, dueMatch.id);

      if (!lockedMatch || lockedMatch.status !== 'accepted') {
        return null;
      }

      const session = await findCallSessionByMatchId(client, lockedMatch.id);
      const participants = session ? await listCallParticipants(client, session.id) : [];
      const joinedParticipants = participants.filter((participant) => participant.joinedAt !== null);
      const everyoneJoined = participants.length === 2 && joinedParticipants.length === 2;

      if (session) {
        await markJoinedParticipantsLeftIfNeeded(client, session.id);

        if (!everyoneJoined) {
          await markParticipantsMissedIfNeverJoined(client, session.id);
        }

        await updateCallSessionStatus(client, {
          callSessionId: session.id,
          status: 'ended',
          setEndedNow: true,
        });
      }

      if (everyoneJoined) {
        await markMatchCompleted(client, lockedMatch.id);
      } else {
        await markMatchMissed(client, lockedMatch.id);
      }

      return {
        matchId: lockedMatch.id,
        userOneId: lockedMatch.userOneId,
        userTwoId: lockedMatch.userTwoId,
        localDay: lockedMatch.localDay,
        matchStatus: everyoneJoined ? ('completed' as const) : ('missed' as const),
        callSessionId: session?.id ?? null,
      };
    });

    if (!outcome) {
      continue;
    }

    finalizedAcceptedCount += 1;
    if (outcome.matchStatus === 'completed') {
      completedCount += 1;
      publishStreakChanged(fastify, {
        userOneId: outcome.userOneId,
        userTwoId: outcome.userTwoId,
        localDay: outcome.localDay,
      });
    } else {
      missedCount += 1;
    }

    publishMatchChanged(fastify, {
      userOneId: outcome.userOneId,
      userTwoId: outcome.userTwoId,
      matchId: outcome.matchId,
      status: outcome.matchStatus,
    });

    if (outcome.callSessionId) {
      publishCallChanged(fastify, {
        userOneId: outcome.userOneId,
        userTwoId: outcome.userTwoId,
        matchId: outcome.matchId,
        callSessionId: outcome.callSessionId,
        status: 'ended',
      });
    }
  }

  const summary = {
    expiredPendingCount: expired.length,
    finalizedAcceptedCount,
    completedCount,
    missedCount,
  };

  if (
    summary.expiredPendingCount > 0 ||
    summary.finalizedAcceptedCount > 0
  ) {
    fastify.log.info(
      {
        event: 'maintenance.sweep',
        ...summary,
      },
      'Maintenance sweep updated match state.',
    );
  }

  return summary;
}
