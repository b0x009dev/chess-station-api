import pool from '../config/db.js';

const summaryColumns = `
  id, white, black, event, game_date AS date, result,
  created_at AS "createdAt", updated_at AS "updatedAt"
`;
const gameColumns = `${summaryColumns}, pgn`;

export async function findGames({ player, limit, offset }) {
  const { rows } = await pool.query(
    `WITH matching_games AS NOT MATERIALIZED (
       SELECT ${summaryColumns}
       FROM games
       WHERE $1 = ''
          OR strpos(lower(white COLLATE "und-x-icu"), lower($1 COLLATE "und-x-icu")) > 0
          OR strpos(lower(black COLLATE "und-x-icu"), lower($1 COLLATE "und-x-icu")) > 0
     ),
     game_page AS (
       SELECT * FROM matching_games
       ORDER BY "createdAt" DESC, id DESC
       LIMIT $2 OFFSET $3
     )
     SELECT game_page.*, totals.total
     FROM (SELECT count(*)::integer AS total FROM matching_games) AS totals
     LEFT JOIN game_page ON TRUE
     ORDER BY game_page."createdAt" DESC, game_page.id DESC`,
    [player, limit, offset.toString()],
  );

  const { total } = rows[0];
  const items = rows[0].id === null ? [] : rows;
  for (const item of items) {
    delete item.total;
  }
  return { items, total };
}

export async function createGame({ pgn, white, black, event, date, result }) {
  const { rows } = await pool.query(
    `INSERT INTO games (pgn, white, black, event, game_date, result)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${gameColumns}`,
    [pgn, white, black, event, date, result],
  );
  return rows[0];
}

export async function findGameById(id) {
  const { rows } = await pool.query(
    `SELECT ${gameColumns} FROM games WHERE id = $1`,
    [id],
  );
  return rows[0];
}

export async function updateGame(id, { pgn, white, black, event, date, result }) {
  const { rows } = await pool.query(
    `UPDATE games
     SET pgn = $2, white = $3, black = $4, event = $5, game_date = $6, result = $7,
         updated_at = CASE WHEN pgn <> $2 THEN clock_timestamp() ELSE updated_at END
     WHERE id = $1
     RETURNING ${gameColumns}`,
    [id, pgn, white, black, event, date, result],
  );
  return rows[0];
}

export async function deleteGame(id) {
  const { rows } = await pool.query('DELETE FROM games WHERE id = $1 RETURNING id', [id]);
  return rows[0];
}
