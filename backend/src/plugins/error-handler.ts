import fp from 'fastify-plugin';

import { AppError, isDatabaseError } from '../lib/errors.js';

export const errorHandlerPlugin = fp(async (fastify) => {
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
      });
    }

    if (typeof error === 'object' && error !== null && 'validation' in error) {
      return reply.code(400).send({
        error: {
          code: 'validation_error',
          message: 'The request payload is invalid.',
          details: (error as { validation: unknown }).validation,
        },
      });
    }

    if (isDatabaseError(error) && error.code === '22P02') {
      return reply.code(400).send({
        error: {
          code: 'invalid_input',
          message: 'One or more values could not be processed.',
          details: error.detail ?? null,
        },
      });
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      const requestError = error as { statusCode: number; code?: string; message?: string };

      return reply.code(requestError.statusCode).send({
        error: {
          code: requestError.code === 'FST_ERR_CTP_EMPTY_JSON_BODY' ? 'bad_request' : 'request_error',
          message: requestError.message ?? 'The request could not be processed.',
          details: null,
        },
      });
    }

    fastify.log.error(error);

    return reply.code(500).send({
      error: {
        code: 'internal_error',
        message: 'Something went wrong on the server.',
      },
    });
  });
});
