-- Create fitness_video_group table
CREATE TABLE IF NOT EXISTS "fitness_video_group" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"title_zh" text,
	"description" text,
	"description_zh" text,
	"thumbnail_url" text,
	"difficulty" text DEFAULT 'beginner' NOT NULL,
	"gender" text DEFAULT 'unisex' NOT NULL,
	"access_type" text DEFAULT 'free' NOT NULL,
	"age_group" text DEFAULT 'all' NOT NULL,
	"instructions" text,
	"instructions_zh" text,
	"tags" text,
	"status" text DEFAULT 'active' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"deleted_at" timestamp
);

-- Create indexes for fitness_video_group
CREATE INDEX IF NOT EXISTS "idx_fitness_video_group_status" ON "fitness_video_group" ("status");
CREATE INDEX IF NOT EXISTS "idx_fitness_video_group_difficulty" ON "fitness_video_group" ("difficulty");
CREATE INDEX IF NOT EXISTS "idx_fitness_video_group_gender" ON "fitness_video_group" ("gender");
CREATE INDEX IF NOT EXISTS "idx_fitness_video_group_created" ON "fitness_video_group" ("created_at");

-- Backup existing fitness_video data
CREATE TABLE IF NOT EXISTS "fitness_video_backup" AS SELECT * FROM "fitness_video";

-- Drop foreign key constraint from object_video_mapping
ALTER TABLE "object_video_mapping" DROP CONSTRAINT IF EXISTS "object_video_mapping_video_id_fitness_video_id_fk";

-- Drop old indexes
DROP INDEX IF EXISTS "idx_fitness_video_difficulty";
DROP INDEX IF EXISTS "idx_fitness_video_gender";
DROP INDEX IF EXISTS "idx_fitness_video_created";
DROP INDEX IF EXISTS "idx_object_video_video";
DROP INDEX IF EXISTS "idx_object_video_composite";

-- Rename object_video_mapping.video_id to video_group_id
ALTER TABLE "object_video_mapping" RENAME COLUMN "video_id" TO "video_group_id";

-- Update indexes
CREATE INDEX IF NOT EXISTS "idx_object_video_group" ON "object_video_mapping" ("video_group_id");
CREATE INDEX IF NOT EXISTS "idx_object_video_composite" ON "object_video_mapping" ("object_id", "body_part_id");

-- Drop and recreate fitness_video table with new structure
DROP TABLE IF EXISTS "fitness_video" CASCADE;
CREATE TABLE "fitness_video" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL REFERENCES "fitness_video_group"("id") ON DELETE CASCADE,
	"view_angle" text NOT NULL,
	"view_angle_zh" text,
	"video_url" text NOT NULL,
	"duration" integer,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);

-- Create indexes for new fitness_video
CREATE INDEX IF NOT EXISTS "idx_fitness_video_group" ON "fitness_video" ("group_id");
CREATE INDEX IF NOT EXISTS "idx_fitness_video_status" ON "fitness_video" ("status");

-- Add foreign key constraint to object_video_mapping
ALTER TABLE "object_video_mapping" ADD CONSTRAINT "object_video_mapping_video_group_id_fitness_video_group_id_fk"
  FOREIGN KEY ("video_group_id") REFERENCES "fitness_video_group"("id") ON DELETE CASCADE;

