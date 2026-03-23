CREATE TABLE IF NOT EXISTS custom_html_page_revision (
  id text PRIMARY KEY,
  page_id text NOT NULL REFERENCES custom_html_page(id) ON DELETE CASCADE,
  slug text NOT NULL,
  locale text NOT NULL,
  title text,
  description text,
  html text NOT NULL,
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_html_page_revision_page_created_at
  ON custom_html_page_revision (page_id, created_at);
