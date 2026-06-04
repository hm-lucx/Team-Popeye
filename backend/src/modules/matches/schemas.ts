const matchProfileSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'displayName', 'timezone'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    displayName: { type: 'string' },
    timezone: { type: 'string' },
    avatarUrl: { type: ['string', 'null'] },
  },
} as const;

const matchResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['response', 'respondedAt'],
  properties: {
    response: { type: 'string', enum: ['pending', 'accepted', 'declined'] },
    respondedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
  },
} as const;

export const matchSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'localDay',
    'status',
    'overlapStartsAt',
    'overlapEndsAt',
    'createdAt',
    'updatedAt',
    'counterpart',
    'myResponse',
    'counterpartResponse',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    localDay: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    status: {
      type: 'string',
      enum: ['pending', 'accepted', 'declined', 'expired', 'completed', 'cancelled', 'missed'],
    },
    overlapStartsAt: { type: 'string', format: 'date-time' },
    overlapEndsAt: { type: 'string', format: 'date-time' },
    expiresAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    acceptedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    declinedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    cancelledAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    completedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    counterpart: matchProfileSchema,
    myResponse: matchResponseSchema,
    counterpartResponse: matchResponseSchema,
  },
} as const;

export const matchListSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['matches'],
  properties: {
    matches: {
      type: 'array',
      items: matchSchema,
    },
  },
} as const;

export const matchResponseEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['match'],
  properties: {
    match: {
      anyOf: [matchSchema, { type: 'null' }],
    },
  },
} as const;

export const matchParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['matchId'],
  properties: {
    matchId: { type: 'string', format: 'uuid' },
  },
} as const;

export const listMatchesQuerySchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: {
      type: 'string',
      enum: ['pending', 'accepted', 'declined', 'expired', 'completed', 'cancelled', 'missed'],
    },
    localDay: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  },
} as const;

export const respondToMatchBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['response'],
  properties: {
    response: {
      type: 'string',
      enum: ['accept', 'decline'],
    },
  },
} as const;

export const attemptMatchBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['localDay'],
  properties: {
    localDay: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    expiresInMinutes: { type: 'integer', minimum: 1, maximum: 1440 },
  },
} as const;
