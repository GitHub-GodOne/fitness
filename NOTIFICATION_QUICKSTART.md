# 通知系统快速开始 / Notification System Quick Start

## 🚀 快速部署 / Quick Deployment

### 步骤 1: 数据库迁移 / Step 1: Database Migration

```bash
# 生成并应用数据库迁移
pnpm drizzle-kit generate
pnpm drizzle-kit push

# 或手动运行 SQL
psql -U your_user -d your_database -f migrations/add_notification_table.sql
```

### 步骤 2: 重新构建项目 / Step 2: Rebuild Project

```bash
pnpm build
```

### 步骤 3: 集成通知铃铛 / Step 3: Integrate Notification Bell

在你的头部组件中添加通知铃铛：

```tsx
import { NotificationBell } from "@/shared/components/notification";

export function YourHeader() {
  return (
    <header>
      {/* 你的其他头部元素 */}
      <NotificationBell />
    </header>
  );
}
```

**推荐集成位置：**

- `src/shared/blocks/dashboard/main-header.tsx`
- `src/shared/blocks/common/header-with-notification.tsx` (示例文件)
- 或任何你的自定义头部组件

### 步骤 4: 验证功能 / Step 4: Verify Functionality

1. 启动开发服务器：

```bash
pnpm dev
```

2. 登录用户账号

3. 测试评论回复通知：
   - 创建一条评论
   - 用另一个账号回复该评论
   - 查看通知铃铛是否显示未读数量

4. 测试视频生成通知：
   - 生成一个视频
   - 等待视频生成完成
   - 查看是否收到通知

## 📋 已完成的功能 / Completed Features

### ✅ 数据库层 / Database Layer

- [x] `notification` 表创建
- [x] 索引优化（用户、时间、未读状态）
- [x] 外键关联（级联删除）

### ✅ 后端 API / Backend API

- [x] `/api/notifications/list` - 获取通知列表
- [x] `/api/notifications/unread-count` - 获取未读数量
- [x] `/api/notifications/mark-read` - 标记已读

### ✅ 数据模型 / Data Models

- [x] `notification` 模型和类型定义
- [x] CRUD 操作函数
- [x] 分页查询支持

### ✅ 通知服务 / Notification Services

- [x] `notifyCommentReply()` - 评论回复通知
- [x] `notifyVideoComplete()` - 视频完成通知
- [x] `notifyImageComplete()` - 图片完成通知
- [x] `createUserNotification()` - 自定义通知

### ✅ UI 组件 / UI Components

- [x] `NotificationBell` - 通知铃铛（带未读数量徽章）
- [x] `NotificationList` - 通知列表（滚动加载）
- [x] `NotificationItem` - 单个通知项（带图标和时间）

### ✅ 国际化 / Internationalization

- [x] 英文翻译 (`en/notification.json`)
- [x] 中文翻译 (`zh/notification.json`)
- [x] 时间格式化（刚刚、分钟前、小时前、天前）

### ✅ 集成点 / Integration Points

- [x] 评论回复 API (`/api/comments/reply/route.ts`)
- [x] AI 任务查询 API (`/api/ai/query/route.ts`)
- [x] 自动触发通知创建

### ✅ 性能优化 / Performance Optimization

- [x] 30秒轮询间隔（避免频繁请求）
- [x] 数据库索引优化
- [x] 分页加载（默认10条）
- [x] 懒加载和按需渲染

### ✅ 移动端适配 / Mobile Responsive

- [x] 响应式宽度设计
- [x] 触摸友好的交互
- [x] 自适应文本截断
- [x] 滚动区域优化

## 🎨 UI 预览 / UI Preview

### 通知铃铛 / Notification Bell

```
┌─────────────────┐
│  🔔 (3)        │  ← 未读数量徽章（红色，带动画）
└─────────────────┘
```

### 通知列表 / Notification List

```
┌──────────────────────────────────┐
│  Notifications    Mark all read  │
├──────────────────────────────────┤
│ 💬 New reply to your comment  •  │
│    John replied to your comment  │
│    2 minutes ago                 │
├──────────────────────────────────┤
│ 🎥 Video generation completed    │
│    Your video has been generated │
│    1 hour ago                    │
├──────────────────────────────────┤
│ ✅ Image generation completed    │
│    Your image has been generated │
│    Yesterday                     │
└──────────────────────────────────┘
```

