'use client';

import { useTranslations } from 'next-intl';

export function BuiltWith() {
  const t = useTranslations('landing.footer');

  return (
    <div className="text-sm text-muted-foreground">
      {t('built_with')}
    </div>
  );
}
