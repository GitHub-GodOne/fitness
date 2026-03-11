CREATE TABLE IF NOT EXISTS showcase_video (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES taxonomy(id) ON DELETE SET NULL,
  source_task_id TEXT REFERENCES ai_task(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'generated',
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort INTEGER NOT NULL DEFAULT 0,
  review_note TEXT,
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_showcase_video_status
  ON showcase_video(status);

CREATE INDEX IF NOT EXISTS idx_showcase_video_category_status
  ON showcase_video(category_id, status);

CREATE INDEX IF NOT EXISTS idx_showcase_video_user_created
  ON showcase_video(user_id, created_at);
