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
    const { currentPassword, newPassword } = body;

    if (!currentPassword) {
      return respErr('current password is required');
    }

    if (!newPassword || newPassword.length < 8) {
      return respErr('new password must be at least 8 characters');
    }

    const auth = await getAuth();
    const result = await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      },
      headers: await headers(),
    });

    if (!result?.token) {
      return respErr('change password failed');
    }

    return respData({ status: true });
  } catch (e: any) {
    console.log('change password failed:', e);
    return respErr(e?.message || 'change password failed');
  }
}
