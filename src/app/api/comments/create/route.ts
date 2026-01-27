import { nanoid } from 'nanoid';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { getClientIp } from '@/shared/lib/ip';
import { respData, respErr } from '@/shared/lib/resp';
import { createComment } from '@/shared/models/comment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuth();
        const session = await auth.api.getSession({
            headers: req.headers,
        });

        // Parse JSON body with error handling
        let body;
        try {
            body = await req.json();
        } catch (jsonError) {
            console.error('[Comments Create] JSON parse error:', jsonError);
            return Response.json(
                { code: -1, message: 'Invalid JSON format' },
                { status: 400 }
            );
        }

        const {
            content,
            userName,
            userEmail,
            referencedTaskId,
        } = body;

        // Validate input - return 400 for validation errors
        if (!content || content.trim().length === 0) {
            return Response.json(
                { code: -1, message: 'Comment content is required' },
                { status: 400 }
            );
        }

        if (content.length > 5000) {
            return Response.json(
                { code: -1, message: 'Comment content is too long (max 5000 characters)' },
                { status: 400 }
            );
        }

        // For anonymous users, email and name are required
        if (!session?.user?.id) {
            if (!userEmail || !userName) {
                return Response.json(
                    { code: -1, message: 'Name and email are required for anonymous users' },
                    { status: 400 }
                );
            }
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userEmail)) {
                return Response.json(
                    { code: -1, message: 'Invalid email format' },
                    { status: 400 }
                );
            }
        }

        const userId = session?.user?.id || null;
        const finalUserName = session?.user?.name || userName;
        const finalUserEmail = session?.user?.email || userEmail;
        const finalUserAvatar = session?.user?.image || null;

        // Validate referenced task if provided
        let taskType = null;
        let taskUrl = null;
        if (referencedTaskId) {
            try {
                const [task] = await db()
                    .select()
                    .from(aiTask)
                    .where(eq(aiTask.id, referencedTaskId));

                if (task) {
                    taskType = task.mediaType;
                    // Parse task result to get URL
                    try {
                        const result = task.taskResult ? JSON.parse(task.taskResult) : null;
                        const taskInfo = task.taskInfo ? JSON.parse(task.taskInfo) : null;

                        // Try multiple sources for the URL (same logic as ai-task-selector)
                        taskUrl =
                            result?.saved_video_url ||
                            result?.content?.video_url ||
                            taskInfo?.videos?.[0]?.videoUrl ||
                            result?.url ||
                            result?.output ||
                            null;
                    } catch (e) {
                        console.error('[Comments Create] Error parsing task result:', e);
                    }
                }
            } catch (dbError) {
                console.error('[Comments Create] Database error fetching task:', dbError);
                // Continue without task reference if task lookup fails
            }
        }

        const ipAddress = await getClientIp();
        const userAgent = req.headers.get('user-agent') || '';

        // Create comment using model
        try {
            const newComment = await createComment({
                id: nanoid(),
                userId,
                userName: finalUserName,
                userEmail: finalUserEmail,
                userAvatar: finalUserAvatar,
                content: content.trim(),
                referencedTaskId: referencedTaskId || null,
                referencedTaskType: taskType,
                referencedTaskUrl: taskUrl,
                status: 'visible',
                visibility: 'public',
                ipAddress,
                userAgent,
            });

            return respData({
                id: newComment.id,
                message: 'Comment created successfully',
            });
        } catch (dbError) {
            console.error('[Comments Create] Database error creating comment:', dbError);
            return Response.json(
                { code: -1, message: 'Failed to create comment due to database error' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[Comments Create] Unexpected error:', error);
        return Response.json(
            { code: -1, message: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
