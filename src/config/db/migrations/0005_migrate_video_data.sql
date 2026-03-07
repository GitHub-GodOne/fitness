-- Migrate old fitness_video data to new structure
-- Step 1: Create video groups from backup data
INSERT INTO "fitness_video_group" (
  id, title, title_zh, description, description_zh, thumbnail_url,
  difficulty, gender, access_type, age_group, instructions, instructions_zh,
  tags, status, view_count, sort, created_at, updated_at, deleted_at
)
SELECT
  id, title, title_zh, description, description_zh, thumbnail_url,
  difficulty, gender, access_type, age_group, instructions, instructions_zh,
  tags, status, view_count, sort, created_at, updated_at, deleted_at
FROM fitness_video_backup
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create fitness_video entries from backup (default view angle: front)
INSERT INTO "fitness_video" (
  id, group_id, view_angle, view_angle_zh, video_url, duration, sort, status, created_at, updated_at
)
SELECT
  id || '-front' as id,
  id as group_id,
  'front' as view_angle,
  '正面' as view_angle_zh,
  video_url,
  duration,
  0 as sort,
  status,
  created_at,
  updated_at
FROM fitness_video_backup;

-- Step 3: Verify the migration
SELECT 'Video Groups Created:' as info, COUNT(*) as count FROM fitness_video_group
UNION ALL
SELECT 'Videos Created:' as info, COUNT(*) as count FROM fitness_video
UNION ALL
SELECT 'Mappings:' as info, COUNT(*) as count FROM object_video_mapping;
