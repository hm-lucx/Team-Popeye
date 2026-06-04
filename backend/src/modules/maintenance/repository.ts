import type { Queryable } from '../../lib/db.js';

import type { MatchForCallRecord } from '../calls/repository.js';

export type ExpiredMatchRecord = {
  id: string;
  userOneId: string;
  userTwoId: string;
  status: 'expired';
};

export async function expirePendingMatchesReturning(
  db: Queryable,
): Promise<ExpiredMatchRecord[]> {
  const result = await db.query<ExpiredMatchRecord>(
    `
      select
        m.id,
        m.user_one_id as "userOneId",
        m.user_two_id as "userTwoId",
        m.status
      from public.expire_pending_matches() as m
    `,
  );

  return result.rows;
}

export async function listDueAcceptedMatches(
  db: Queryable,
  nowIso: string,
): Promise<Array<MatchForCallRecord>> {
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
      where m.status = 'accepted'
        and m.overlap_ends_at <= $1::timestamptz
      order by m.overlap_ends_at asc
    `,
    [nowIso],
  );

  return result.rows;
}
