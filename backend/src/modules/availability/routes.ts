import type { FastifyPluginAsync } from 'fastify';

import {
  getMyAvailability,
  removeAvailabilitySlot,
  removeDailyStatus,
  saveAvailabilitySlot,
  saveDailyStatus,
} from './service.js';
import {
  availabilityIndexSchema,
  availabilitySlotResponseSchema,
  clearedResponseSchema,
  dailyStatusResponseSchema,
  listAvailabilityQuerySchema,
  localDayParamsSchema,
  setDailyStatusBodySchema,
  upsertAvailabilitySlotBodySchema,
} from './schemas.js';

type LocalDayParams = {
  localDay: string;
};

type ListAvailabilityQuery = {
  from?: string | undefined;
  to?: string | undefined;
};

type UpsertAvailabilitySlotBody = {
  timezone: string;
  startsAt: string;
  endsAt: string;
};

type SetDailyStatusBody = {
  status: 'unavailable' | 'skipped';
  reason?: string | undefined;
};

export const availabilityRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: ListAvailabilityQuery }>(
    '/me',
    {
      preHandler: fastify.authenticate,
      schema: {
        querystring: listAvailabilityQuerySchema,
        response: {
          200: availabilityIndexSchema,
        },
      },
    },
    async (request) => getMyAvailability(fastify, request.user.sub, request.query),
  );

  fastify.put<{ Params: LocalDayParams; Body: UpsertAvailabilitySlotBody }>(
    '/slots/:localDay',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: localDayParamsSchema,
        body: upsertAvailabilitySlotBodySchema,
        response: {
          200: availabilitySlotResponseSchema,
        },
      },
    },
    async (request) =>
      saveAvailabilitySlot(fastify, request.user.sub, {
        localDay: request.params.localDay,
        timezone: request.body.timezone,
        startsAt: request.body.startsAt,
        endsAt: request.body.endsAt,
      }),
  );

  fastify.delete<{ Params: LocalDayParams }>(
    '/slots/:localDay',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: localDayParamsSchema,
        response: {
          200: clearedResponseSchema,
        },
      },
    },
    async (request) =>
      removeAvailabilitySlot(fastify, request.user.sub, request.params.localDay),
  );

  fastify.put<{ Params: LocalDayParams; Body: SetDailyStatusBody }>(
    '/status/:localDay',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: localDayParamsSchema,
        body: setDailyStatusBodySchema,
        response: {
          200: dailyStatusResponseSchema,
        },
      },
    },
    async (request) =>
      saveDailyStatus(fastify, request.user.sub, {
        localDay: request.params.localDay,
        status: request.body.status,
        reason: request.body.reason,
      }),
  );

  fastify.delete<{ Params: LocalDayParams }>(
    '/status/:localDay',
    {
      preHandler: fastify.authenticate,
      schema: {
        params: localDayParamsSchema,
        response: {
          200: clearedResponseSchema,
        },
      },
    },
    async (request) =>
      removeDailyStatus(fastify, request.user.sub, request.params.localDay),
  );
};
