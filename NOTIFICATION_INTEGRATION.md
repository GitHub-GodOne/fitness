# 通知系统集成文档 / Notification System Integration Guide

## 概述 / Overview

本项目已集成完整的通知系统，支持评论回复和视频生成完成的实时通知。系统采用组件化设计，支持中英文国际化，适配移动端，性能优化良好。

This project has integrated a complete notification system that supports real-time notifications for comment replies and video generation completion. The system uses a component-based design, supports Chinese and English internationalization, is mobile-responsive, and is performance-optimized.

## 功能特性 / Features

- ✅ 评论回复通知 / Comment reply notifications
- ✅ 视频生成完成通知 / Video generation completion notifications
- ✅ 图片生成完成通知 / Image generation completion notifications
- ✅ 中英文国际化支持 / Chinese and English i18n support
- ✅ 移动端适配 / Mobile responsive
- ✅ 未读数量显示 / Unread count badge
- ✅ 一键全部标记已读 / Mark all as read
- ✅ 性能优化（30秒轮询） / Performance optimized (30s polling)

## 数据库迁移 / Database Migration

### 1. 运行迁移 / Run Migration

```bash
# 使用 Drizzle 生成迁移
pnpm drizzle-kit generate

# 应用迁移
pnpm drizzle-kit push
```

或者手动运行 SQL 文件：

```bash
psql -U your_user -d your_database -f migrations/add_notification_table.sql
```

### 2. 验证表创建 / Verify Table Creation

```sql
-- 检查表是否创建成功
SELECT * FROM notification LIMIT 1;

-- 检查索引
\d notification
```

## 组件集成 / Component Integration

### 1. 在导航栏添加通知铃铛 / Add Notification Bell to Navigation

在你的导航栏或头部组件中导入并使用 `NotificationBell` 组件：

```tsx
import { NotificationBell } from "@/shared/components/notification";

export function Header() {
  return (
    <header>
      {/* 其他导航元素 */}
      <NotificationBell className="mr-2" />
      {/* 用户菜单等 */}
    </header>
  );
}
```

### 2. 推荐集成位置 / Recommended Integration Locations

**主要布局文件：**

- `/src/app/[locale]/(landing)/layout.tsx` - 主页布局
- `/src/app/[locale]/(admin)/layout.tsx` - 管理后台布局
- `/src/shared/blocks/dashboard/main-header.tsx` - 仪表板头部

**示例集成代码：**

```tsx
// 在 main-header.tsx 中
import { NotificationBell } from "@/shared/components/notification";

export function MainHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 添加通知铃铛 */}
          <NotificationBell />
          {/* 其他操作按钮 */}
          {actions?.map((action, idx) => (
            <Button key={idx}>{action.title}</Button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## API 端点 / API Endpoints

### 1. 获取通知列表 / Get Notifications

```typescript
GET /api/notifications/list?page=1&limit=20&isRead=false

Response:
{
  code: 0,
  data: {
    data: Notification[],
    pagination: {
      page: 1,
      limit: 20,
      total: 50,
      totalPages: 3,
      unreadCount: 10
    }
  }
}
```

### 2. 获取未读数量 / Get Unread Count

```typescript
GET /api/notifications/unread-count

Response:
{
  code: 0,
  data: {
    unreadCount: 10
  }
}
```

### 3. 标记已读 / Mark as Read

```typescript
POST /api/notifications/mark-read
Body: {
  notificationId: "xxx" // 单个通知
  // 或
  markAll: true // 全部标记已读
}

Response:
{
  code: 0,
  data: {
    message: "Notification marked as read"
  }
}
```

## 创建通知 / Creating Notifications

### 1. 评论回复通知 / Comment Reply Notification

```typescript
import { notifyCommentReply } from "@/shared/services/notification";

await notifyCommentReply({
  userId: "user-id",
  commentId: "comment-id",
  replyUserName: "John Doe",
  commentContent: "Reply content...",
});
```

### 2. 视频生成完成通知 / Video Complete Notification

```typescript
import { notifyVideoComplete } from "@/shared/services/notification";

await notifyVideoComplete({
  userId: "user-id",
  taskId: "task-id",
  videoUrl: "https://example.com/video.mp4",
  prompt: "Video prompt...",
});
```

### 3. 图片生成完成通知 / Image Complete Notification

```typescript
import { notifyImageComplete } from "@/shared/services/notification";

await notifyImageComplete({
  userId: "user-id",
  taskId: "task-id",
  imageUrl: "https://example.com/image.jpg",
  prompt: "Image prompt...",
});
```

### 4. 自定义通知 / Custom Notification

```typescript
import { createUserNotification } from "@/shared/services/notification";

