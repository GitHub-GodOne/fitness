'use client';

import { useEffect, useState } from 'react';
import { Download, Eye, Loader2, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';

interface MergeRecord {
  id: string;
  userId: string;
  sourceVideoUrls: string[];
  mergedVideoUrl: string;
  videoCount: number;
  status: 'success' | 'failed' | 'processing';
  error?: string | null;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export function MergeHistoryTable() {
  const t = useTranslations('settings.merge-history.page');
  const [records, setRecords] = useState<MergeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MergeRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/video/merge-history');
      if (!response.ok) {
        throw new Error('Failed to load merge history');
      }

      const result = await response.json();
      setRecords(result.data?.data || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load merge history');
      console.error('Failed to load merge history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (record: MergeRecord) => {
    setSelectedRecord(record);
    setDetailsOpen(true);
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default">{t('table.status.success')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('table.status.failed')}</Badge>;
      case 'processing':
        return <Badge variant="secondary">{t('table.status.processing')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">{t('loading')}</span>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Video className="h-12 w-12 text-muted-foreground opacity-20" />
          <p className="mt-4 text-muted-foreground">{t('empty')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">{t('table.headers.id')}</TableHead>
                  <TableHead className="w-[100px]">{t('table.headers.videoCount')}</TableHead>
                  <TableHead className="w-[120px]">{t('table.headers.status')}</TableHead>
                  <TableHead>{t('table.headers.createdAt')}</TableHead>
                  <TableHead className="text-right">{t('table.headers.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-xs">
                      {record.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        <span>{record.videoCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(record.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(record)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="ml-2 hidden sm:inline">{t('table.actions.view')}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(record.mergedVideoUrl)}
                          disabled={record.status !== 'success'}
                        >
                          <Download className="h-4 w-4" />
                          <span className="ml-2 hidden sm:inline">{t('table.actions.download')}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('details.title')}</DialogTitle>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">{t('details.status')}</h3>
                <div className="mt-1">{getStatusBadge(selectedRecord.status)}</div>
              </div>

              <div>
                <h3 className="text-sm font-medium">{t('details.videoCount')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedRecord.videoCount} videos
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium">{t('details.createdAt')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(selectedRecord.createdAt)}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium">{t('details.sourceVideos')}</h3>
                <div className="mt-2 space-y-2">
                  {selectedRecord.sourceVideoUrls.map((url, index) => (
                    <div key={index} className="flex items-start gap-2 rounded-lg border p-2">
                      <Video className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 break-all text-xs text-primary hover:underline sm:text-sm"
                      >
                        {url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRecord.status === 'success' && (
                <div>
                  <h3 className="text-sm font-medium">{t('details.mergedVideo')}</h3>
                  <div className="mt-2 rounded-lg border bg-muted/50 p-3 sm:p-4">
                    <video
                      src={selectedRecord.mergedVideoUrl}
                      controls
                      className="w-full rounded"
                    />
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <a
                        href={selectedRecord.mergedVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-xs text-primary hover:underline sm:flex-1 sm:truncate sm:text-sm"
                      >
                        {selectedRecord.mergedVideoUrl}
                      </a>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(selectedRecord.mergedVideoUrl)}
                        className="w-full sm:w-auto"
                      >
                        <Download className="h-4 w-4" />
                        <span className="ml-2 sm:hidden">{t('table.actions.download')}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {selectedRecord.error && (
                <div>
                  <h3 className="text-sm font-medium text-destructive">{t('details.error')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedRecord.error}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
