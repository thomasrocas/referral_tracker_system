import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ValidationError } from './errors.js';

export function validateBody<T extends z.ZodTypeAny>(schema: T): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new ValidationError('Invalid request body', {
          issues: result.error.issues
        })
      );
    }
    req.body = result.data;
    return next();
  };
}
