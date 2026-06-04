import type { Queryable } from '../../lib/db.js';

export type CallSessionStatus = 'scheduled' | 'active' | 'ended' | 'failed' | 'cancelled';
export type CallParticipantStatus = 'invited' | 'token_issued' | 'joined' | 'left' | 'missed';
export type MatchStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'completed' | 'cancelled' | 'missed';

export type MatchForCallRecord = {
  id: string;
  status: MatchStatus;
  localDay: string;
  overlapStartsAt: string;
  overlapEndsAt: string;
  userOneId: string;
  userOneDisplayName: string;
  userOneAvatarUrl: string | null;
  userOneTimezone: string;
  userTwoId: string;
  userTwoDisplayName: string;
  userTwoAvatarUrl: string | null;
  userTwoTimezone: string;
};

export type CallParticipantRecord = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  status: CallParticipantStatus;
  providerParticipantId: string | null;
  tokenExpiresAt: string | null;
  joinedAt: string | null;
  leftAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CallSessionRecord = {
  id: string;
  matchId: string;
  provider: string;
  providerRoomId: string | null;
  roomUrl: string | null;
  metadata: Record<string, unknown>;
  status: CallSessionStatus;
  roomExpiresAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function callSessionSelect() {
  return `
    select
      cs.id,
      cs.match_id as "matchId",
      cs.provider,
      cs.provider_room_id as "providerRoomId",
      cs.room_url as "roomUrl",
      cs.metadata,
      cs.status,
      cs.room_expires_at as "roomExpiresAt",
      cs.started_at as "startedAt",
      cs.ended_at as "endedAt",
      cs.created_at as "createdAt",
      cs.updated_at as "updatedAt"
    from public.call_sessions cs
  `;
}

export async function findMatchForCallByUser(
  db: Queryable,
  userId: string,
  matchId: string,
): Promise<MatchForCallRecord | null> {
  const result = await db.query<MatchForCallRecord>(
    `
      select
        m.id,
        m.status,
        m.local_day::text as "localDay",
        m.overlap_starts_at as "overlapStartsAt",
        m.overlap_ends_at as "overlapEndsAt",
        u1.id as "userOneId",
        u1.display_name as "userOneDisplayName",
        u1.avatar_url as "userOneAvatarUrl",
        u1.timezone as "userOneTimezone",
        u2.id as "userTwoId",
        u2.display_name as "userTwoDisplayName",
        u2.avatar_url as "userTwoAvatarUrl",
        u2.timezone as "userTwoTimezone"
      from public.matches m
      join public.profiles u1 on u1.id = m.user_one_id
      join public.profiles u2 on u2.id = m.user_two_id
      where m.id = $2
        and (m.user_one_id = $1 or m.user_two_id = $1)
      limit 1
    `,
    [userId, matchId],
  );

  return result.rows[0] ?? null;
}

export async function lockMatchForCallByUser(
  db: Queryable,
  userId: string,
  matchId: string,
): Promise<MatchForCallRecord | null> {
  const result = await db.query<MatchForCallRecord>(
    `
      select
        m.id,
        m.status,
        m.local_day::text as "localDay",
        m.overlap_starts_at as "overlapStartsAt",
        m.overlap_ends_at as "overlapEndsAt",
        u1.id as "userOneId",
        u1.display_name as "userOneDisplayName",
        u1.avatar_url as "userOneAvatarUrl",
        u1.timezone as "userOneTimezone",
        u2.id as "userTwoId",
        u2.display_name as "userTwoDisplayName",
        u2.avatar_url as "userTwoAvatarUrl",
        u2.timezone as "userTwoTimezone"
      from public.matches m
      join public.profiles u1 on u1.id = m.user_one_id
      join public.profiles u2 on u2.id = m.user_two_id
      where m.id = $2
        and (m.user_one_id = $1 or m.user_two_id = $1)
      for update
      limit 1
    `,
    [userId, matchId],
  );

  return result.rows[0] ?? null;
}

export async function lockMatchForCallById(
  db: Queryable,
  matchId: string,
): Promise<MatchForCallRecord | null> {
  const result = await db.query<MatchForCallRecord>(
    `
      select
        m.id,
        m.status,
        m.local_day::text as "localDay",
        m.overlap_starts_at as "overlapStartsAt",
        m.overlap_ends_at as "overlapEndsAt",
        u1.id as "userOneId",
        u1.display_name as "userOneDisplayName",
        u1.avatar_url as "userOneAvatarUrl",
        u1.timezone as "userOneTimezone",
        u2.id as "userTwoId",
        u2.display_name as "userTwoDisplayName",
        u2.avatar_url as "userTwoAvatarUrl",
        u2.timezone as "userTwoTimezone"
      from public.matches m
      join public.profiles u1 on u1.id = m.user_one_id
      join public.profiles u2 on u2.id = m.user_two_id
      where m.id = $1
      for update
      limit 1
    `,
    [matchId],
  );

  return result.rows[0] ?? null;
}

export async function findCallSessionByMatchForUser(
  db: Queryable,
  userId: string,
  matchId: string,
): Promise<CallSessionRecord | null> {
  const result = await db.query<CallSessionRecord>(
    `
      ${callSessionSelect()}
      join public.matches m on m.id = cs.match_id
      where cs.match_id = $2
        and (m.user_one_id = $1 or m.user_two_id = $1)
      limit 1
    `,
    [userId, matchId],
  );

  return result.rows[0] ?? null;
}

export async function findCallSessionByIdForUser(
  db: Queryable,
  userId: string,
  callSessionId: string,
): Promise<CallSessionRecord | null> {
  const result = await db.query<CallSessionRecord>(
    `
      ${callSessionSelect()}
      join public.matches m on m.id = cs.match_id
      where cs.id = $2
        and (m.user_one_id = $1 or m.user_two_id = $1)
      limit 1
    `,
    [userId, callSessionId],
  );

  return result.rows[0] ?? null;
}

export async function findCallSessionByMatchId(
  db: Queryable,
  matchId: string,
): Promise<CallSessionRecord | null> {
  const result = await db.query<CallSessionRecord>(
    `
      ${callSessionSelect()}
      where cs.match_id = $1
      limit 1
    `,
    [matchId],
  );

  return result.rows[0] ?? null;
}

export async function createCallSession(
  db: Queryable,
  input: {
    matchId: string;
    provider: string;
    providerRoomId: string;
    roomUrl: string;
    roomExpiresAt: string;
    metadata: Record<string, unknown>;
  },
): Promise<CallSessionRecord> {
  const result = await db.query<CallSessionRecord>(
    `
      insert into public.call_sessions (
        match_id,
        provider,
        provider_room_id,
        room_url,
        room_expires_at,
        metadata
      )
      values ($1, $2, $3, $4, $5::timestamptz, $6::jsonb)
      returning
        id,
        match_id as "matchId",
        provider,
        provider_room_id as "providerRoomId",
        room_url as "roomUrl",
        metadata,
        status,
        room_expires_at as "roomExpiresAt",
        started_at as "startedAt",
        ended_at as "endedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [
      input.matchId,
      input.provider,
      input.providerRoomId,
      input.roomUrl,
      input.roomExpiresAt,
      JSON.stringify(input.metadata),
    ],
  );

  const session = result.rows[0];

  if (!session) {
    throw new Error('Failed to create call session.');
  }

  return session;
}

export async function createCallParticipants(
  db: Queryable,
  callSessionId: string,
  userIds: string[],
): Promise<void> {
  for (const userId of userIds) {
    await db.query(
      `
        insert into public.call_participants (
          call_session_id,
          user_id
        )
        values ($1, $2)
        on conflict (call_session_id, user_id) do nothing
      `,
      [callSessionId, userId],
    );
  }
}

export async function listCallParticipants(
  db: Queryable,
  callSessionId: string,
): Promise<CallParticipantRecord[]> {
  const result = await db.query<CallParticipantRecord>(
    `
      select
        cp.id,
        cp.user_id as "userId",
        p.display_name as "displayName",
        p.avatar_url as "avatarUrl",
        p.timezone,
        cp.status,
        cp.provider_participant_id as "providerParticipantId",
        cp.token_expires_at as "tokenExpiresAt",
        cp.joined_at as "joinedAt",
        cp.left_at as "leftAt",
        cp.created_at as "createdAt",
        cp.updated_at as "updatedAt"
      from public.call_participants cp
      join public.profiles p on p.id = cp.user_id
      where cp.call_session_id = $1
      order by cp.created_at asc
    `,
    [callSessionId],
  );

  return result.rows;
}

export async function findCallParticipant(
  db: Queryable,
  callSessionId: string,
  userId: string,
): Promise<CallParticipantRecord | null> {
  const result = await db.query<CallParticipantRecord>(
    `
      select
        cp.id,
        cp.user_id as "userId",
        p.display_name as "displayName",
        p.avatar_url as "avatarUrl",
        p.timezone,
        cp.status,
        cp.provider_participant_id as "providerParticipantId",
        cp.token_expires_at as "tokenExpiresAt",
        cp.joined_at as "joinedAt",
        cp.left_at as "leftAt",
        cp.created_at as "createdAt",
        cp.updated_at as "updatedAt"
      from public.call_participants cp
      join public.profiles p on p.id = cp.user_id
      where cp.call_session_id = $1
        and cp.user_id = $2
      limit 1
    `,
    [callSessionId, userId],
  );

  return result.rows[0] ?? null;
}

export async function updateCallParticipantJoinCredentials(
  db: Queryable,
  input: {
    callSessionId: string;
    userId: string;
    providerParticipantId: string;
    tokenExpiresAt: string;
  },
): Promise<void> {
  await db.query(
    `
      update public.call_participants
      set
        status = 'token_issued',
        provider_participant_id = $3,
        token_expires_at = $4::timestamptz
      where call_session_id = $1
        and user_id = $2
    `,
    [
      input.callSessionId,
      input.userId,
      input.providerParticipantId,
      input.tokenExpiresAt,
    ],
  );
}

export async function markParticipantJoined(
  db: Queryable,
  callSessionId: string,
  userId: string,
): Promise<void> {
  await db.query(
    `
      update public.call_participants
      set
        status = 'joined',
        joined_at = coalesce(joined_at, timezone('utc', now()))
      where call_session_id = $1
        and user_id = $2
    `,
    [callSessionId, userId],
  );
}

export async function markParticipantLeft(
  db: Queryable,
  callSessionId: string,
  userId: string,
): Promise<void> {
  await db.query(
    `
      update public.call_participants
      set
        status = 'left',
        left_at = timezone('utc', now())
      where call_session_id = $1
        and user_id = $2
    `,
    [callSessionId, userId],
  );
}

export async function markJoinedParticipantsLeftIfNeeded(
  db: Queryable,
  callSessionId: string,
): Promise<void> {
  await db.query(
    `
      update public.call_participants
      set
        status = 'left',
        left_at = coalesce(left_at, timezone('utc', now()))
      where call_session_id = $1
        and joined_at is not null
    `,
    [callSessionId],
  );
}

export async function markParticipantsMissedIfNeverJoined(
  db: Queryable,
  callSessionId: string,
): Promise<void> {
  await db.query(
    `
      update public.call_participants
      set status = 'missed'
      where call_session_id = $1
        and joined_at is null
    `,
    [callSessionId],
  );
}

export async function updateCallSessionStatus(
  db: Queryable,
  input: {
    callSessionId: string;
    status: CallSessionStatus;
    setStartedNow?: boolean | undefined;
    setEndedNow?: boolean | undefined;
  },
): Promise<void> {
  await db.query(
    `
      update public.call_sessions
      set
        status = $2::public.call_session_status,
        started_at = case
          when $3::boolean is true then coalesce(started_at, timezone('utc', now()))
          else started_at
        end,
        ended_at = case
          when $4::boolean is true then timezone('utc', now())
          else ended_at
        end
      where id = $1
    `,
    [
      input.callSessionId,
      input.status,
      input.setStartedNow ?? false,
      input.setEndedNow ?? false,
    ],
  );
}

export async function markMatchCompleted(
  db: Queryable,
  matchId: string,
): Promise<void> {
  await db.query(
    `
      update public.matches
      set status = 'completed'
      where id = $1
        and status = 'accepted'
    `,
    [matchId],
  );
}

export async function markMatchMissed(
  db: Queryable,
  matchId: string,
): Promise<void> {
  await db.query(
    `
      update public.matches
      set status = 'missed'
      where id = $1
        and status = 'accepted'
    `,
    [matchId],
  );
}
