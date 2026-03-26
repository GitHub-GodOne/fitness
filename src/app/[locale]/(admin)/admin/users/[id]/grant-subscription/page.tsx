import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { grantManualSubscriptionForUser } from '@/shared/models/subscription';
import { findUserById } from '@/shared/models/user';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function UserGrantSubscriptionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.USERS_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const user = await findUserById(id);
  if (!user) {
    return <Empty message="User not found" />;
  }

  const t = await getTranslations('admin.users');

  const crumbs: Crumb[] = [
    { title: t('grant_subscription.crumbs.admin'), url: '/admin' },
    { title: t('grant_subscription.crumbs.users'), url: '/admin/users' },
    {
      title: t('grant_subscription.crumbs.grant_subscription'),
      is_active: true,
    },
  ];

  const form: Form = {
    fields: [
      {
        name: 'name',
        type: 'text',
        title: t('fields.name'),
        validation: { required: true },
        attributes: { disabled: true },
      },
      {
        name: 'email',
        type: 'text',
        title: t('fields.email'),
        validation: { required: true },
        attributes: { disabled: true },
      },
      {
        name: 'access_tier',
        type: 'select',
        title: t('grant_subscription.fields.access_tier'),
        value: 'starter',
        validation: { required: true },
        options: [
          {
            title: t('grant_subscription.options.starter'),
            value: 'starter',
          },
          {
            title: t('grant_subscription.options.pro'),
            value: 'pro',
          },
        ],
      },
      {
        name: 'interval',
        type: 'select',
        title: t('grant_subscription.fields.interval'),
        value: 'month',
        validation: { required: true },
        options: [
          {
            title: t('grant_subscription.options.month'),
            value: 'month',
          },
          {
            title: t('grant_subscription.options.year'),
            value: 'year',
          },
        ],
      },
      {
        name: 'interval_count',
        type: 'number',
        title: t('grant_subscription.fields.interval_count'),
        placeholder: '1',
        value: 1,
        validation: { required: true, min: 1 },
      },
      {
        name: 'amount',
        type: 'number',
        title: t('grant_subscription.fields.amount'),
        placeholder: '0',
        value: 0,
        tip: t('grant_subscription.fields.amount_tip'),
      },
      {
        name: 'currency',
        type: 'text',
        title: t('grant_subscription.fields.currency'),
        placeholder: 'USD',
        value: 'USD',
      },
      {
        name: 'description',
        type: 'textarea',
        title: t('grant_subscription.fields.description'),
        placeholder: t('grant_subscription.fields.description_placeholder'),
      },
    ],
    passby: {
      user,
    },
    data: user,
    submit: {
      button: {
        title: t('grant_subscription.buttons.submit'),
      },
      handler: async (data, passby) => {
        'use server';

        const { user } = passby;

        if (!user) {
          return { status: 'error', message: 'User not found' } as const;
        }

        const accessTier = (data.get('access_tier') as string) || 'starter';
        const interval = (data.get('interval') as string) || 'month';
        const intervalCount = parseInt(data.get('interval_count') as string, 10);
        const amount = parseInt(data.get('amount') as string, 10) || 0;
        const currency = (data.get('currency') as string) || 'USD';
        const description = data.get('description') as string;

        if (accessTier !== 'starter' && accessTier !== 'pro') {
          return {
            status: 'error',
            message: 'Invalid subscription tier',
          } as const;
        }

        if (interval !== 'month' && interval !== 'year') {
          return {
            status: 'error',
            message: 'Invalid subscription interval',
          } as const;
        }

        if (!intervalCount || intervalCount < 1) {
          return {
            status: 'error',
            message: 'Interval count must be greater than 0',
          } as const;
        }

        if (amount < 0) {
          return {
            status: 'error',
            message: 'Amount must be a non-negative number',
          } as const;
        }

        await grantManualSubscriptionForUser({
          user,
          accessTier,
          interval,
          intervalCount,
          amount,
          currency,
          description,
        });

        return {
          status: 'success',
          message: 'subscription granted successfully',
          redirect_url: `/admin/users?email=${user.email}`,
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('grant_subscription.title')} />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
