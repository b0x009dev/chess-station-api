import pool from '../src/config/db.js';

try {
  await pool.query('TRUNCATE TABLE games RESTART IDENTITY');
  console.log('Таблица партий очищена');
} finally {
  await pool.end();
}
