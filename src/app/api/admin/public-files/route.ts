import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, relative } from 'path';

import { getUserInfo } from '@/shared/models/user';

const PUBLIC_DIR = join(process.cwd(), 'public');

export async function GET(request: NextRequest) {
  const user = await getUserInfo();
  if (!user) {
    return NextResponse.json({ code: 403, message: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';
  const file = searchParams.get('file');

  try {
    if (file) {
      const filePath = join(PUBLIC_DIR, file);
      const content = await readFile(filePath, 'utf-8');
      return NextResponse.json({ code: 0, data: { content } });
    } else {
      const currentDir = join(PUBLIC_DIR, path);
      const allFiles = await readdir(currentDir);
      const items = [];

      for (const f of allFiles) {
        if (f.startsWith('.')) continue;
        const fullPath = join(currentDir, f);
        const stats = await stat(fullPath);
        const relativePath = relative(PUBLIC_DIR, fullPath);

        items.push({
          name: f,
          path: relativePath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
        });
      }

      return NextResponse.json({ code: 0, data: { items, currentPath: path } });
    }
  } catch (error) {
    return NextResponse.json({ code: 500, message: 'Failed to read' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserInfo();
  if (!user) {
    return NextResponse.json({ code: 403, message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { file, content } = await request.json();
    const filePath = join(PUBLIC_DIR, file);
    await writeFile(filePath, content, 'utf-8');
    return NextResponse.json({ code: 0, message: 'File saved successfully' });
  } catch (error) {
    return NextResponse.json({ code: 500, message: 'Failed to save file' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUserInfo();
  if (!user) {
    return NextResponse.json({ code: 403, message: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');
    if (!file) {
      return NextResponse.json({ code: 400, message: 'File path required' }, { status: 400 });
    }

    const { unlink } = await import('fs/promises');
    const filePath = join(PUBLIC_DIR, file);
    await unlink(filePath);
    return NextResponse.json({ code: 0, message: 'File deleted successfully' });
  } catch (error) {
    return NextResponse.json({ code: 500, message: 'Failed to delete file' }, { status: 500 });
  }
}
