import type { NextFunction, Request, Response } from 'express';
import type { AppUser } from './user.js';

function parseUserHeader(raw: string | undefined): AppUser | undefined {
  if (!raw) {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const tryParse = (value: string): AppUser | undefined => {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed.id === 'string' && Array.isArray(parsed.roles)) {
        return parsed as AppUser;
      }
    } catch (error) {
      // swallow parsing error and fallback to undefined
    }
    return undefined;
  };

  const fromBase64 = () => {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      return tryParse(decoded);
    } catch (error) {
      return undefined;
    }
  };

  return tryParse(trimmed) ?? fromBase64();
}

export function authenticate() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.header('x-user');
    req.user = parseUserHeader(header);
    next();
  };
}

export type { AppUser } from './user.js';
