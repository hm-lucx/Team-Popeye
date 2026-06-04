export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function isDatabaseError(
  error: unknown,
): error is { code?: string; constraint?: string; detail?: string; message?: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}
