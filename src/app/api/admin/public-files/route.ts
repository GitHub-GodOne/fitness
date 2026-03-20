import { NextRequest, NextResponse } from 'next/server';
import { mkdir, readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, relative, resolve } from 'path';

import { getUserInfo } from '@/shared/models/user';

const PUBLIC_DIR = join(process.cwd(), 'public');

function resolvePublicPath(targetPath: string) {
  const resolvedPath = resolve(PUBLIC_DIR, targetPath || '');

  if (
    resolvedPath !== PUBLIC_DIR &&
    !resolvedPath.startsWith(`${PUBLIC_DIR}/`)
  ) {
    throw new Error('Invalid path');
  }

  return resolvedPath;
}

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
      const filePath = resolvePublicPath(file);
      const content = await readFile(filePath, 'utf-8');
      return NextResponse.json({ code: 0, data: { content } });
    } else {
      const currentDir = resolvePublicPath(path);
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
    const body = await request.json();

    if (body.action === 'create_folder') {
      const normalizedName = String(body.name || '').trim();
      if (!normalizedName) {
        return NextResponse.json(
          { code: 400, message: 'Folder name required' },
          { status: 400 }
        );
      }

      if (
        normalizedName.includes('/') ||
        normalizedName.includes('\\') ||
        normalizedName === '.' ||
        normalizedName === '..'
      ) {
        return NextResponse.json(
          { code: 400, message: 'Invalid folder name' },
          { status: 400 }
        );
      }

      const folderPath = resolvePublicPath(join(String(body.path || ''), normalizedName));
      await mkdir(folderPath, { recursive: false });
      return NextResponse.json({ code: 0, message: 'Folder created successfully' });
    }

    const filePath = resolvePublicPath(String(body.file || ''));
    await writeFile(filePath, String(body.content || ''), 'utf-8');
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
    const filePath = resolvePublicPath(file);
    await unlink(filePath);
    return NextResponse.json({ code: 0, message: 'File deleted successfully' });
  } catch (error) {
    return NextResponse.json({ code: 500, message: 'Failed to delete file' }, { status: 500 });
  }
}
