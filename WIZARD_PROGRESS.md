# Wizard Progress Feature

## 功能说明

用户在使用健身视频生成器时，每一步的选择都会自动保存到数据库中。下次用户再次访问时，会自动加载上次的进度，无需重新填写。

## 主要特性

1. **自动保存** - 用户每次操作后，500ms 后自动保存到数据库
2. **自动加载** - 用户登录后自动加载上次的进度
3. **步骤跳转** - 用户可以点击步骤按钮（1-5）直接跳转到任意步骤
4. **完整记录** - 保存所有选择：性别、年龄、难度、图片、身体部位、当前步骤

## API 接口

### 获取进度
```
GET /api/wizard-progress
Authorization: Required (session)

Response:
{
  "success": true,
  "data": {
    "id": "xxx",
    "userId": "xxx",
    "voiceGender": "female",
    "ageGroup": "young",
    "difficulty": "medium",
    "referenceImages": ["url1", "url2"],
    "selectedBodyParts": ["chest", "arms"],
    "currentStep": 3,
    "aspectRatio": "adaptive",
    "duration": 12,
    "generateAudio": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 保存进度
```
POST /api/wizard-progress
Authorization: Required (session)
Content-Type: application/json

Body:
{
  "voiceGender": "female",
  "ageGroup": "young",
  "difficulty": "medium",
  "referenceImages": ["url1"],
  "selectedBodyParts": ["chest", "arms"],
  "currentStep": 3,
  "aspectRatio": "adaptive",
  "duration": 12,
  "generateAudio": true
}

Response:
{
  "success": true,
  "data": { ... }
}
```

### 清除进度
```
DELETE /api/wizard-progress
Authorization: Required (session)

Response:
{
  "success": true,
  "message": "Progress cleared"
}
```

## 数据库表结构

```sql
CREATE TABLE user_wizard_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  voice_gender TEXT,
  age_group TEXT,
  difficulty TEXT,
  reference_images TEXT, -- JSON array
  selected_body_parts TEXT, -- JSON array
  current_step INTEGER DEFAULT 1 NOT NULL,
  aspect_ratio TEXT DEFAULT 'adaptive',
  duration INTEGER DEFAULT 12,
  generate_audio BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_wizard_progress_user ON user_wizard_progress(user_id);
CREATE INDEX idx_wizard_progress_updated ON user_wizard_progress(updated_at);
```

## 使用示例

用户访问 `/ai-video-generator` 页面：

1. **首次访问**
   - 从步骤 1 开始
   - 用户选择性别 → 自动保存
   - 用户选择年龄 → 自动保存
   - 用户选择难度 → 自动保存
   - 用户上传图片 → 自动保存
   - 用户选择身体部位 → 自动保存

2. **再次访问**
   - 自动加载上次的所有选择
   - 从上次的步骤继续
   - 可以点击步骤按钮修改之前的选择

3. **步骤跳转**
   - 点击步骤 1-5 的按钮可以直接跳转
   - 方便用户修改之前的选择
   - 每次跳转后的修改都会自动保存

## 测试步骤

1. 登录用户账号
2. 访问 `/ai-video-generator`
3. 完成步骤 1-3 的选择
4. 刷新页面或关闭浏览器
5. 再次访问，应该看到之前的选择已经保存
6. 点击步骤按钮可以跳转到任意步骤修改
