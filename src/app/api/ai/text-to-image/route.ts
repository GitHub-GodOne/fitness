import { addTextToImage } from '@/shared/lib/image-text';
import { respErr } from '@/shared/lib/resp';

/**
 * POST /api/ai/text-to-image
 *
 * Test endpoint for addTextToImage functionality.
 *
 * Accepts JSON body:
 *   { "image_url": "https://...", "text": "Your overlay text here" }
 *
 * Or multipart/form-data:
 *   - file: image file
 *   - text: overlay text
 *
 * Returns: PNG image with text overlay
 */
export async function POST(request: Request) {
  try {
    let imageInput: Buffer | string;
    let text: string;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      text = (formData.get('text') as string) || '';
      const file = formData.get('file') as File | null;

      if (!file || file.size === 0) {
        return respErr('file is required for multipart upload');
      }
      if (!text) {
        return respErr('text is required');
      }

      imageInput = Buffer.from(await file.arrayBuffer());
    } else {
      const body = await request.json();
      const { image_url, text: bodyText } = body;

      if (!image_url) {
        return respErr('image_url is required');
      }
      if (!bodyText) {
        return respErr('text is required');
      }

      text = bodyText;
      imageInput = image_url;
    }

    const outputBuffer = await addTextToImage(imageInput, text);

    return new Response(new Uint8Array(outputBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'inline; filename="text-overlay.png"',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e: any) {
    console.error('[text-to-image] Error:', e);
    return respErr(e.message || 'Internal error');
  }
}
