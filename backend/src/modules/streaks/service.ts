import type { FastifyInstance } from 'fastify';

import { AppError } from '../../lib/errors.js';
import { isValidLocalDay, localDayInTimeZone } from '../../lib/time.js';
import {
  findDailyGamificationState,
  findStreakForUser,
  type DailyGamificationStateRecord,
} from './repository.js';

type TodayStatus =
  | 'idle'
  | 'available'
  | 'unavailable'
  | 'skipped'
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'completed'
  | 'cancelled'
  | 'missed';

const MILESTONES = [3, 7, 14, 30, 50, 100];

function resolveNextMilestone(currentStreak: number): number | null {
  return MILESTONES.find((milestone) => milestone > currentStreak) ?? null;
}

function toTodayStatus(record: DailyGamificationStateRecord): TodayStatus {
  if (record.matchStatus) {
    return record.matchStatus;
  }

  if (record.dailyStatus) {
    return record.dailyStatus;
  }

  if (record.hasAvailabilitySlot) {
    return 'available';
  }

  return 'idle';
}

export async function getMyStreakSummary(
  fastify: FastifyInstance,
  userId: string,
  query: {
    localDay?: string | undefined;
  },
): Promise<{
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastCompletedLocalDay: string | null;
    nextMilestone: number | null;
    today: {
      localDay: string;
      timezone: string;
      status: TodayStatus;
      hasAvailabilitySlot: boolean;
      dailyStatus: 'unavailable' | 'skipped' | null;
      matchId: string | null;
    };
  };
}> {
  const streak = await findStreakForUser(fastify.db, userId);

  if (!streak) {
    throw new AppError(404, 'streak_not_found', 'Streak state could not be found.');
  }

  const localDay =
    query.localDay ??
    localDayInTimeZone(new Date(), streak.timezone);

  if (!isValidLocalDay(localDay)) {
    throw new AppError(400, 'invalid_local_day', 'Local day must be a valid YYYY-MM-DD date.');
  }

  const today = await findDailyGamificationState(fastify.db, {
    userId,
    localDay,
  });

  return {
    streak: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastCompletedLocalDay: streak.lastCompletedLocalDay,
      nextMilestone: resolveNextMilestone(streak.currentStreak),
      today: {
        localDay,
        timezone: streak.timezone,
        status: toTodayStatus(today),
        hasAvailabilitySlot: today.hasAvailabilitySlot,
        dailyStatus: today.dailyStatus,
        matchId: today.matchId,
      },
    },
  };
}
