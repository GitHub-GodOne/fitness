import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const filePath = path.join('/');
        const fullPath = join(process.cwd(), 'public', filePath);

        // Security check: ensure the path is within public directory
        if (!fullPath.startsWith(join(process.cwd(), 'public'))) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        // Check if file exists
        if (!existsSync(fullPath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        // Read file
        const fileBuffer = await readFile(fullPath);

        // Determine content type based on file extension
        const ext = filePath.split('.').pop()?.toLowerCase();
        const contentTypeMap: Record<string, string> = {
            mp4: 'video/mp4',
            webm: 'video/webm',
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            webp: 'image/webp',
            svg: 'image/svg+xml',
            txt: 'text/plain',
            json: 'application/json',
        };

        const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';

        // Return file with appropriate headers
        return new NextResponse(new Uint8Array(fileBuffer), {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Content-Length': fileBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Static file serve error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
