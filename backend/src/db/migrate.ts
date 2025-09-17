import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from './pool.js';

export async function runMigrations() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const migrationsDir = path.resolve(__dirname, '../../migrations');

  const entries = await fs.readdir(migrationsDir);
  const files = entries.filter((file) => file.endsWith('.sql')).sort();

  const pool = getPool();
  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => {
      console.log('Migrations applied successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failure', error);
      process.exit(1);
    });
}
