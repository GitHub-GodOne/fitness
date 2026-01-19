import { respData, respErr } from '@/shared/lib/resp';
import { replaceR2Url, replaceR2Urls } from '@/shared/lib/url';
import { getUserInfo } from '@/shared/models/user';
import { getVideoMergesByUserId } from '@/shared/models/video-merge';

export async function GET(request: Request) {
    try {
        // Check user authentication
        const user = await getUserInfo();
        if (!user) {
            throw new Error('no auth, please sign in');
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);

        // Get merge history using model function
        const result = await getVideoMergesByUserId(user.id, page, limit);

        // Parse JSON fields and replace R2 URLs with CDN URLs
        const parsedHistory = result.data.map((record) => {
            const sourceUrls = JSON.parse(record.sourceVideoUrls || '[]');
            return {
                ...record,
                sourceVideoUrls: replaceR2Urls(sourceUrls),
                mergedVideoUrl: replaceR2Url(record.mergedVideoUrl),
                metadata: record.metadata ? JSON.parse(record.metadata) : null,
            };
        });

        return respData({
            data: parsedHistory,
            pagination: result.pagination,
        });
    } catch (e: any) {
        console.error('[Video Merge History] Failed to fetch history:', e);
        return respErr(e.message || 'Failed to fetch merge history');
    }
}
