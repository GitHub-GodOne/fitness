import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { account } from '@/config/db/schema';

export async function checkUserHasPassword(userId: string): Promise<boolean> {
  const [result] = await db()
    .select({ id: account.id })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, 'credential'))
    )
    .limit(1);

  return !!result;
}
