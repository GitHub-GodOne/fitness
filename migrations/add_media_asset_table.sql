CREATE TABLE IF NOT EXISTS media_asset (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'r2',
  media_type text NOT NULL,
  name text NOT NULL,
  key text NOT NULL UNIQUE,
  url text NOT NULL,
  content_type text NOT NULL,
  size integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_asset_media_type_created
  ON media_asset (media_type, created_at);

CREATE INDEX IF NOT EXISTS idx_media_asset_user_created
  ON media_asset (user_id, created_at);
