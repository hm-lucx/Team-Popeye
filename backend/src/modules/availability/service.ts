import type { FastifyInstance } from 'fastify';

import { AppError, isDatabaseError } from '../../lib/errors.js';
import {
  isValidLocalDay,
  isValidTimeZone,
  localDayInTimeZone,
  parseIsoDateTime,
} from '../../lib/time.js';
import {
  clearAvailabilitySlot,
  clearDailyStatus,
  listAvailabilityForUser,
  setDailyStatus,
  upsertAvailabilitySlot,
  type AvailabilitySlotRecord,
  type DailyStatusRecord,
} from './repository.js';
import { findActiveMatchForUserOnLocalDay } from '../matches/repository.js';

function mapAvailabilityError(error: unknown): never {
  if (isDatabaseError(error) && error.code === 'P0001') {
    if (error.message === 'slot_start_must_match_local_day') {
      throw new AppError(400, 'slot_start_must_match_local_day', 'The slot start must belong to the provided local day.');
    }

    if (error.message === 'slot_end_must_match_local_day') {
      throw new AppError(400, 'slot_end_must_match_local_day', 'The slot end must belong to the provided local day.');
    }
  }

  throw error;
}

function validateLocalDayRange(from?: string, to?: string) {
  if (from && !isValidLocalDay(from)) {
    throw new AppError(400, 'invalid_from_local_day', 'The from query parameter must be a valid local day.');
  }

  if (to && !isValidLocalDay(to)) {
    throw new AppError(400, 'invalid_to_local_day', 'The to query parameter must be a valid local day.');
  }

  if (from && to && from > to) {
    throw new AppError(400, 'invalid_local_day_range', 'The from query parameter must be less than or equal to to.');
  }
}

function validateLocalDay(localDay: string) {
  if (!isValidLocalDay(localDay)) {
    throw new AppError(400, 'invalid_local_day', 'Local day must be a valid YYYY-MM-DD date.');
  }
}

function validateTimeZone(timeZone: string) {
  if (!isValidTimeZone(timeZone)) {
    throw new AppError(400, 'invalid_timezone', 'Timezone must be a valid IANA timezone.');
  }
}

function validateSlotPayload(
  localDay: string,
  timeZone: string,
  startsAt: string,
  endsAt: string,
) {
  validateLocalDay(localDay);
  validateTimeZone(timeZone);

  const startsAtDate = parseIsoDateTime(startsAt);
  const endsAtDate = parseIsoDateTime(endsAt);

  if (!startsAtDate || !endsAtDate) {
    throw new AppError(400, 'invalid_slot_datetime', 'Slot datetimes must be valid ISO date-time values.');
  }

  if (endsAtDate <= startsAtDate) {
    throw new AppError(400, 'slot_end_must_be_after_start', 'Slot end must be after slot start.');
  }

  if (endsAtDate.getTime() - startsAtDate.getTime() < 5 * 60 * 1000) {
    throw new AppError(400, 'slot_too_short', 'Slot must be at least five minutes long.');
  }

  if (localDayInTimeZone(startsAtDate, timeZone) !== localDay) {
    throw new AppError(400, 'slot_start_must_match_local_day', 'The slot start must belong to the provided local day.');
  }

  if (localDayInTimeZone(endsAtDate, timeZone) !== localDay) {
    throw new AppError(400, 'slot_end_must_match_local_day', 'The slot end must belong to the provided local day.');
  }
}

function normalizeReason(reason?: string): string | null {
  const trimmed = reason?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

export async function getMyAvailability(
  fastify: FastifyInstance,
  userId: string,
  query: {
    from?: string | undefined;
    to?: string | undefined;
  },
): Promise<{
  slots: AvailabilitySlotRecord[];
  dailyStatus: DailyStatusRecord[];
}> {
  validateLocalDayRange(query.from, query.to);

  return listAvailabilityForUser(fastify.db, {
    userId,
    from: query.from,
    to: query.to,
  });
}

export async function saveAvailabilitySlot(
  fastify: FastifyInstance,
  userId: string,
  input: {
    localDay: string;
    timezone: string;
    startsAt: string;
    endsAt: string;
  },
): Promise<{ slot: AvailabilitySlotRecord }> {
  validateSlotPayload(
    input.localDay,
    input.timezone.trim(),
    input.startsAt,
    input.endsAt,
  );

  try {
    const slot = await upsertAvailabilitySlot(fastify.db, {
      userId,
      localDay: input.localDay,
      timezone: input.timezone.trim(),
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    });

    const activeMatch = await findActiveMatchForUserOnLocalDay(fastify.db, {
      userId,
      localDay: input.localDay,
    });

    if (activeMatch) {
      const event = {
        type: 'matches.changed',
        data: {
          matchId: activeMatch.id,
          status: activeMatch.status,
        },
        emittedAt: new Date().toISOString(),
      };

      fastify.publishUserEvent(activeMatch.userOneId, event);
      fastify.publishUserEvent(activeMatch.userTwoId, event);
    }

    fastify.log.info(
      {
        event: 'availability.slot.saved',
        userId,
        localDay: input.localDay,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
      'Availability slot saved.',
    );

    return { slot };
  } catch (error) {
    mapAvailabilityError(error);
  }
}

export async function removeAvailabilitySlot(
  fastify: FastifyInstance,
  userId: string,
  localDay: string,
): Promise<{ cleared: boolean }> {
  validateLocalDay(localDay);

  const cleared = await clearAvailabilitySlot(fastify.db, userId, localDay);

  if (cleared) {
    fastify.log.info(
      {
        event: 'availability.slot.cleared',
        userId,
        localDay,
      },
      'Availability slot cleared.',
    );
  }

  return { cleared };
}

export async function saveDailyStatus(
  fastify: FastifyInstance,
  userId: string,
  input: {
    localDay: string;
    status: 'unavailable' | 'skipped';
    reason?: string | undefined;
  },
): Promise<{ dailyStatus: DailyStatusRecord }> {
  validateLocalDay(input.localDay);

  const reason = normalizeReason(input.reason);

  if (reason && reason.length > 140) {
    throw new AppError(400, 'reason_too_long', 'Reason must be at most 140 characters long.');
  }

  const dailyStatus = await setDailyStatus(fastify.db, {
    userId,
    localDay: input.localDay,
    status: input.status,
    reason,
  });

  fastify.log.info(
    {
      event: 'availability.daily_status.saved',
      userId,
      localDay: input.localDay,
      status: input.status,
    },
    'Daily status saved.',
  );

  return { dailyStatus };
}

export async function removeDailyStatus(
  fastify: FastifyInstance,
  userId: string,
  localDay: string,
): Promise<{ cleared: boolean }> {
  validateLocalDay(localDay);

  const cleared = await clearDailyStatus(fastify.db, userId, localDay);

  if (cleared) {
    fastify.log.info(
      {
        event: 'availability.daily_status.cleared',
        userId,
        localDay,
      },
      'Daily status cleared.',
    );
  }

  return { cleared };
}
