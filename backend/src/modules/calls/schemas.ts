const callParticipantSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'userId', 'displayName', 'timezone', 'status', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    displayName: { type: 'string' },
    avatarUrl: { type: ['string', 'null'] },
    timezone: { type: 'string' },
    status: { type: 'string', enum: ['invited', 'token_issued', 'joined', 'left', 'missed'] },
    providerParticipantId: { type: ['string', 'null'] },
    tokenExpiresAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    joinedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    leftAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const callSessionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'matchId', 'provider', 'status', 'createdAt', 'updatedAt', 'participants'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    matchId: { type: 'string', format: 'uuid' },
    provider: { type: 'string' },
    providerRoomId: { type: ['string', 'null'] },
    roomUrl: { type: ['string', 'null'] },
    status: { type: 'string', enum: ['scheduled', 'active', 'ended', 'failed', 'cancelled'] },
    roomExpiresAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    startedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    endedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    metadata: { type: 'object', additionalProperties: true },
    participants: {
      type: 'array',
      items: callParticipantSchema,
    },
  },
} as const;

export const callJoinSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['url', 'token', 'tokenExpiresAt'],
  properties: {
    url: { type: 'string' },
    token: { type: ['string', 'null'] },
    tokenExpiresAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const callSessionEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['callSession'],
  properties: {
    callSession: {
      anyOf: [callSessionSchema, { type: 'null' }],
    },
  },
} as const;

export const callJoinEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['callSession', 'join'],
  properties: {
    callSession: callSessionSchema,
    join: callJoinSchema,
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

export const callSessionParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['callSessionId'],
  properties: {
    callSessionId: { type: 'string', format: 'uuid' },
  },
} as const;

export const callEventBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['event'],
  properties: {
    event: {
      type: 'string',
      enum: ['joined', 'left'],
    },
  },
} as const;
