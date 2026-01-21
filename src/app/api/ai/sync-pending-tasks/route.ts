import { respData, respErr } from '@/shared/lib/resp';
import {
    getAITasks,
} from '@/shared/models/ai_task';
import { AITaskStatus } from '@/extensions/ai';

/**
 * Sync Pending Tasks API
 * 
 * This API endpoint is designed to be called by a cron job every 10 minutes
 * to check and update the status of pending/processing AI tasks.
 * 
 * This is useful when users close their browser during video generation,
 * as the frontend polling stops, but tasks continue processing on the backend.
 * 
 * Usage:
 * - Vercel Cron: Add to vercel.json crons array
 * - External Cron: Call this endpoint via HTTP request every 10 minutes
 * - Manual: Can be called manually for testing
 * 
 * Security: This endpoint should be protected with a secret token
 * to prevent unauthorized access.
 */
export async function GET(req: Request) {
    try {
        // Optional: Add secret token check for security
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return Response.json({ code: -1, message: 'unauthorized' }, { status: 401 });
        }

        // Find all pending or processing tasks
        const pendingTasks = await getAITasks({
            status: AITaskStatus.PENDING,
            limit: 100, // Process up to 100 tasks per run
        });

        const processingTasks = await getAITasks({
            status: AITaskStatus.PROCESSING,
            limit: 100,
        });

        const allTasks = [...pendingTasks, ...processingTasks];

        if (allTasks.length === 0) {
            return respData({
                message: 'No pending or processing tasks found',
                processed: 0,
                updated: 0,
                failed: 0,
            });
        }

        console.log(`[Sync Pending Tasks] Found ${allTasks.length} tasks to check`);

        let updatedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        // Get the base URL for internal API calls
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
            (req.headers.get('host') ? `http://${req.headers.get('host')}` : 'http://localhost:3000');

        // Process each task by calling the query API
        for (const task of allTasks) {
            try {
                if (!task.taskId) {
                    console.warn(`[Sync Pending Tasks] Task ${task.id} missing taskId, skipping`);
                    continue;
                }

                // Call the query API to check task status
                // This will handle the actual query and update logic
                const response = await fetch(`${baseUrl}/api/ai/query`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ taskId: task.id }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.message || `HTTP ${response.status}`;

                    // If task query is in progress, skip it (not a failure)
                    if (errorMessage === 'task query in progress') {
                        console.log(`[Sync Pending Tasks] Task ${task.id} query already in progress, skipping`);
                        continue;
                    }

                    throw new Error(errorMessage);
                }

                const result = await response.json();
                if (result.code !== 0) {
                    // If task query is in progress, skip it (not a failure)
                    if (result.message === 'task query in progress') {
                        console.log(`[Sync Pending Tasks] Task ${task.id} query already in progress, skipping`);
                        continue;
                    }
                    throw new Error(result.message || 'query failed');
                }

                updatedCount++;
                console.log(`[Sync Pending Tasks] Updated task ${task.id}`);
            } catch (error: any) {
                console.error(`[Sync Pending Tasks] Failed to process task ${task.id}:`, error);
                failedCount++;
                errors.push(`Task ${task.id}: ${error.message || 'Unknown error'}`);
            }
        }

        return respData({
            message: `Processed ${allTasks.length} tasks`,
            processed: allTasks.length,
            updated: updatedCount,
            failed: failedCount,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (e: any) {
        console.error('[Sync Pending Tasks] Failed:', e);
        return respErr(e.message || 'Failed to sync pending tasks');
    }
}
