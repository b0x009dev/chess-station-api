import process from 'node:process';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.PGHOST || '127.0.0.1',
  database: process.env.PGDATABASE || 'chess_station',
  user: process.env.PGUSER || 'chess_station',
});

export default pool;
