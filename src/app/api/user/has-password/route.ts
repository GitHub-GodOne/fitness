import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { account } from '@/config/db/schema';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';

export async function POST() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const [credentialAccount] = await db()
      .select({ id: account.id })
      .from(account)
      .where(
        and(
          eq(account.userId, user.id),
          eq(account.providerId, 'credential')
        )
      )
      .limit(1);

    return respData({ hasPassword: !!credentialAccount });
  } catch (e) {
    console.log('check has-password failed:', e);
    return respErr('check has-password failed');
  }
}
