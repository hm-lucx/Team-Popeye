const todayStatusSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['localDay', 'timezone', 'status', 'hasAvailabilitySlot', 'dailyStatus', 'matchId'],
  properties: {
    localDay: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    timezone: { type: 'string' },
    status: {
      type: 'string',
      enum: [
        'idle',
        'available',
        'unavailable',
        'skipped',
        'pending',
        'accepted',
        'declined',
        'expired',
        'completed',
        'cancelled',
        'missed',
      ],
    },
    hasAvailabilitySlot: { type: 'boolean' },
    dailyStatus: {
      anyOf: [
        { type: 'string', enum: ['unavailable', 'skipped'] },
        { type: 'null' },
      ],
    },
    matchId: {
      anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }],
    },
  },
} as const;

export const streakSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['streak'],
  properties: {
    streak: {
      type: 'object',
      additionalProperties: false,
      required: [
        'currentStreak',
        'longestStreak',
        'lastCompletedLocalDay',
        'nextMilestone',
        'today',
      ],
      properties: {
        currentStreak: { type: 'integer', minimum: 0 },
        longestStreak: { type: 'integer', minimum: 0 },
        lastCompletedLocalDay: {
          anyOf: [{ type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, { type: 'null' }],
        },
        nextMilestone: {
          anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }],
        },
        today: todayStatusSchema,
      },
    },
  },
} as const;

export const streakQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    localDay: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  },
} as const;
