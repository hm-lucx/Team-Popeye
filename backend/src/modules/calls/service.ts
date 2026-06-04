import type { FastifyInstance } from 'fastify';

import { env } from '../../config/env.js';
import { withTransaction } from '../../lib/db.js';
import { AppError } from '../../lib/errors.js';
import type { MatchStatus } from '../matches/repository.js';
import {
  createCallParticipants,
  createCallSession,
  findCallParticipant,
  findCallSessionByIdForUser,
  findCallSessionByMatchForUser,
  findCallSessionByMatchId,
  findMatchForCallByUser,
  listCallParticipants,
  lockMatchForCallByUser,
  markMatchCompleted,
  markParticipantJoined,
  markParticipantLeft,
  updateCallParticipantJoinCredentials,
  updateCallSessionStatus,
  type CallParticipantRecord,
  type CallSessionRecord,
  type MatchForCallRecord,
} from './repository.js';

type CallSessionView = {
  id: string;
  matchId: string;
  provider: string;
  providerRoomId: string | null;
  roomUrl: string | null;
  status: 'scheduled' | 'active' | 'ended' | 'failed' | 'cancelled';
  roomExpiresAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  participants: Array<{
    id: string;
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    timezone: string;
    status: 'invited' | 'token_issued' | 'joined' | 'left' | 'missed';
    providerParticipantId: string | null;
    tokenExpiresAt: string | null;
    joinedAt: string | null;
    leftAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

type JoinView = {
  url: string;
  token: string | null;
  tokenExpiresAt: string;
};

function buildRoomName(matchId: string): string {
  return `catchup_${matchId.replace(/-/g, '').slice(0, 20)}`;
}

function minutesFromNow(minutes: number): string {
  const date = new Date();
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return date.toISOString();
}

function toParticipantView(participant: CallParticipantRecord): CallSessionView['participants'][number] {
  return {
    id: participant.id,
    userId: participant.userId,
    displayName: participant.displayName,
    avatarUrl: participant.avatarUrl,
    timezone: participant.timezone,
    status: participant.status,
    providerParticipantId: participant.providerParticipantId,
    tokenExpiresAt: participant.tokenExpiresAt,
    joinedAt: participant.joinedAt,
    leftAt: participant.leftAt,
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt,
  };
}

async function toCallSessionView(
  fastify: FastifyInstance,
  session: CallSessionRecord,
): Promise<CallSessionView> {
  const participants = await listCallParticipants(fastify.db, session.id);

  return {
    id: session.id,
    matchId: session.matchId,
    provider: session.provider,
    providerRoomId: session.providerRoomId,
    roomUrl: session.roomUrl,
    status: session.status,
    roomExpiresAt: session.roomExpiresAt,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    metadata: session.metadata,
    participants: participants.map(toParticipantView),
  };
}

function publishCallChanged(
  fastify: FastifyInstance,
  match: MatchForCallRecord,
  callSessionId: string,
  status: MatchStatus | CallSessionRecord['status'] | null,
) {
  const event = {
    type: 'calls.changed',
    data: {
      callSessionId,
      matchId: match.id,
      status,
    },
    emittedAt: new Date().toISOString(),
  };

  fastify.publishUserEvent(match.userOneId, event);
  fastify.publishUserEvent(match.userTwoId, event);
}

function publishMatchChanged(
  fastify: FastifyInstance,
  match: MatchForCallRecord,
  status: MatchStatus,
) {
  const event = {
    type: 'matches.changed',
    data: {
      matchId: match.id,
      status,
    },
    emittedAt: new Date().toISOString(),
  };

  fastify.publishUserEvent(match.userOneId, event);
  fastify.publishUserEvent(match.userTwoId, event);
}

async function ensureAcceptedMatch(
  fastify: FastifyInstance,
  userId: string,
  matchId: string,
): Promise<MatchForCallRecord> {
  const match = await findMatchForCallByUser(fastify.db, userId, matchId);

  if (!match) {
    throw new AppError(404, 'match_not_found', 'Match could not be found.');
  }

  if (match.status !== 'accepted') {
    throw new AppError(409, 'match_not_accepted', 'Calls can only be joined once a match is accepted.');
  }

  return match;
}

async function ensureCallReadableMatch(
  fastify: FastifyInstance,
  userId: string,
  matchId: string,
): Promise<MatchForCallRecord> {
  const match = await findMatchForCallByUser(fastify.db, userId, matchId);

  if (!match) {
    throw new AppError(404, 'match_not_found', 'Match could not be found.');
  }

  if (!['accepted', 'completed', 'missed'].includes(match.status)) {
    throw new AppError(409, 'call_not_ready', 'A call session is not available for this match yet.');
  }

  return match;
}

export async function getCallSessionForMatch(
  fastify: FastifyInstance,
  userId: string,
  matchId: string,
): Promise<{ callSession: CallSessionView | null }> {
  const match = await ensureCallReadableMatch(fastify, userId, matchId);

  const session = await findCallSessionByMatchForUser(fastify.db, userId, matchId);

  if (!session) {
    if (match.status === 'accepted') {
      return { callSession: null };
    }

    throw new AppError(404, 'call_session_not_found', 'Call session could not be found.');
  }

  return {
    callSession: await toCallSessionView(fastify, session),
  };
}

export async function joinCallForMatch(
  fastify: FastifyInstance,
  userId: string,
  matchId: string,
): Promise<{ callSession: CallSessionView; join: JoinView }> {
  const joinTokenExpiresAt = minutesFromNow(env.callJoinTokenTtlMinutes);
  const roomExpiresAt = minutesFromNow(env.callRoomTtlMinutes);

  const result = await withTransaction(fastify.db, async (client) => {
    const match = await lockMatchForCallByUser(client, userId, matchId);

    if (!match) {
      throw new AppError(404, 'match_not_found', 'Match could not be found.');
    }

    if (match.status !== 'accepted') {
      throw new AppError(409, 'match_not_accepted', 'Calls can only be joined once a match is accepted.');
    }

    let session = await findCallSessionByMatchId(client, match.id);

    if (!session) {
      const roomName = buildRoomName(match.id);
      const provisioned = await fastify.callProvider.createSession({
        roomName,
        roomExpiresAt,
        matchId: match.id,
      });

      session = await createCallSession(client, {
        matchId: match.id,
        provider: provisioned.provider,
        providerRoomId: provisioned.providerRoomId,
        roomUrl: provisioned.roomUrl,
        roomExpiresAt: provisioned.roomExpiresAt,
        metadata: provisioned.metadata,
      });

      await createCallParticipants(client, session.id, [match.userOneId, match.userTwoId]);
    }

    if (session.status === 'ended' || session.status === 'cancelled' || session.status === 'failed') {
      throw new AppError(409, 'call_session_closed', 'This call session is no longer joinable.');
    }

    const me = await findCallParticipant(client, session.id, userId);

    if (!me) {
      throw new AppError(404, 'call_participant_not_found', 'Call participant row could not be found.');
    }

    const displayName = userId === match.userOneId ? match.userOneDisplayName : match.userTwoDisplayName;
    const roomName = (session.providerRoomId ?? buildRoomName(match.id)).trim();

    const joinCredential = await fastify.callProvider.issueJoinCredentials({
      roomName,
      roomUrl: session.roomUrl ?? '',
      userId,
      displayName,
      expiresAt: joinTokenExpiresAt,
    });

    await updateCallParticipantJoinCredentials(client, {
      callSessionId: session.id,
      userId,
      providerParticipantId: joinCredential.providerParticipantId,
      tokenExpiresAt: joinCredential.tokenExpiresAt,
    });

    return {
      match,
      callSessionId: session.id,
      join: {
        url: joinCredential.joinUrl,
        token: joinCredential.token,
        tokenExpiresAt: joinCredential.tokenExpiresAt,
      },
    };
  });

  const session = await findCallSessionByMatchForUser(fastify.db, userId, matchId);

  if (!session) {
    throw new Error('Failed to load call session after join provisioning.');
  }

  publishCallChanged(fastify, result.match, result.callSessionId, session.status);

  return {
    callSession: await toCallSessionView(fastify, session),
    join: result.join,
  };
}

export async function handleCallEvent(
  fastify: FastifyInstance,
  userId: string,
  input: {
    callSessionId: string;
    event: 'joined' | 'left';
  },
): Promise<{ callSession: CallSessionView }> {
  const outcome = await withTransaction(fastify.db, async (client) => {
    const session = await findCallSessionByIdForUser(client, userId, input.callSessionId);

    if (!session) {
      throw new AppError(404, 'call_session_not_found', 'Call session could not be found.');
    }

    const match = await lockMatchForCallByUser(client, userId, session.matchId);

    if (!match) {
      throw new AppError(404, 'match_not_found', 'Match could not be found.');
    }

    if (input.event === 'joined') {
      await markParticipantJoined(client, session.id, userId);

      if (session.status === 'scheduled') {
        await updateCallSessionStatus(client, {
          callSessionId: session.id,
          status: 'active',
          setStartedNow: true,
        });
      }
    } else {
      await markParticipantLeft(client, session.id, userId);

      const participants = await listCallParticipants(client, session.id);
      const everyoneJoinedAndLeft =
        participants.length > 0 &&
        participants.every((participant) => participant.joinedAt !== null && participant.leftAt !== null);

      if (everyoneJoinedAndLeft) {
        await updateCallSessionStatus(client, {
          callSessionId: session.id,
          status: 'ended',
          setEndedNow: true,
        });
        await markMatchCompleted(client, match.id);

        return {
          match,
          sessionStatus: 'ended' as const,
          matchStatus: 'completed' as const,
        };
      }
    }

    const refreshedSession = await findCallSessionByIdForUser(client, userId, session.id);

    if (!refreshedSession) {
      throw new Error('Failed to load refreshed call session.');
    }

    return {
      match,
      sessionStatus: refreshedSession.status,
      matchStatus: match.status,
    };
  });

  const session = await findCallSessionByIdForUser(fastify.db, userId, input.callSessionId);

  if (!session) {
    throw new Error('Failed to load call session after event handling.');
  }

  publishCallChanged(fastify, outcome.match, session.id, outcome.sessionStatus);

  if (outcome.matchStatus === 'completed') {
    publishMatchChanged(fastify, outcome.match, 'completed');
  }

  return {
    callSession: await toCallSessionView(fastify, session),
  };
}
