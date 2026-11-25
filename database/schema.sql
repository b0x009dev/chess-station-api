BEGIN;

CREATE TABLE IF NOT EXISTS games (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pgn text NOT NULL,
  white text NOT NULL,
  black text NOT NULL,
  event text NOT NULL,
  game_date text NOT NULL,
  result text NOT NULL CHECK (result IN ('1-0', '0-1', '1/2-1/2', '*')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS games_created_at_id_idx
  ON games (created_at DESC, id DESC);

COMMIT;
