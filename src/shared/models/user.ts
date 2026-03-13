import { headers } from 'next/headers';
import { count, desc, eq, inArray } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { user } from '@/config/db/schema';

import { Permission, Role } from '../services/rbac';
import { getRemainingCredits } from './credit';

export interface UserCredits {
  remainingCredits: number;
  expiresAt: Date | null;
}

export type User = typeof user.$inferSelect & {
  isAdmin?: boolean;
  credits?: UserCredits;
  roles?: Role[];
  permissions?: Permission[];
  hasPassword?: boolean;
};
export type NewUser = typeof user.$inferInsert;
export type UpdateUser = Partial<Omit<NewUser, 'id' | 'createdAt' | 'email'>>;

export async function updateUser(userId: string, updatedUser: UpdateUser) {
  const [result] = await db()
    .update(user)
    .set(updatedUser)
    .where(eq(user.id, userId))
    .returning();

  return result;
}

export async function findUserById(userId: string) {
  const [result] = await db().select().from(user).where(eq(user.id, userId));

  return result;
}

export async function getUsers({
  page = 1,
  limit = 30,
  email,
}: {
  email?: string;
  page?: number;
  limit?: number;
} = {}): Promise<User[]> {
  const result = await db()
    .select()
    .from(user)
    .where(email ? eq(user.email, email) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result;
}

export async function getUsersCount({ email }: { email?: string }) {
  const [result] = await db()
    .select({ count: count() })
    .from(user)
    .where(email ? eq(user.email, email) : undefined);
  return result?.count || 0;
}

export async function getUserByUserIds(userIds: string[]) {
  const result = await db()
    .select()
    .from(user)
    .where(inArray(user.id, userIds));

  return result;
}

async function ensureUserRecord(signUser: Awaited<ReturnType<typeof getSignUser>>) {
  if (!signUser?.id) {
    return null;
  }

  const existingUser = await findUserById(signUser.id);
  if (existingUser) {
    return existingUser;
  }

  if (!signUser.email || !signUser.name) {
    console.warn('[Auth] Session user is missing required fields for recovery', {
      userId: signUser.id,
      hasEmail: Boolean(signUser.email),
      hasName: Boolean(signUser.name),
    });
    return null;
  }

  console.warn('[Auth] Recreating missing user row from active session', {
    userId: signUser.id,
    email: signUser.email,
  });

  const [restoredUser] = await db()
    .insert(user)
    .values({
      id: signUser.id,
      name: signUser.name,
      email: signUser.email,
      emailVerified: Boolean(signUser.emailVerified),
      image: signUser.image ?? null,
    })
    .onConflictDoUpdate({
      target: user.id,
      set: {
        name: signUser.name,
        email: signUser.email,
        emailVerified: Boolean(signUser.emailVerified),
        image: signUser.image ?? null,
      },
    })
    .returning();

  return restoredUser ?? (await findUserById(signUser.id));
}

export async function getUserInfo() {
  const signUser = await getSignUser();
  if (!signUser) {
    return null;
  }

  const persistedUser = await ensureUserRecord(signUser);
  return persistedUser ?? signUser;
}

export async function getUserCredits(userId: string) {
  const remainingCredits = await getRemainingCredits(userId);

  return { remainingCredits };
}

export async function getSignUser() {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user;
}

export async function appendUserToResult(result: any) {
  if (!result || !result.length) {
    return result;
  }

  const userIds = result.map((item: any) => item.userId);
  const users = await getUserByUserIds(userIds);
  result = result.map((item: any) => {
    const user = users.find((user: any) => user.id === item.userId);
    return { ...item, user };
  });

  return result;
}
