ALTER TABLE "custom_html_page"
ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
