import type { ErrorRequestHandler } from 'express';
import { isAppError } from '../utils/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (isAppError(err)) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      details: err.details ?? null
    });
  }

  console.error('Unhandled error', err);
  return res.status(500).json({ error: 'internal_server_error' });
};
