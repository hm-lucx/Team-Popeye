function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function integerEnv(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer.`);
  }

  return parsed;
}

function booleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  throw new Error(`Environment variable ${name} must be a boolean.`);
}

function enumEnv<const T extends readonly string[]>(
  name: string,
  values: T,
  fallback: T[number],
): T[number] {
  const raw = process.env[name];

  if (!raw || raw.trim() === '') {
    return fallback;
  }

  if ((values as readonly string[]).includes(raw)) {
    return raw as T[number];
  }

  throw new Error(`Environment variable ${name} must be one of: ${values.join(', ')}.`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '0.0.0.0',
  port: integerEnv('PORT', 3001),
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://127.0.0.1:3001',
  databaseUrl: requireEnv('DATABASE_URL'),
  databaseSslMode: enumEnv('DATABASE_SSL_MODE', ['disable', 'require', 'no-verify'] as const, 'disable'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtAccessSecret: requireEnv('JWT_ACCESS_SECRET'),
  jwtIssuer: process.env.JWT_ISSUER ?? 'catchup-api',
  jwtAudience: process.env.JWT_AUDIENCE ?? 'catchup-app',
  accessTokenTtlMinutes: integerEnv('ACCESS_TOKEN_TTL_MINUTES', 15),
  refreshTokenTtlDays: integerEnv('REFRESH_TOKEN_TTL_DAYS', 30),
  sseHeartbeatSeconds: integerEnv('SSE_HEARTBEAT_SECONDS', 25),
  enableScheduledJobs: booleanEnv('ENABLE_SCHEDULED_JOBS', false),
  maintenanceSweepSeconds: integerEnv('MAINTENANCE_SWEEP_SECONDS', 30),
  callProvider: process.env.CALL_PROVIDER ?? 'mock',
  callRoomTtlMinutes: integerEnv('CALL_ROOM_TTL_MINUTES', 90),
  callJoinTokenTtlMinutes: integerEnv('CALL_JOIN_TOKEN_TTL_MINUTES', 30),
  dailyApiKey: process.env.DAILY_API_KEY ?? '',
  dailyDomain: process.env.DAILY_DOMAIN ?? '',
  dailyApiUrl: process.env.DAILY_API_URL ?? 'https://api.daily.co/v1',
  secureCookies: (process.env.NODE_ENV ?? 'development') === 'production',
} as const;
