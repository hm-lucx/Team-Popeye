import type { Queryable } from '../../lib/db.js';

export type AvailabilitySlotRecord = {
  id: string;
  localDay: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyStatusRecord = {
  id: string;
  localDay: string;
  status: 'unavailable' | 'skipped';
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function listAvailabilityForUser(
  db: Queryable,
  input: {
    userId: string;
    from?: string | undefined;
    to?: string | undefined;
  },
): Promise<{
  slots: AvailabilitySlotRecord[];
  dailyStatus: DailyStatusRecord[];
}> {
  const slotResult = await db.query<AvailabilitySlotRecord>(
    `
      select
        s.id,
        s.local_day::text as "localDay",
        s.timezone,
        s.starts_at as "startsAt",
        s.ends_at as "endsAt",
        s.created_at as "createdAt",
        s.updated_at as "updatedAt"
      from public.availability_slots s
      where s.user_id = $1
        and ($2::date is null or s.local_day >= $2::date)
        and ($3::date is null or s.local_day <= $3::date)
      order by s.local_day asc
    `,
    [input.userId, input.from ?? null, input.to ?? null],
  );

  const dailyStatusResult = await db.query<DailyStatusRecord>(
    `
      select
        ds.id,
        ds.local_day::text as "localDay",
        ds.status,
        ds.reason,
        ds.created_at as "createdAt",
        ds.updated_at as "updatedAt"
      from public.daily_status ds
      where ds.user_id = $1
        and ($2::date is null or ds.local_day >= $2::date)
        and ($3::date is null or ds.local_day <= $3::date)
      order by ds.local_day asc
    `,
    [input.userId, input.from ?? null, input.to ?? null],
  );

  return {
    slots: slotResult.rows,
    dailyStatus: dailyStatusResult.rows,
  };
}

export async function upsertAvailabilitySlot(
  db: Queryable,
  input: {
    userId: string;
    localDay: string;
    timezone: string;
    startsAt: string;
    endsAt: string;
  },
): Promise<AvailabilitySlotRecord> {
  const result = await db.query<AvailabilitySlotRecord>(
    `
      insert into public.availability_slots (
        user_id,
        local_day,
        timezone,
        starts_at,
        ends_at
      )
      values ($1, $2::date, $3, $4::timestamptz, $5::timestamptz)
      on conflict (user_id, local_day)
      do update
      set
        timezone = excluded.timezone,
        starts_at = excluded.starts_at,
        ends_at = excluded.ends_at
      returning
        id,
        local_day::text as "localDay",
        timezone,
        starts_at as "startsAt",
        ends_at as "endsAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [
      input.userId,
      input.localDay,
      input.timezone,
      input.startsAt,
      input.endsAt,
    ],
  );

  const slot = result.rows[0];

  if (!slot) {
    throw new Error('Failed to upsert availability slot.');
  }

  return slot;
}

export async function clearAvailabilitySlot(
  db: Queryable,
  userId: string,
  localDay: string,
): Promise<boolean> {
  const result = await db.query(
    `
      delete from public.availability_slots
      where user_id = $1
        and local_day = $2::date
    `,
    [userId, localDay],
  );

  return Boolean(result.rowCount && result.rowCount > 0);
}

export async function setDailyStatus(
  db: Queryable,
  input: {
    userId: string;
    localDay: string;
    status: 'unavailable' | 'skipped';
    reason: string | null;
  },
): Promise<DailyStatusRecord> {
  const result = await db.query<DailyStatusRecord>(
    `
      insert into public.daily_status (
        user_id,
        local_day,
        status,
        reason
      )
      values ($1, $2::date, $3::public.daily_status_code, $4)
      on conflict (user_id, local_day)
      do update
      set
        status = excluded.status,
        reason = excluded.reason
      returning
        id,
        local_day::text as "localDay",
        status,
        reason,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [
      input.userId,
      input.localDay,
      input.status,
      input.reason,
    ],
  );

  const dailyStatus = result.rows[0];

  if (!dailyStatus) {
    throw new Error('Failed to upsert daily status.');
  }

  return dailyStatus;
}

export async function clearDailyStatus(
  db: Queryable,
  userId: string,
  localDay: string,
): Promise<boolean> {
  const result = await db.query(
    `
      delete from public.daily_status
      where user_id = $1
        and local_day = $2::date
    `,
    [userId, localDay],
  );

  return Boolean(result.rowCount && result.rowCount > 0);
}
