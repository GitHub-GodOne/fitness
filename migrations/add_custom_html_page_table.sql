CREATE TABLE IF NOT EXISTS custom_html_page (
  id text PRIMARY KEY,
  slug text NOT NULL,
  locale text NOT NULL,
  title text,
  description text,
  html text NOT NULL,
  updated_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_html_page_locale_slug
  ON custom_html_page (locale, slug);

CREATE INDEX IF NOT EXISTS idx_custom_html_page_locale
  ON custom_html_page (locale);
