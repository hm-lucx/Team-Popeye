import type { FastifyRequest, preHandlerHookHandler } from 'fastify';

import { AppError } from './errors.js';

type IdentityScope = 'ip' | 'user_or_ip';

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  scope: IdentityScope;
};

type Bucket = {
  count: number;
  resetAt: number;
};

function resolveIdentity(request: FastifyRequest, scope: IdentityScope): string {
  if (scope === 'user_or_ip' && request.user?.sub) {
    return `user:${request.user.sub}`;
  }

  return `ip:${request.ip}`;
}

export function createRateLimitGuard(options: RateLimitOptions): preHandlerHookHandler {
  const buckets = new Map<string, Bucket>();

  return async function rateLimitGuard(request, reply) {
    const now = Date.now();
    const identity = resolveIdentity(request, options.scope);
    const key = `${options.key}:${identity}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });

      reply.header('x-ratelimit-limit', options.limit);
      reply.header('x-ratelimit-remaining', Math.max(options.limit - 1, 0));
      return;
    }

    current.count += 1;
    buckets.set(key, current);

    const remaining = Math.max(options.limit - current.count, 0);
    reply.header('x-ratelimit-limit', options.limit);
    reply.header('x-ratelimit-remaining', remaining);

    if (current.count > options.limit) {
      const retryAfterSeconds = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);
      reply.header('retry-after', retryAfterSeconds);

      request.log.warn(
        {
          event: 'rate_limit.hit',
          key: options.key,
          scope: options.scope,
          identity,
          retryAfterSeconds,
        },
        'Rate limit exceeded.',
      );

      throw new AppError(429, 'rate_limited', 'Too many requests. Please try again shortly.');
    }
  };
}
