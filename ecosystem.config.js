/**
 * PM2 Ecosystem Configuration
 * 
 * 使用方法：
 * 1. 安装 PM2: npm install -g pm2
 * 2. 启动应用: pm2 start ecosystem.config.js
 * 3. 查看日志: pm2 logs bible-video
 * 4. 保存配置: pm2 save
 * 5. 设置开机自启: pm2 startup
 * 
 * 更多信息: https://pm2.keymetrics.io/docs/usage/application-declaration/
 */

module.exports = {
  apps: [
    {
      name: 'bible-video',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './',
      instances: 1, // 或者使用 'max' 来使用所有 CPU 核心
      exec_mode: 'fork', // 'fork' 或 'cluster'
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 日志配置
      // PM2 会自动将日志输出到这些文件
      error_file: './logs/bible-video-error.log',      // 错误日志文件（console.error）
      out_file: './logs/bible-video-out.log',          // 标准输出日志文件（console.log）
      log_file: './logs/bible-video-combined.log',     // 合并日志文件（所有日志）
      time: true,                                       // 在日志中添加时间戳
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',        // 日志时间格式
      merge_logs: true,                                 // 合并所有实例的日志（如果使用 cluster 模式）
      log_type: 'raw',                                  // 'json' 或 'raw'，默认 'raw'
      
      // 自动重启配置
      autorestart: true,
      watch: false, // 生产环境建议设为 false
      max_memory_restart: '1G', // 内存超过 1G 时重启
      
      // 其他配置
      min_uptime: '10s', // 应用运行至少 10 秒才认为是正常启动
      max_restarts: 10, // 10 秒内重启超过 10 次则停止
      restart_delay: 4000, // 重启延迟 4 秒
      
      // 环境变量文件（可选）
      // env_file: '.env.production',
    },
    {
      name: 'sync-pending-tasks',
      script: 'npx',
      args: 'tsx scripts/sync-pending-tasks.ts',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      // 定时任务配置（每 10 分钟执行一次）
      cron_restart: '*/10 * * * *',  // Cron 格式：分 时 日 月 周
      autorestart: false,             // 定时任务不需要自动重启
      watch: false,
      // 日志配置
      error_file: './logs/sync-pending-tasks-error.log',
      out_file: './logs/sync-pending-tasks-out.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
