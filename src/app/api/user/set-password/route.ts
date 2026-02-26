import { hashPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { db } from '@/core/db';
import { account } from '@/config/db/schema';
import { respData, respErr } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const { newPassword, confirmPassword } = await req.json();

    if (!newPassword || newPassword.length < 8) {
      return respErr('Password must be at least 8 characters');
    }

    if (newPassword !== confirmPassword) {
      return respErr('Passwords do not match');
    }

    // Check if user already has a credential account
    const [existing] = await db()
      .select({ id: account.id })
      .from(account)
      .where(
        and(eq(account.userId, user.id), eq(account.providerId, 'credential'))
      )
      .limit(1);

    if (existing) {
      return respErr('Password already set. Use change password instead.');
    }

    // Hash password and create credential account
    const hashed = await hashPassword(newPassword);

    await db().insert(account).values({
      id: nanoid(),
      userId: user.id,
      providerId: 'credential',
      accountId: user.email,
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return respData({ success: true });
  } catch (e) {
    console.log('set password failed:', e);
    return respErr('set password failed');
  }
}
