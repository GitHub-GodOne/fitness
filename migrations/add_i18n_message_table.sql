CREATE TABLE IF NOT EXISTS i18n_message (
  id text PRIMARY KEY,
  locale text NOT NULL,
  namespace text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  updated_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_i18n_message_locale_namespace_key
  ON i18n_message (locale, namespace, key);

CREATE INDEX IF NOT EXISTS idx_i18n_message_locale_namespace
  ON i18n_message (locale, namespace);
