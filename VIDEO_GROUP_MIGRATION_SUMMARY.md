# Video Group Structure Migration - Complete Summary

## Overview
Successfully migrated the fitness video system from single videos to video groups with multiple viewing angles. Each video group can now contain multiple videos (front view, side view, back view, etc.).

## Database Changes

### New Tables
- **fitness_video_group**: Parent table containing group-level metadata
  - Fields: id, title, titleZh, description, descriptionZh, thumbnailUrl, difficulty, gender, accessType, ageGroup, instructions, instructionsZh, tags, status, viewCount, sort, createdAt, updatedAt, deletedAt

### Modified Tables
- **fitness_video**: Now references groupId instead of being standalone
  - Added: groupId (references fitness_video_group.id)
  - Added: viewAngle, viewAngleZh (to identify the viewing angle)
  - Removed: Group-level fields moved to fitness_video_group

- **object_video_mapping**: Now maps objects to video groups
  - Changed: videoId → videoGroupId

### Migrations Applied
1. `0004_video_group_structure.sql` - Created new structure
2. `0005_migrate_video_data.sql` - Migrated existing data (2 videos → 2 groups)

## Backend Changes

### Models (`src/shared/models/video_library.ts`)
**New Functions:**
- `createFitnessVideoGroup(data)` - Create video group
- `updateFitnessVideoGroup(id, data)` - Update video group
- `deleteFitnessVideoGroup(id)` - Soft delete video group
- `getFitnessVideoGroupById(id)` - Get single group
- `listFitnessVideoGroups(options)` - List groups with filters
- `incrementVideoGroupViewCount(id)` - Track views

**Modified Functions:**
- `createFitnessVideo(data)` - Now requires groupId
- `listFitnessVideosByGroup(groupId)` - Get videos for a group
- `findVideosByObjectAndBodyParts()` - Returns video groups with videos array
- `getVideosByBodyPart()` - Returns video groups with videos array
- `createObjectVideoMapping()` - Uses videoGroupId
- `getVideoMappings(videoGroupId)` - Get mappings for a group

### API Routes

**`src/app/api/admin/video-library/videos/route.ts`**
- GET: Returns videoGroups instead of videos
- POST: Creates video group with multiple videos
- PUT: Updates video group and its videos
- DELETE: Deletes video group and cascades to videos

**`src/app/api/admin/video-library/mappings/route.ts`**
- Changed all references from videoId to videoGroupId
- Uses getFitnessVideoGroupById for validation

### AI Provider (`src/extensions/ai/video-library-provider.ts`)
- Updated to return video groups structure:
```typescript
{
  id: string,
  title: string,
  videos: [
    { id, videoUrl, viewAngle, viewAngleZh, duration }
  ],
  matchedObject: string
}
```

## Frontend Changes

### Results Page (`src/shared/blocks/generator/video-results.tsx`)
**New Features:**
- Tab-based view angle switching
- Displays all videos in a group with labeled tabs
- State management for selected video per group
- Extracts video groups from API response

**Key Functions:**
- `extractVideoGroups(result)` - Parse video groups from API
- Tab UI for switching between viewing angles

### Generator Page (`src/shared/blocks/generator/video.tsx`)
- Added `extractVideoGroups()` function
- Updated `extractVideoUrls()` to support video groups
- Maintains backward compatibility with old format

### Admin Page (`src/app/[locale]/(admin)/admin/video-library/page.tsx`)
**Complete Overhaul:**

**New State:**
- `videoGroups` - List of video groups
- `videoGroupForm` - Form data for group metadata
- `groupVideos` - Array of videos within the editing group
- `videoGroupDialogOpen` - Dialog visibility

**New Functions:**
- `handleSaveVideoGroup()` - Save group with videos
- `handleDeleteVideoGroup()` - Delete group
- `handleAddVideoToGroup()` - Add video to group
- `handleRemoveVideoFromGroup(index)` - Remove video from group
- `handleUpdateGroupVideo(index, field, value)` - Update video field

**New UI:**
- Video Groups table with video count badge
- Comprehensive dialog for creating/editing video groups:
  - Group metadata section (title, description, thumbnail, difficulty, etc.)
  - Videos section with add/remove functionality
  - Individual video upload for each angle
  - View angle labels (EN/ZH)
  - Sort order for videos
- Mappings tab updated to use video groups

## Data Structure

### Video Group Object
```typescript
interface FitnessVideoGroup {
  id: string;
  title: string;
  titleZh?: string;
  description?: string;
  descriptionZh?: string;
  thumbnailUrl?: string;
  difficulty: string; // beginner, intermediate, advanced
  gender: string; // unisex, male, female
  accessType: string; // free, premium, hidden
  ageGroup: string; // all, young, middle, senior
  instructions?: string;
  instructionsZh?: string;
  tags?: string;
  status: string; // active, inactive
  viewCount: number;
  sort: number;
  createdAt: string;
}
```

### Video Object (within group)
```typescript
interface FitnessVideo {
  id: string;
  groupId: string;
  viewAngle: string; // "Front View", "Side View", etc.
  viewAngleZh?: string; // "正面视角", "侧面视角", etc.
  videoUrl: string;
  duration?: number;
  sort: number;
  status: string;
  createdAt: string;
}
```

### API Response Format
```typescript
{
  videoGroups: [
    {
      ...groupMetadata,
      videos: [
        { id, viewAngle, viewAngleZh, videoUrl, duration, sort }
      ]
    }
  ]
}
```

## Testing Checklist

### Backend
- [x] Build compiles successfully
- [ ] Create video group with multiple videos
- [ ] Update video group and videos
- [ ] Delete video group (cascades to videos)
- [ ] List video groups with filters
- [ ] Create mappings with video groups
- [ ] Query videos by object and body parts (returns groups)
- [ ] Query videos by body part (returns groups)

### Frontend
- [ ] Admin: Create new video group
- [ ] Admin: Add multiple videos to group
- [ ] Admin: Upload videos for each angle
- [ ] Admin: Edit existing video group
- [ ] Admin: Delete video group
- [ ] Admin: Create object-video group mappings
- [ ] Results: View video groups with angle tabs
- [ ] Results: Switch between viewing angles
- [ ] Generator: Generate videos (uses video-library provider)

## Migration Status

✅ **Completed:**
1. Database schema migration
2. Data migration (2 videos → 2 groups, 3 mappings preserved)
3. Backend models updated
4. API routes updated
5. AI provider updated
6. Frontend results page updated
7. Frontend generator page updated
8. Admin page completely overhauled
9. Build successful

🎯 **Next Steps:**
1. Test admin interface in browser
2. Create test video groups with multiple angles
3. Verify video playback and angle switching
4. Test AI generation with new structure
5. Verify mappings work correctly

## Notes

- All existing data was successfully migrated
- Backward compatibility maintained where possible
- Video groups support unlimited videos per group
- Each video can have custom view angle labels in EN/ZH
- Mappings now link objects to entire video groups, not individual videos
- Soft delete implemented for video groups (deletedAt field)
