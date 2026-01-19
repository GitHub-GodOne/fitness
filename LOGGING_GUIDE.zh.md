# 日志记录和错误排查指南

## 📍 日志记录位置

### 1. 开发环境（本地）

**控制台输出：**
- 所有 `console.log()`, `console.error()`, `console.warn()` 会输出到终端
- 运行 `pnpm dev` 时，日志会实时显示在终端

**查看方式：**
```bash
# 启动开发服务器
pnpm dev

# 日志会实时显示在终端，包括：
# - API 请求日志
# - 错误信息
# - 警告信息
# - 调试信息
```

### 2. 生产环境

#### 2.1 Vercel 部署

**Vercel 日志：**
- 登录 [Vercel Dashboard](https://vercel.com/dashboard)
- 选择你的项目
- 点击 **"Deployments"** → 选择部署 → 点击 **"Functions"** 标签
- 或者点击 **"Logs"** 查看实时日志

**查看方式：**
1. 访问 Vercel Dashboard
2. 选择项目
3. 进入 **Deployments** 页面
4. 点击具体的部署版本
5. 查看 **Functions** 或 **Logs** 标签

#### 2.2 PM2 服务器部署

**PM2 日志位置：**

PM2 **默认会自动将日志输出到文件**，有两种配置方式：

**方式 1：使用 ecosystem.config.js 配置（推荐）**

根据项目中的 `ecosystem.config.js` 配置：
- **错误日志：** `./logs/bible-video-error.log` (项目根目录下的 logs 文件夹)
- **标准输出：** `./logs/bible-video-out.log`
- **合并日志：** `./logs/bible-video-combined.log`

**方式 2：PM2 默认位置（如果未配置）**

如果未在配置文件中指定日志路径，PM2 会使用默认位置：
- **默认日志目录：** `~/.pm2/logs/`
- **应用日志文件：** `~/.pm2/logs/[app-name]-out.log` (标准输出)
- **错误日志文件：** `~/.pm2/logs/[app-name]-error.log` (错误输出)

**查看日志命令：**

```bash
# 查看所有应用的日志
pm2 logs

# 查看特定应用的日志
pm2 logs [app-name]

# 查看最近的日志（最后 100 行）
pm2 logs --lines 100

# 只查看错误日志
pm2 logs --err

# 只查看标准输出日志
pm2 logs --out

# 实时查看日志（类似 tail -f）
pm2 logs --lines 0

# 清空所有日志
pm2 flush

# 查看特定应用的错误日志文件
tail -f ~/.pm2/logs/[app-name]-error.log

# 查看特定应用的标准输出日志文件
tail -f ~/.pm2/logs/[app-name]-out.log
```

**PM2 常用命令：**

```bash
# 查看所有运行中的应用
pm2 list

# 查看应用详细信息
pm2 show [app-name]

# 查看应用状态
pm2 status

# 重启应用
pm2 restart [app-name]

# 停止应用
pm2 stop [app-name]

# 删除应用
pm2 delete [app-name]

# 查看应用监控信息
pm2 monit

# 保存当前 PM2 进程列表
pm2 save

# 设置 PM2 开机自启
pm2 startup
```

**在日志中搜索错误：**

```bash
# 搜索错误日志
grep -i "error\|failed" ~/.pm2/logs/[app-name]-error.log

# 搜索特定模块的日志
grep "\[Volcano\]" ~/.pm2/logs/[app-name]-out.log

# 搜索最近的错误（最后 1000 行）
tail -n 1000 ~/.pm2/logs/[app-name]-error.log | grep -i "error"

# 实时监控错误日志
tail -f ~/.pm2/logs/[app-name]-error.log | grep -i "error\|failed"
```

### 3. 服务器端日志

**API 路由日志：**
所有 API 路由的错误都会通过 `console.error()` 记录，位置包括：

- `/src/app/api/**/*.ts` - API 路由中的错误
- `/src/shared/services/**/*.ts` - 服务层错误
- `/src/extensions/**/*.ts` - 扩展功能错误

**常见日志位置：**

| 功能模块 | 日志位置 | 日志标识 |
|---------|---------|---------|
| AI 任务同步 | `src/app/api/ai/sync-pending-tasks/route.ts` | `[Sync Pending Tasks]` |
| 视频生成 | `src/app/api/ai/generate/route.ts` | `[AI Generate]` |
| 视频查询 | `src/app/api/ai/query/route.ts` | `[AI Query]` |
| 评论创建 | `src/app/api/comments/create/route.ts` | `[Comments Create]` |
| 视频合并 | `src/app/api/video/merge/route.ts` | `[Video Merge]` |
| 火山引擎 | `src/extensions/ai/volcano.ts` | `[Volcano]` |

### 4. 客户端日志

**浏览器控制台：**
- 打开浏览器开发者工具（F12）
- 查看 **Console** 标签
- 前端错误会显示在这里

**错误边界：**
- `/src/shared/blocks/common/error-boundary.tsx` - 捕获 React 组件错误
- 错误会通过 `console.error()` 输出到浏览器控制台

## 🔍 如何排查错误

### 步骤 1: 确定错误类型

**前端错误：**
- 打开浏览器开发者工具（F12）
- 查看 Console 标签中的红色错误信息
- 查看 Network 标签中的失败请求

**后端错误：**
- **Vercel 部署：** 查看 Vercel Dashboard 日志
- **PM2 部署：** 使用 `pm2 logs` 命令查看日志
- **本地开发：** 查看终端输出
- 查找带有 `[Error]` 或 `[Failed]` 标识的日志

### 步骤 2: 查找错误日志

**搜索关键词：**
```bash
# 在日志中搜索：
- "Error"
- "Failed"
- "Exception"
- "[模块名]" (如 "[Volcano]", "[Sync Pending Tasks]")

# PM2 中搜索：
pm2 logs | grep -i "error\|failed"
pm2 logs | grep "\[Volcano\]"
```

**常见错误标识：**
- `[Sync Pending Tasks] Failed:` - 定时任务同步失败
- `[Volcano] Failed to` - 火山引擎 API 错误
- `[Video Merge] Failed to` - 视频合并失败
- `[Comments Create]` - 评论创建错误
- `[AI Generate]` - AI 生成错误

### 步骤 3: 分析错误信息

**错误日志格式：**
```javascript
console.error('[模块名] 操作描述:', error);
// 例如：
console.error('[Volcano] Failed to auto-enhance prompt:', error);
```

**查看完整错误堆栈：**
- 错误对象通常包含 `message` 和 `stack` 属性
- 查看堆栈信息可以定位到具体的代码行

### 步骤 4: 检查相关配置

**环境变量：**
```bash
# 检查 .env 文件中的配置
- DATABASE_URL
- VOLCANO_API_KEY
- VOLCANO_DOUBAO_ENDPOINT
- R2_BUCKET_NAME
- NEXT_PUBLIC_CDN_DOMAIN
```

**数据库连接：**
- 检查 `DATABASE_URL` 是否正确
- 检查数据库连接池设置（`DB_SINGLETON_ENABLED`, `DB_MAX_CONNECTIONS`）

**API 密钥：**
- 检查各种 API 密钥是否配置正确
- 检查 API 密钥是否过期

### 步骤 5: 查看相关代码

**定位错误代码：**
1. 根据错误日志中的模块名找到对应文件
2. 查看错误发生的具体位置
3. 检查错误处理逻辑

**示例：**
```typescript
// 如果看到错误：[Volcano] Failed to auto-enhance prompt
// 1. 找到文件：src/extensions/ai/volcano.ts
// 2. 搜索 "Failed to auto-enhance prompt"
// 3. 查看该位置的代码和错误处理
```

## 🛠️ 常见错误排查

### 1. 数据库连接错误

**错误信息：**
```
Error [PostgresError]: remaining connection slots are reserved
```

**排查步骤：**
1. 检查 `DB_SINGLETON_ENABLED=true` 是否设置
2. 检查 `DB_MAX_CONNECTIONS` 是否合理（建议 10）
3. 检查数据库连接是否正常

### 2. API 调用失败

**错误信息：**
```
[Volcano] Failed to auto-enhance prompt: Error: Chat completion failed with status: 400
```

**排查步骤：**
1. 检查 API 密钥是否正确
2. 检查 API 端点 URL 是否正确
3. 检查请求参数格式是否正确
4. 查看 API 提供商的错误信息

### 3. 文件上传失败

**错误信息：**
```
[Video Merge] Failed to merge videos: Error: fetch failed
```

**排查步骤：**
1. 检查 R2 存储配置是否正确
2. 检查网络连接
3. 检查文件大小限制
4. 查看 R2 存储服务的错误信息

### 4. 前端错误

**错误信息：**
```
Uncaught error: TypeError: Cannot read property 'xxx' of undefined
```

**排查步骤：**
1. 打开浏览器开发者工具
2. 查看 Console 中的完整错误堆栈
3. 检查相关组件的代码
4. 检查数据是否正确传递

## 📊 日志级别

当前项目使用的日志级别：

| 级别 | 方法 | 用途 |
|-----|------|------|
| **Error** | `console.error()` | 错误信息，需要立即关注 |
| **Warn** | `console.warn()` | 警告信息，可能的问题 |
| **Info** | `console.log()` | 一般信息，调试用 |

## 🔧 改进建议

### 1. 添加结构化日志

考虑使用日志库（如 `winston` 或 `pino`）来：
- 统一日志格式
- 支持日志级别
- 支持日志文件输出
- 支持日志轮转

### 2. 添加错误追踪服务

考虑集成错误追踪服务（如 Sentry）：
- 自动捕获错误
- 错误通知
- 错误分析
- 性能监控

### 3. 添加请求日志中间件

在 API 路由中添加请求日志：
- 记录请求 URL
- 记录请求参数
- 记录响应状态
- 记录响应时间

## 📝 日志记录最佳实践

1. **使用有意义的日志标识**
   ```typescript
   console.error('[模块名] 操作描述:', error);
   ```

2. **记录关键信息**
   ```typescript
   console.error('[Volcano] Failed to generate video:', {
     taskId: task.id,
     provider: task.provider,
     error: error.message
   });
   ```

3. **区分日志级别**
   - 错误：使用 `console.error()`
   - 警告：使用 `console.warn()`
   - 信息：使用 `console.log()`

4. **避免记录敏感信息**
   - 不要记录密码、API 密钥等敏感信息
   - 不要记录完整的用户数据

## 🚀 快速排查命令

### 开发环境

```bash
# 查看最近的错误日志（本地开发）
pnpm dev | grep -i "error\|failed"

# 查看特定模块的日志
pnpm dev | grep "\[Volcano\]"

# 查看数据库相关错误
pnpm dev | grep -i "database\|postgres"
```

### PM2 生产环境

```bash
# 查看实时日志
pm2 logs bible-video

# 查看错误日志
pm2 logs bible-video --err

# 搜索错误
pm2 logs bible-video | grep -i "error\|failed"

# 查看特定模块的日志
pm2 logs bible-video | grep "\[Volcano\]"

# 查看最近的错误（最后 500 行）
pm2 logs bible-video --lines 500 --err

# 查看日志文件（使用配置的路径）
tail -f ./logs/bible-video-error.log
tail -f ./logs/bible-video-out.log

# 或者使用 PM2 默认路径
tail -f ~/.pm2/logs/bible-video-error.log
tail -f ~/.pm2/logs/bible-video-out.log

# 在日志文件中搜索（使用配置的路径）
grep -i "error" ./logs/bible-video-error.log
grep "\[Volcano\]" ./logs/bible-video-out.log

# 或者使用 PM2 默认路径
grep -i "error" ~/.pm2/logs/bible-video-error.log
grep "\[Volcano\]" ~/.pm2/logs/bible-video-out.log
```

## 📦 PM2 部署配置

### 创建 PM2 配置文件

项目已包含 `ecosystem.config.js` 配置文件，包含：
- 应用名称和启动脚本
- 日志文件配置（错误日志、标准输出日志）
- 自动重启配置
- 内存限制配置

### 使用 PM2 部署步骤

```bash
# 1. 安装 PM2（如果未安装）
npm install -g pm2

# 2. 构建项目
pnpm build

# 3. 启动应用
pm2 start ecosystem.config.js

# 或者直接启动
pm2 start npm --name "bible-video" -- start

# 4. 查看应用状态
pm2 list
pm2 status

# 5. 查看日志
pm2 logs bible-video

# 6. 保存 PM2 进程列表
pm2 save

# 7. 设置开机自启
pm2 startup
# 然后执行输出的命令
```

### PM2 日志文件位置

根据 `ecosystem.config.js` 配置：
- **错误日志：** `./logs/bible-video-error.log`
- **标准输出：** `./logs/bible-video-out.log`
- **合并日志：** `./logs/bible-video-combined.log`

**默认 PM2 日志位置（如果未配置）：**
- `~/.pm2/logs/bible-video-error.log`
- `~/.pm2/logs/bible-video-out.log`

### PM2 日志轮转（可选）

如果需要日志轮转，可以安装 `pm2-logrotate`：

```bash
# 安装 pm2-logrotate
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## 📞 获取帮助

如果遇到无法解决的问题：

1. **查看完整错误堆栈**
2. **检查相关配置文件**
3. **查看部署日志**
   - Vercel: Vercel Dashboard
   - PM2: `pm2 logs` 或日志文件
4. **检查浏览器控制台**
5. **联系技术支持并提供错误信息**

---

**最后更新：** 2025-01-19
