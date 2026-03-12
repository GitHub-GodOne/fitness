import { headers } from 'next/headers';

import { getAuth } from '@/core/auth';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return respErr('password must be at least 8 characters');
    }

    const auth = await getAuth();
    const result = await auth.api.setPassword({
      body: { newPassword },
      headers: await headers(),
    });

    if (!result?.status) {
      return respErr('set password failed');
    }

    return respData({ status: true });
  } catch (e: any) {
    console.log('set password failed:', e);
    return respErr(e?.message || 'set password failed');
  }
}
