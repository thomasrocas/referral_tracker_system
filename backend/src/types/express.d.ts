import type { AppUser } from '../auth/user';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AppUser;
  }
}
