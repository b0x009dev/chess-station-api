import { readFile } from 'node:fs/promises';
import pool from '../src/config/db.js';

try {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  console.log('Таблица партий инициализирована');
} finally {
  await pool.end();
}
