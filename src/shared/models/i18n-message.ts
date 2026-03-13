import { and, asc, eq } from 'drizzle-orm';
import { revalidateTag, unstable_cache } from 'next/cache';

import { i18nMessage } from '@/config/db/schema';
import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { getUuid } from '@/shared/lib/hash';

export type I18nMessage = typeof i18nMessage.$inferSelect;
export type NewI18nMessage = typeof i18nMessage.$inferInsert;

export const CACHE_TAG_I18N_MESSAGES = 'i18n-messages';

export async function saveI18nMessageOverride(
  data: Omit<NewI18nMessage, 'id' | 'createdAt' | 'updatedAt'>
) {
  const [result] = await db()
    .insert(i18nMessage)
    .values({
      id: getUuid(),
      ...data,
    })
    .onConflictDoUpdate({
      target: [
        i18nMessage.locale,
        i18nMessage.namespace,
        i18nMessage.key,
      ],
      set: {
        value: data.value,
        updatedBy: data.updatedBy ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  revalidateTag(CACHE_TAG_I18N_MESSAGES, 'max');

  return result;
}

export async function saveI18nMessageOverridesBatch({
  locale,
  namespace,
  entries,
  updatedBy,
}: {
  locale: string;
  namespace: string;
  entries: Array<{ key: string; value: string }>;
  updatedBy?: string | null;
}) {
  if (entries.length === 0) {
    return [];
  }

  const result = await db().transaction(async (tx) => {
    const saved: I18nMessage[] = [];

    for (const entry of entries) {
      const [row] = await tx
        .insert(i18nMessage)
        .values({
          id: getUuid(),
          locale,
          namespace,
          key: entry.key,
          value: entry.value,
          updatedBy: updatedBy ?? null,
        })
        .onConflictDoUpdate({
          target: [
            i18nMessage.locale,
            i18nMessage.namespace,
            i18nMessage.key,
          ],
          set: {
            value: entry.value,
            updatedBy: updatedBy ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();

      if (row) {
        saved.push(row);
      }
    }

    return saved;
  });

  revalidateTag(CACHE_TAG_I18N_MESSAGES, 'max');

  return result;
}

export async function deleteI18nMessageOverride({
  locale,
  namespace,
  key,
}: {
  locale: string;
  namespace: string;
  key: string;
}) {
  const [result] = await db()
    .delete(i18nMessage)
    .where(
      and(
        eq(i18nMessage.locale, locale),
        eq(i18nMessage.namespace, namespace),
        eq(i18nMessage.key, key)
      )
    )
    .returning();

  revalidateTag(CACHE_TAG_I18N_MESSAGES, 'max');

  return result;
}

export async function deleteI18nMessageOverridesByNamespace({
  locale,
  namespace,
}: {
  locale: string;
  namespace: string;
}) {
  const result = await db()
    .delete(i18nMessage)
    .where(
      and(
        eq(i18nMessage.locale, locale),
        eq(i18nMessage.namespace, namespace)
      )
    )
    .returning();

  revalidateTag(CACHE_TAG_I18N_MESSAGES, 'max');

  return result;
}

export const getI18nMessageOverrides = unstable_cache(
  async (locale: string): Promise<I18nMessage[]> => {
    if (!envConfigs.database_url) {
      return [];
    }

    return db()
      .select()
      .from(i18nMessage)
      .where(eq(i18nMessage.locale, locale))
      .orderBy(
        asc(i18nMessage.namespace),
        asc(i18nMessage.key),
        asc(i18nMessage.createdAt)
      );
  },
  ['i18n-message-overrides'],
  {
    revalidate: 3600,
    tags: [CACHE_TAG_I18N_MESSAGES],
  }
);

export async function getI18nMessageOverridesByNamespace({
  locale,
  namespace,
}: {
  locale: string;
  namespace: string;
}) {
  if (!envConfigs.database_url) {
    return [];
  }

  return db()
    .select()
    .from(i18nMessage)
    .where(
      and(
        eq(i18nMessage.locale, locale),
        eq(i18nMessage.namespace, namespace)
      )
    )
    .orderBy(asc(i18nMessage.key), asc(i18nMessage.createdAt));
}
