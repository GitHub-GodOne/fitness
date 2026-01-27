/**
 * Sync Pending Tasks Script
 * 
 * 这个脚本用于同步未完成的 AI 任务状态
 * 可以单独运行，也可以配置为定时任务
 * 
 * 使用方法：
 * 1. 直接运行: npx tsx scripts/sync-pending-tasks.ts
 * 2. PM2 定时任务: 在 ecosystem.config.js 中配置
 * 3. 系统 cron: 添加到 crontab
 * 
 * 环境变量：
 * - CRON_SECRET: 可选，用于验证请求（如果 API 需要）
 */

import { config } from 'dotenv';

// 加载环境变量
config();

async function syncPendingTasks() {
    try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const cronSecret = process.env.CRON_SECRET;

        const url = `${appUrl}/api/ai/sync-pending-tasks`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // 如果配置了 CRON_SECRET，添加到请求头
        if (cronSecret) {
            headers['Authorization'] = `Bearer ${cronSecret}`;
        }

        console.log(`[Sync Pending Tasks] Starting sync at ${new Date().toISOString()}`);
        console.log(`[Sync Pending Tasks] Calling: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        console.log('[Sync Pending Tasks] Result:', JSON.stringify(result, null, 2));

        if (result.code === 0) {
            console.log(`[Sync Pending Tasks] Success: ${result.data?.message || 'Completed'}`);
            if (result.data) {
                console.log(`[Sync Pending Tasks] Processed: ${result.data.processed || 0}, Updated: ${result.data.updated || 0}, Failed: ${result.data.failed || 0}`);
            }
            process.exit(0);
        } else {
            console.error('[Sync Pending Tasks] Failed:', result.message);
            process.exit(1);
        }
    } catch (error: any) {
        console.error('[Sync Pending Tasks] Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// 运行同步任务
syncPendingTasks();
