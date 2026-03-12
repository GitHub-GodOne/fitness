'use client';

import { useEffect, useState } from 'react';
import { Check, ExternalLink, Loader } from 'lucide-react';
import { toast } from 'sonner';

import { CopyTextButton } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import type { MediaAsset } from '@/shared/models/media-asset';

export function MediaAssetPickerDialog({
  open,
  onOpenChange,
  mediaType,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType?: 'image' | 'video';
  onSelect: (asset: MediaAsset) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    async function fetchAssets() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: '60',
        });
        if (mediaType) {
          params.set('mediaType', mediaType);
        }

        const response = await fetch(`/api/admin/media-assets?${params.toString()}`);
        const payload = await response.json();

        if (!response.ok || payload.code !== 0) {
          throw new Error(payload.message || 'Failed to load assets');
        }

        setAssets(payload.data.items || []);
      } catch (error: any) {
        toast.error(error?.message || 'Failed to load asset library');
      } finally {
        setLoading(false);
      }
    }

    fetchAssets();
  }, [open, mediaType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-[98vw] sm:max-w-[98vw] 2xl:max-w-[1680px]">
        <DialogHeader>
          <DialogTitle>R2 Asset Library</DialogTitle>
          <DialogDescription>
            Choose a file and its public URL will be inserted into the current field.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader className="size-5 animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            No assets found.
          </div>
        ) : (
          <div className="grid max-h-[75vh] gap-5 overflow-y-auto pr-1 md:grid-cols-2 2xl:grid-cols-3">
            {assets.map((asset) => (
              <article key={asset.id} className="min-w-0 overflow-hidden rounded-2xl border bg-card">
                <div className="bg-muted p-3">
                  {asset.mediaType === 'image' ? (
                    <div className="overflow-hidden rounded-xl bg-background">
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl bg-black">
                      <video
                        src={asset.url}
                        className="aspect-[4/3] w-full object-cover"
                        controls
                        preload="metadata"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="line-clamp-2 text-base font-semibold">{asset.name}</h3>
                    <p className="mt-1 line-clamp-2 break-all text-sm text-muted-foreground">
                      {asset.url}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      title="Use URL"
                      onClick={() => {
                        onSelect(asset);
                        onOpenChange(false);
                      }}
                      >
                      <Check className="size-4" />
                    </Button>
                    <CopyTextButton text={asset.url} size="icon-sm" variant="outline" />
                    <Button asChild size="sm" variant="ghost">
                      <a href={asset.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
