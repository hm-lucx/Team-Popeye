const slotSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'localDay', 'timezone', 'startsAt', 'endsAt', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    localDay: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    timezone: { type: 'string' },
    startsAt: { type: 'string', format: 'date-time' },
    endsAt: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const dailyStatusSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'localDay', 'status', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    localDay: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    status: { type: 'string', enum: ['unavailable', 'skipped'] },
    reason: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const availabilityIndexSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['slots', 'dailyStatus'],
  properties: {
    slots: {
      type: 'array',
      items: slotSchema,
    },
    dailyStatus: {
      type: 'array',
      items: dailyStatusSchema,
    },
  },
} as const;

export const localDayParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['localDay'],
  properties: {
    localDay: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  },
} as const;

export const listAvailabilityQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    to: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  },
} as const;

export const upsertAvailabilitySlotBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['timezone', 'startsAt', 'endsAt'],
  properties: {
    timezone: { type: 'string', minLength: 1, maxLength: 64 },
    startsAt: { type: 'string', format: 'date-time' },
    endsAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const setDailyStatusBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['status'],
  properties: {
    status: {
      type: 'string',
      enum: ['unavailable', 'skipped'],
    },
    reason: { type: 'string', minLength: 1, maxLength: 140 },
  },
} as const;

export const availabilitySlotResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['slot'],
  properties: {
    slot: slotSchema,
  },
} as const;

export const dailyStatusResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['dailyStatus'],
  properties: {
    dailyStatus: dailyStatusSchema,
  },
} as const;

export const clearedResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cleared'],
  properties: {
    cleared: { type: 'boolean' },
  },
} as const;
