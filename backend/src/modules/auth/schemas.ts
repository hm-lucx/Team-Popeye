export const publicUserSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'email', 'displayName', 'timezone', 'inviteCode'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    displayName: { type: 'string' },
    timezone: { type: 'string' },
    inviteCode: { type: 'string' },
    avatarUrl: { type: ['string', 'null'] },
  },
} as const;

export const sessionResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['accessToken', 'user'],
  properties: {
    accessToken: { type: 'string' },
    user: publicUserSchema,
  },
} as const;

export const signupBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password', 'displayName', 'timezone'],
  properties: {
    email: { type: 'string', format: 'email', maxLength: 320 },
    password: { type: 'string', minLength: 8, maxLength: 72 },
    displayName: { type: 'string', minLength: 1, maxLength: 50 },
    timezone: { type: 'string', minLength: 1, maxLength: 64 },
  },
} as const;

export const loginBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email', maxLength: 320 },
    password: { type: 'string', minLength: 8, maxLength: 72 },
  },
} as const;
