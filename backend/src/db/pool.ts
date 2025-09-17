import { Pool } from 'pg';
import type { DBClient } from './types.js';

let pool: Pool | null = null;

export function getPool(): DBClient {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}
