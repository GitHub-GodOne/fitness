import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

import { getUserInfo } from '@/shared/models/user';

const PUBLIC_DIR = join(process.cwd(), 'public');

export async function POST(request: NextRequest) {
  const user = await getUserInfo();
  if (!user) {
    return NextResponse.json({ code: 403, message: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string || '';

    if (!file) {
      return NextResponse.json({ code: 400, message: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = join(PUBLIC_DIR, path, file.name);

    await writeFile(filePath, buffer);
    return NextResponse.json({ code: 0, message: 'File uploaded successfully' });
  } catch (error) {
    return NextResponse.json({ code: 500, message: 'Failed to upload file' }, { status: 500 });
  }
}
