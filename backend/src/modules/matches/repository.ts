import type { Queryable } from '../../lib/db.js';

export type MatchStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'completed' | 'cancelled' | 'missed';
export type MatchResponseStatus = 'pending' | 'accepted' | 'declined';

export type MatchRecord = {
  id: string;
  userOneId: string;
  userTwoId: string;
  localDay: string;
  overlapStartsAt: string;
  overlapEndsAt: string;
  status: MatchStatus;
  expiresAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  counterpartId: string;
  counterpartDisplayName: string;
  counterpartAvatarUrl: string | null;
  counterpartTimezone: string;
  myResponse: MatchResponseStatus;
  myRespondedAt: string | null;
  counterpartResponse: MatchResponseStatus;
  counterpartRespondedAt: string | null;
};

export async function expirePendingMatches(db: Queryable): Promise<void> {
  await db.query('select 1 from public.expire_pending_matches()');
}

function matchSelectSql() {
  return `
    select
      m.id,
      m.user_one_id as "userOneId",
      m.user_two_id as "userTwoId",
      m.local_day::text as "localDay",
      m.overlap_starts_at as "overlapStartsAt",
      m.overlap_ends_at as "overlapEndsAt",
      m.status,
      m.expires_at as "expiresAt",
      m.accepted_at as "acceptedAt",
      m.declined_at as "declinedAt",
      m.cancelled_at as "cancelledAt",
      m.completed_at as "completedAt",
      m.created_at as "createdAt",
      m.updated_at as "updatedAt",
      p.id as "counterpartId",
      p.display_name as "counterpartDisplayName",
      p.avatar_url as "counterpartAvatarUrl",
      p.timezone as "counterpartTimezone",
      my_response.response as "myResponse",
      my_response.responded_at as "myRespondedAt",
      counterpart_response.response as "counterpartResponse",
      counterpart_response.responded_at as "counterpartRespondedAt"
    from public.matches m
    join public.profiles p
      on p.id = case
        when m.user_one_id = $1 then m.user_two_id
        else m.user_one_id
      end
    join public.match_responses my_response
      on my_response.match_id = m.id
     and my_response.user_id = $1
    join public.match_responses counterpart_response
      on counterpart_response.match_id = m.id
     and counterpart_response.user_id = p.id
  `;
}

export async function listMatchesForUser(
  db: Queryable,
  input: {
    userId: string;
    status?: MatchStatus | undefined;
    localDay?: string | undefined;
  },
): Promise<MatchRecord[]> {
  const result = await db.query<MatchRecord>(
    `
      ${matchSelectSql()}
      where (m.user_one_id = $1 or m.user_two_id = $1)
        and ($2::public.match_status is null or m.status = $2::public.match_status)
        and ($3::date is null or m.local_day = $3::date)
      order by m.local_day desc, m.created_at desc
    `,
    [input.userId, input.status ?? null, input.localDay ?? null],
  );

  return result.rows;
}

export async function findMatchForUser(
  db: Queryable,
  userId: string,
  matchId: string,
): Promise<MatchRecord | null> {
  const result = await db.query<MatchRecord>(
    `
      ${matchSelectSql()}
      where m.id = $2
        and (m.user_one_id = $1 or m.user_two_id = $1)
      limit 1
    `,
    [userId, matchId],
  );

  return result.rows[0] ?? null;
}

export async function attemptMatchForUserOnLocalDay(
  db: Queryable,
  input: {
    userId: string;
    localDay: string;
    expiresInMinutes: number;
  },
): Promise<{
  id: string;
  userOneId: string;
  userTwoId: string;
} | null> {
  const result = await db.query<{
    id: string;
    userOneId: string;
    userTwoId: string;
  }>(
    `
      select
        m.id,
        m.user_one_id as "userOneId",
        m.user_two_id as "userTwoId"
      from private.create_match_for_user($1, $2::date, $3) as m
      limit 1
    `,
    [input.userId, input.localDay, input.expiresInMinutes],
  );

  return result.rows[0] ?? null;
}

export async function respondToMatch(
  db: Queryable,
  input: {
    userId: string;
    matchId: string;
    response: 'accepted' | 'declined';
  },
): Promise<{
  id: string;
  userOneId: string;
  userTwoId: string;
  status: MatchStatus;
} | null> {
  const result = await db.query<{
    id: string;
    userOneId: string;
    userTwoId: string;
    status: MatchStatus;
  }>(
    `
      select
        m.id,
        m.user_one_id as "userOneId",
        m.user_two_id as "userTwoId",
        m.status
      from private.respond_to_match(
        $1,
        $2,
        $3::public.match_response_status
      ) as m
      limit 1
    `,
    [input.userId, input.matchId, input.response],
  );

  return result.rows[0] ?? null;
}

export async function findActiveMatchForUserOnLocalDay(
  db: Queryable,
  input: {
    userId: string;
    localDay: string;
  },
): Promise<{
  id: string;
  userOneId: string;
  userTwoId: string;
  status: MatchStatus;
} | null> {
  const result = await db.query<{
    id: string;
    userOneId: string;
    userTwoId: string;
    status: MatchStatus;
  }>(
    `
      select
        m.id,
        m.user_one_id as "userOneId",
        m.user_two_id as "userTwoId",
        m.status
      from public.matches m
      where (m.user_one_id = $1 or m.user_two_id = $1)
        and m.local_day = $2::date
        and m.status in ('pending', 'accepted')
      order by m.created_at desc
      limit 1
    `,
    [input.userId, input.localDay],
  );

  return result.rows[0] ?? null;
}