## 🔧 配置选项 / Configuration Options

### 修改轮询间隔 / Change Polling Interval

在 `notification-bell.tsx` 中：

```typescript
const interval = setInterval(fetchUnreadCount, 30000); // 改为你需要的毫秒数
```

### 修改每页显示数量 / Change Items Per Page

在 `notification-list.tsx` 中：

```typescript
const response = await fetch(`/api/notifications/list?page=${page}&limit=20`); // 改为你需要的数量
```

### 自定义通知图标 / Customize Notification Icons

在 `notification-item.tsx` 的 `getIcon()` 函数中添加新类型：

```typescript
case 'your_custom_type':
  return <YourIcon className="h-5 w-5 text-custom-color" />;
```

## 📝 使用示例 / Usage Examples

### 示例 1: 在自定义事件中发送通知

```typescript
import { createUserNotification } from "@/shared/services/notification";

// 当用户完成某个操作时
await createUserNotification({
  userId: user.id,
  type: "achievement_unlocked",
  title: "Achievement Unlocked!",
  content: "You have earned a new badge",
  link: "/profile/achievements",
  metadata: {
    achievementId: "first_video",
    points: 100,
  },
});
```

### 示例 2: 批量通知多个用户

```typescript
import { createUserNotification } from "@/shared/services/notification";

const userIds = ["user1", "user2", "user3"];

await Promise.all(
  userIds.map((userId) =>
    createUserNotification({
      userId,
      type: "system_announcement",
      title: "System Maintenance",
      content: "Scheduled maintenance on Jan 25",
      link: "/announcements",
    }),
  ),
);
```

### 示例 3: 条件通知

```typescript
// 只在特定条件下发送通知
if (task.status === "SUCCESS" && task.userId && !task.notified) {
  await notifyVideoComplete({
    userId: task.userId,
    taskId: task.id,
    videoUrl: task.videoUrl,
    prompt: task.prompt,
  });

  // 标记已通知，避免重复
  await updateTask(task.id, { notified: true });
}
```

## 🐛 常见问题 / Common Issues

### Q1: 通知铃铛不显示

**A:** 确保用户已登录，且组件已正确导入和挂载。

### Q2: 未读数量不更新

**A:** 检查浏览器控制台是否有 API 错误，确认轮询正常运行。

### Q3: 点击通知无反应

**A:** 确认 `link` 字段设置正确，路由存在且可访问。

### Q4: 数据库迁移失败

**A:** 检查数据库连接，确认有足够权限创建表和索引。

### Q5: TypeScript 类型错误

**A:** 运行 `pnpm build` 重新构建，TypeScript 会识别新创建的类型。

## 📚 相关文档 / Related Documentation

- 完整集成文档: `NOTIFICATION_INTEGRATION.md`
- 数据库 Schema: `src/config/db/schema.ts`
- API 实现: `src/app/api/notifications/`
- UI 组件: `src/shared/components/notification/`
- 服务函数: `src/shared/services/notification.ts`

## 🎯 下一步 / Next Steps

1. **自定义样式** - 根据你的设计系统调整通知组件样式
2. **添加音效** - 在收到新通知时播放提示音
3. **邮件集成** - 发送邮件通知作为备份
4. **推送通知** - 集成 Web Push API 实现浏览器推送
5. **通知中心页面** - 创建独立的通知历史页面

## ✨ 特色功能 / Highlights

- 🎨 **美观的 UI** - 现代化设计，带动画效果
- ⚡ **高性能** - 优化的数据库查询和前端渲染
- 🌍 **国际化** - 完整的中英文支持
- 📱 **移动优先** - 完美适配各种屏幕尺寸
- 🔒 **安全可靠** - 用户权限验证，防止越权访问
- 🧩 **易于扩展** - 组件化设计，方便添加新功能

---

**准备就绪！** 🎉 你的通知系统已经完全配置好了，开始使用吧！

Ready to go! 🎉 Your notification system is fully configured and ready to use!
