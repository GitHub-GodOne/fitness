CREATE TABLE IF NOT EXISTS page_override (
  id text PRIMARY KEY,
  slug text NOT NULL,
  locale text NOT NULL,
  title text,
  description text,
  content text,
  updated_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_page_override_locale_slug
  ON page_override (locale, slug);

CREATE INDEX IF NOT EXISTS idx_page_override_locale
  ON page_override (locale);
