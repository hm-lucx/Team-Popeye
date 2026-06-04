const socialProfileSchema = {
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

export const friendRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'requesterId',
    'addresseeId',
    'status',
    'createdAt',
    'updatedAt',
    'counterpart',
  ],
  properties: {
    id: { type: 'string', format: 'uuid' },
    requesterId: { type: 'string', format: 'uuid' },
    addresseeId: { type: 'string', format: 'uuid' },
    status: {
      type: 'string',
      enum: ['pending', 'accepted', 'declined', 'cancelled', 'expired'],
    },
    inviteCodeSnapshot: { type: ['string', 'null'] },
    message: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    respondedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    counterpart: socialProfileSchema,
  },
} as const;

export const friendRequestIndexSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['incoming', 'outgoing'],
  properties: {
    incoming: {
      type: 'array',
      items: friendRequestSchema,
    },
    outgoing: {
      type: 'array',
      items: friendRequestSchema,
    },
  },
} as const;

export const friendshipSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['friendshipId', 'createdAt', 'user'],
  properties: {
    friendshipId: { type: 'string', format: 'uuid' },
    createdAt: { type: 'string', format: 'date-time' },
    lastMatchedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    user: socialProfileSchema,
  },
} as const;

export const friendListSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['friends'],
  properties: {
    friends: {
      type: 'array',
      items: friendshipSchema,
    },
  },
} as const;

export const createFriendRequestBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['inviteCode'],
  properties: {
    inviteCode: { type: 'string', minLength: 6, maxLength: 16 },
    message: { type: 'string', minLength: 1, maxLength: 280 },
  },
} as const;

export const friendRequestMutationResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['request'],
  properties: {
    request: friendRequestSchema,
  },
} as const;

export const friendRequestParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['requestId'],
  properties: {
    requestId: { type: 'string', format: 'uuid' },
  },
} as const;

export const respondToFriendRequestBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['action'],
  properties: {
    action: {
      type: 'string',
      enum: ['accept', 'decline'],
    },
  },
} as const;
