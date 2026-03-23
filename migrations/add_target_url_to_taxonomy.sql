ALTER TABLE taxonomy
ADD COLUMN IF NOT EXISTS target_url text;
