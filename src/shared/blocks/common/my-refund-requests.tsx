'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { RefundRequestStatus } from '@/shared/types/refund';

interface RefundRequest {
  id: string;
  reason: string;
  account: string;
  requestedCreditsAmount: number;
  approvedCreditsAmount: number | null;
  description: string | null;
  status: string;
  remainingCredits: number | null;
  adminNotes: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function MyRefundRequests() {
  const t = useTranslations('refund.my_requests');
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/refund/my-requests');
      const result = await response.json();

      if (result.code === 0) {
        setRequests(result.data || []);
      } else {
        toast.error(result.message || t('fetch_failed'));
      }
    } catch (error: any) {
      console.error('[MyRefundRequests] Failed to fetch:', error);
      toast.error(t('fetch_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case RefundRequestStatus.PENDING:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            {t('status.pending')}
          </Badge>
        );
      case RefundRequestStatus.COMPLETED:
        return (
          <Badge className="bg-green-500 flex items-center gap-1">
            <Check className="h-3 w-3" />
            {t('status.completed')}
          </Badge>
        );
      case RefundRequestStatus.REJECTED:
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <X className="h-3 w-3" />
            {t('status.rejected')}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('no_requests')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl">
                  {t('request_id')}: {request.id.slice(0, 8)}...
                </CardTitle>
                <CardDescription className="mt-1">
                  {t('created_at')}: {formatDate(request.createdAt)}
                </CardDescription>
              </div>
              {getStatusBadge(request.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('fields.requested_credits')}</p>
                <p className="text-base font-semibold">{request.requestedCreditsAmount}</p>
              </div>
              {request.approvedCreditsAmount !== null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('fields.approved_credits')}</p>
                  <p className="text-base font-semibold text-green-600">{request.approvedCreditsAmount}</p>
                </div>
              )}
              {request.remainingCredits !== null && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('fields.remaining_credits')}</p>
                  <p className="text-base font-semibold">{request.remainingCredits}</p>
                </div>
              )}
              {request.processedAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('fields.processed_at')}</p>
                  <p className="text-base">{formatDate(request.processedAt)}</p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('fields.reason')}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{request.reason}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('fields.account')}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{request.account}</p>
            </div>

            {request.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('fields.description')}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{request.description}</p>
              </div>
            )}

            {request.adminNotes && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{t('fields.admin_notes')}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-blue-800 dark:text-blue-200">{request.adminNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
