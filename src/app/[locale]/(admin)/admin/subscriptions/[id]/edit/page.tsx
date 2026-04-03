import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import {
  findSubscriptionById,
  SubscriptionStatus,
  UpdateSubscription,
  updateSubscriptionById,
} from '@/shared/models/subscription';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

function formatDateTimeInput(value?: Date | string | null) {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const seconds = `${date.getSeconds()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function parseOptionalDateTime(value: FormDataEntryValue | null) {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid datetime: ${raw}`);
  }

  return date;
}

export default async function SubscriptionEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  await requirePermission({
    code: PERMISSIONS.ADMIN_ACCESS,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const subscription = await findSubscriptionById(id);
  if (!subscription) {
    return <Empty message="Subscription not found" />;
  }

  const t = await getTranslations('admin.subscriptions');

  const crumbs: Crumb[] = [
    { title: t('edit.crumbs.admin'), url: '/admin' },
    { title: t('edit.crumbs.subscriptions'), url: '/admin/subscriptions' },
    { title: t('edit.crumbs.edit'), is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'subscriptionNo',
        type: 'text',
        title: t('fields.subscription_no'),
        attributes: { disabled: true },
      },
      {
        name: 'userEmail',
        type: 'text',
        title: t('fields.user_email'),
        attributes: { disabled: true },
      },
      {
        name: 'paymentProvider',
        type: 'text',
        title: t('fields.provider'),
        attributes: { disabled: true },
      },
      {
        name: 'subscriptionId',
        type: 'text',
        title: t('fields.provider_subscription_id'),
        attributes: { disabled: true },
      },
      {
        name: 'status',
        type: 'select',
        title: t('fields.status'),
        validation: { required: true },
        options: [
          { title: 'pending', value: SubscriptionStatus.PENDING },
          { title: 'active', value: SubscriptionStatus.ACTIVE },
          { title: 'pending_cancel', value: SubscriptionStatus.PENDING_CANCEL },
          { title: 'trialing', value: SubscriptionStatus.TRIALING },
          { title: 'paused', value: SubscriptionStatus.PAUSED },
          { title: 'expired', value: SubscriptionStatus.EXPIRED },
          { title: 'canceled', value: SubscriptionStatus.CANCELED },
        ],
      },
      {
        name: 'productId',
        type: 'text',
        title: t('fields.product_id'),
      },
      {
        name: 'productName',
        type: 'text',
        title: t('fields.product_name'),
      },
      {
        name: 'planName',
        type: 'text',
        title: t('fields.plan_name'),
      },
      {
        name: 'amount',
        type: 'number',
        title: t('fields.amount'),
        validation: { required: true, min: 0 },
      },
      {
        name: 'currency',
        type: 'text',
        title: t('fields.currency'),
        validation: { required: true },
      },
      {
        name: 'interval',
        type: 'select',
        title: t('fields.interval'),
        validation: { required: true },
        options: [
          { title: 'day', value: 'day' },
          { title: 'week', value: 'week' },
          { title: 'month', value: 'month' },
          { title: 'year', value: 'year' },
          { title: 'one-time', value: 'one-time' },
        ],
      },
      {
        name: 'intervalCount',
        type: 'number',
        title: t('fields.interval_count'),
        validation: { required: true, min: 1 },
      },
      {
        name: 'currentPeriodStart',
        type: 'text',
        title: t('fields.current_period_start'),
        placeholder: 'YYYY-MM-DD HH:mm:ss',
      },
      {
        name: 'currentPeriodEnd',
        type: 'text',
        title: t('fields.current_period_end'),
        placeholder: 'YYYY-MM-DD HH:mm:ss',
      },
      {
        name: 'canceledAt',
        type: 'text',
        title: t('fields.canceled_at'),
        placeholder: 'YYYY-MM-DD HH:mm:ss',
      },
      {
        name: 'canceledEndAt',
        type: 'text',
        title: t('fields.canceled_end_at'),
        placeholder: 'YYYY-MM-DD HH:mm:ss',
      },
      {
        name: 'description',
        type: 'textarea',
        title: t('fields.description'),
      },
    ],
    data: {
      ...subscription,
      currentPeriodStart: formatDateTimeInput(subscription.currentPeriodStart),
      currentPeriodEnd: formatDateTimeInput(subscription.currentPeriodEnd),
      canceledAt: formatDateTimeInput(subscription.canceledAt),
      canceledEndAt: formatDateTimeInput(subscription.canceledEndAt),
    },
    passby: {
      subscription,
    },
    submit: {
      button: {
        title: t('edit.buttons.submit'),
      },
      handler: async (data, passby) => {
        'use server';

        const currentSubscription = passby?.subscription;
        if (!currentSubscription) {
          return {
            status: 'error',
            message: 'Subscription not found',
          } as const;
        }

        try {
          const amount = parseInt(String(data.get('amount') || '0'), 10);
          const intervalCount = parseInt(
            String(data.get('intervalCount') || '1'),
            10,
          );
          const status = String(data.get('status') || '').trim();
          const interval = String(data.get('interval') || '').trim();

          if (Number.isNaN(amount) || amount < 0) {
            return {
              status: 'error',
              message: 'Amount must be a non-negative integer',
            } as const;
          }

          if (Number.isNaN(intervalCount) || intervalCount < 1) {
            return {
              status: 'error',
              message: 'Interval count must be greater than 0',
            } as const;
          }

          if (
            !Object.values(SubscriptionStatus).includes(
              status as SubscriptionStatus,
            )
          ) {
            return {
              status: 'error',
              message: 'Invalid subscription status',
            } as const;
          }

          if (!['day', 'week', 'month', 'year', 'one-time'].includes(interval)) {
            return {
              status: 'error',
              message: 'Invalid subscription interval',
            } as const;
          }

          const updateSubscription: UpdateSubscription = {
            status: status as SubscriptionStatus,
            productId: String(data.get('productId') || '').trim(),
            productName: String(data.get('productName') || '').trim(),
            planName: String(data.get('planName') || '').trim(),
            amount,
            currency: String(data.get('currency') || '')
              .trim()
              .toUpperCase(),
            interval,
            intervalCount,
            currentPeriodStart: parseOptionalDateTime(
              data.get('currentPeriodStart'),
            ),
            currentPeriodEnd: parseOptionalDateTime(data.get('currentPeriodEnd')),
            canceledAt: parseOptionalDateTime(data.get('canceledAt')),
            canceledEndAt: parseOptionalDateTime(data.get('canceledEndAt')),
            description: String(data.get('description') || '').trim(),
          };

          const result = await updateSubscriptionById(
            currentSubscription.id,
            updateSubscription,
          );

          if (!result) {
            return {
              status: 'error',
              message: 'Failed to update subscription',
            } as const;
          }

          return {
            status: 'success',
            message: 'subscription updated',
            redirect_url: '/admin/subscriptions',
          } as const;
        } catch (error: any) {
          return {
            status: 'error',
            message: error.message || 'Failed to update subscription',
          } as const;
        }
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('edit.title')} />
        <FormCard form={form} className="md:max-w-2xl" />
      </Main>
    </>
  );
}