await createUserNotification({
  userId: "user-id",
  type: "custom_type",
  title: "Custom Title",
  content: "Custom content...",
  link: "/custom/link",
  metadata: {
    customField: "value",
  },
});
```

## 国际化配置 / Internationalization

通知系统已支持中英文，翻译文件位于：

- `/src/config/locale/messages/en/notification.json`
- `/src/config/locale/messages/zh/notification.json`

### 添加新的通知类型翻译 / Add New Notification Type Translation

```json
// en/notification.json
{
  "types": {
    "your_new_type": "Your New Type"
  },
  "messages": {
    "your_new_type_title": "New notification title",
    "your_new_type_content": "New notification content"
  }
}
```

## 性能优化 / Performance Optimization

### 1. 轮询间隔 / Polling Interval

通知铃铛组件每 30 秒自动刷新未读数量，避免频繁请求：

```typescript
// 在 notification-bell.tsx 中
useEffect(() => {
  fetchUnreadCount();
  const interval = setInterval(fetchUnreadCount, 30000); // 30秒
  return () => clearInterval(interval);
}, [fetchUnreadCount]);
```

### 2. 数据库索引 / Database Indexes

已创建以下索引优化查询性能：

- `idx_notification_user_created` - 用户通知按时间排序
- `idx_notification_user_unread` - 查询未读通知
- `idx_notification_type` - 按类型筛选

### 3. 懒加载 / Lazy Loading

通知列表支持分页加载，默认每页 10 条：

```typescript
const [page, setPage] = useState(1);
const limit = 10;
```

## 移动端适配 / Mobile Responsiveness

通知组件已完全适配移动端：

- 响应式宽度：`w-80 sm:w-96`
- 触摸友好的按钮尺寸
- 滚动区域优化：`ScrollArea` 组件
- 自适应文本截断：`line-clamp-2`

## 测试 / Testing

### 1. 测试评论回复通知 / Test Comment Reply Notification

```bash
# 创建一条评论
POST /api/comments/create

# 回复该评论（会自动触发通知）
POST /api/comments/reply
```

### 2. 测试视频生成通知 / Test Video Generation Notification

```bash
# 生成视频
POST /api/ai/generate

# 查询任务状态（完成时会自动触发通知）
POST /api/ai/query
```

### 3. 验证通知显示 / Verify Notification Display

1. 登录用户账号
2. 点击导航栏的通知铃铛图标
3. 查看通知列表
4. 点击通知跳转到相关页面
5. 验证未读数量更新

## 故障排查 / Troubleshooting

### 1. 通知不显示 / Notifications Not Showing

**检查项：**

- 数据库表是否创建成功
- API 端点是否正常响应
- 用户是否已登录
- 浏览器控制台是否有错误

```bash
# 检查通知表
psql -c "SELECT COUNT(*) FROM notification;"

# 测试 API
curl http://localhost:3000/api/notifications/unread-count
```

### 2. 未读数量不更新 / Unread Count Not Updating

**可能原因：**

- 轮询被阻止（检查网络请求）
- 标记已读 API 失败
- 组件未正确挂载

**解决方案：**

```typescript
// 手动触发刷新
fetchUnreadCount();
```

### 3. 通知创建失败 / Notification Creation Failed

**检查：**

- userId 是否有效
- 数据库连接是否正常
- 服务端日志错误信息

```typescript
// 添加错误处理
try {
  await notifyCommentReply({ ... });
} catch (error) {
  console.error('Failed to create notification:', error);
}
```

## 扩展功能 / Extension Features

### 1. 添加新的通知类型 / Add New Notification Type

```typescript
// 在 notification.ts 中添加新函数
export async function notifyCustomEvent({
  userId,
  eventData,
}: {
  userId: string;
  eventData: any;
}) {
  await createUserNotification({
    userId,
    type: "custom_event",
    title: "Custom Event",
    content: "Event description...",
    link: `/events/${eventData.id}`,
    metadata: eventData,
  });
}
```

### 2. 添加邮件通知 / Add Email Notifications

```typescript
// 在通知创建后发送邮件
if (parentComment.userEmail) {
  await sendEmail({
    to: parentComment.userEmail,
    subject: "New reply to your comment",
    body: `${replyUserName} replied to your comment...`,
  });
}
```

### 3. 添加推送通知 / Add Push Notifications

```typescript
// 集成 Web Push API
if ("Notification" in window && Notification.permission === "granted") {
  new Notification("New notification", {
    body: notification.content,
    icon: "/icon.png",
  });
}
```

## 最佳实践 / Best Practices

1. **异步处理** - 通知创建不应阻塞主流程
2. **错误处理** - 通知失败不应影响核心功能
3. **性能优化** - 避免频繁查询，使用合理的轮询间隔
4. **用户体验** - 提供清晰的通知内容和跳转链接
5. **数据清理** - 定期清理过期通知（可选）

## 维护建议 / Maintenance Recommendations

### 定期清理旧通知 / Clean Old Notifications

```sql
-- 删除 30 天前的已读通知
DELETE FROM notification
WHERE is_read = true
AND created_at < NOW() - INTERVAL '30 days';
```

### 监控通知数量 / Monitor Notification Count

```sql
-- 查看通知统计
SELECT
  type,
  COUNT(*) as total,
  SUM(CASE WHEN is_read THEN 1 ELSE 0 END) as read_count,
  SUM(CASE WHEN NOT is_read THEN 1 ELSE 0 END) as unread_count
FROM notification
GROUP BY type;
```

## 支持 / Support

如有问题，请查看：

- 项目 README
- API 文档
- 数据库 schema 注释
- 代码内联注释

---

**创建日期 / Created:** 2026-01-21  
**版本 / Version:** 1.0.0  
**作者 / Author:** Cascade AI
