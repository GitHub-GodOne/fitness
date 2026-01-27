import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { replaceR2Url } from '@/shared/lib/url';
import { mergeVideos } from '@/shared/lib/video-merger';
import { getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { createVideoMerge } from '@/shared/models/video-merge';
import { getStorageService } from '@/shared/services/storage';

export async function POST(request: Request) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length < 2) {
      throw new Error('Please provide at least 2 video URLs to merge');
    }

    // 验证URL格式
    for (const url of urls) {
      if (typeof url !== 'string' || !url.startsWith('http')) {
        throw new Error(`Invalid video URL: ${url}`);
      }
    }

    // 检查用户登录
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // 检查用户积分（必须大于3才能合并视频）
    const remainingCredits = await getRemainingCredits(user.id);
    if (remainingCredits <= 3) {
      throw new Error('insufficient_credits_for_merge');
    }

    console.log('[Video Merge] Merging videos:', urls);

    // Merge videos using video merger utility
    const mergeResult = await mergeVideos({ urls });

    if (!mergeResult.success || !mergeResult.videoBuffer) {
      throw new Error(mergeResult.error || 'Failed to merge videos');
    }

    console.log('[Video Merge] Videos merged successfully, uploading to storage...');
    console.log('[Video Merge] Merged video buffer size:', mergeResult.videoBuffer.length, 'bytes');

    // Upload merged video to storage
    const storageService = await getStorageService();
    const videoKey = `merged/video/${getUuid()}.mp4`;

    let uploadResult;
    try {
      uploadResult = await storageService.uploadFile({
        body: mergeResult.videoBuffer,
        key: videoKey,
        contentType: 'video/mp4',
      });
      console.log('[Video Merge] Upload result:', JSON.stringify(uploadResult, null, 2));
    } catch (uploadError) {
      console.error('[Video Merge] Upload error details:', uploadError);
      throw new Error(`Failed to upload merged video: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
    }

    if (!uploadResult.success || !uploadResult.url) {
      console.error('[Video Merge] Upload failed, result:', uploadResult);
      throw new Error(uploadResult.error || 'Failed to upload merged video');
    }

    const finalUrl = replaceR2Url(uploadResult.url);
    console.log('[Video Merge] Merged video uploaded successfully:', finalUrl);

    // Save merge record to database
    try {
      const mergeRecord = await createVideoMerge({
        id: getUuid(),
        userId: user.id,
        sourceVideoUrls: JSON.stringify(urls),
        mergedVideoUrl: finalUrl,
        videoCount: urls.length,
        status: 'success',
        metadata: JSON.stringify({
          timestamp: new Date().toISOString(),
          userAgent: request.headers.get('user-agent') || '',
        }),
      });

      console.log('[Video Merge] Merge record saved:', mergeRecord.id);
    } catch (error) {
      console.error('[Video Merge] Failed to save merge record:', error);
      // Continue even if record saving fails
    }

    return respData({
      url: finalUrl,
      mergedCount: urls.length,
    });
  } catch (e: any) {
    console.error('[Video Merge] Failed to merge videos:', e);
    return respErr(e.message || 'Failed to merge videos');
  }
}

