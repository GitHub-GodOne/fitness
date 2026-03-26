ALTER TABLE "comment"
ADD COLUMN IF NOT EXISTS "page_id" text;

CREATE INDEX IF NOT EXISTS "idx_comment_page_status_created"
ON "comment" ("page_id", "status", "created_at");
