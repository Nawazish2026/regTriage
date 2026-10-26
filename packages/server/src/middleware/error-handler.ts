import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof ZodError) {
    return c.json({
      error: 'Validation Error',
      message: 'Request payload validation failed',
      details: err.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code,
      })),
    }, 400);
  }

  const errObj = err as any;
  if (errObj?.code === 'P2025') {
    return c.json({ error: 'Not Found', message: 'Requested record was not found' }, 404);
  }

  if (errObj?.code === 'P2002') {
    return c.json({
      error: 'Conflict',
      message: 'A record with this unique identifier already exists',
      fields: errObj.meta?.target,
    }, 409);
  }

  console.error('Unhandled request error:', err);

  return c.json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  }, 500);
};
