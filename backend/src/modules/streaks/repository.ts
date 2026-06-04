import type { Queryable } from '../../lib/db.js';

export type StreakRecord = {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedLocalDay: string | null;
  timezone: string;
};

export type DailyGamificationStateRecord = {
  matchId: string | null;
  matchStatus:
    | 'pending'
    | 'accepted'
    | 'declined'
    | 'expired'
    | 'completed'
    | 'cancelled'
    | 'missed'
    | null;
  dailyStatus: 'unavailable' | 'skipped' | null;
  hasAvailabilitySlot: boolean;
};

export async function findStreakForUser(
  db: Queryable,
  userId: string,
): Promise<StreakRecord | null> {
  const result = await db.query<StreakRecord>(
    `
      select
        s.user_id as "userId",
        s.current_streak as "currentStreak",
        s.longest_streak as "longestStreak",
        s.last_completed_local_day::text as "lastCompletedLocalDay",
        p.timezone
      from public.streaks s
      join public.profiles p on p.id = s.user_id
      where s.user_id = $1
      limit 1
    `,
    [userId],
  );

  return result.rows[0] ?? null;
}

export async function findDailyGamificationState(
  db: Queryable,
  input: {
    userId: string;
    localDay: string;
  },
): Promise<DailyGamificationStateRecord> {
  const result = await db.query<DailyGamificationStateRecord>(
    `
      with latest_match as (
        select
          m.id,
          m.status
        from public.matches m
        where (m.user_one_id = $1 or m.user_two_id = $1)
          and m.local_day = $2::date
        order by m.created_at desc
        limit 1
      ),
      latest_daily_status as (
        select ds.status
        from public.daily_status ds
        where ds.user_id = $1
          and ds.local_day = $2::date
        limit 1
      ),
      slot_state as (
        select exists (
          select 1
          from public.availability_slots s
          where s.user_id = $1
            and s.local_day = $2::date
        ) as has_slot
      )
      select
        lm.id as "matchId",
        lm.status as "matchStatus",
        lds.status as "dailyStatus",
        ss.has_slot as "hasAvailabilitySlot"
      from slot_state ss
      left join latest_match lm on true
      left join latest_daily_status lds on true
      limit 1
    `,
    [input.userId, input.localDay],
  );

  return (
    result.rows[0] ?? {
      matchId: null,
      matchStatus: null,
      dailyStatus: null,
      hasAvailabilitySlot: false,
    }
  );
}
