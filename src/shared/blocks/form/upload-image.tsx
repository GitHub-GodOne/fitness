'use client';

import { useCallback, useMemo, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { ControllerRenderProps } from 'react-hook-form';

import { MediaAssetPickerDialog } from '@/shared/blocks/admin/media-asset-picker-dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { FormField } from '@/shared/types/blocks/form';

import { ImageUploader, ImageUploaderValue } from '../common';

interface UploadImageProps {
  field: FormField;
  formField: ControllerRenderProps<Record<string, unknown>, string>;
  data?: any;
  metadata?: Record<string, any>;
  uploadUrl?: string;
  onUpload?: (files: File[]) => Promise<string[]>;
}

export function UploadImage({
  field,
  formField,
  data,
  metadata,
  uploadUrl = '/api/storage/upload-image',
  onUpload,
}: UploadImageProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const maxImages = metadata?.max || 1;
  const maxSizeMB = metadata?.maxSizeMB || 10;
  const allowMultiple = maxImages > 1;
  const allowDirectUrl = Boolean(metadata?.allowDirectUrl) && !allowMultiple;
  const pickerType = metadata?.mediaLibraryPicker?.mediaType as
    | 'image'
    | 'video'
    | undefined;

  const previews = useMemo(() => {
    const value = formField.value;
    if (!value) return [];

    let urls: string[] = [];

    if (typeof value === 'string') {
      urls = value.includes(',') ? value.split(',').filter(Boolean) : [value];
    } else if (Array.isArray(value)) {
      urls = value;
    }

    return urls;
  }, [formField.value]);

  const handleChange = useCallback(
    (items: ImageUploaderValue[]) => {
      const uploadedUrls = items
        .filter((item) => item.status === 'uploaded' && item.url)
        .map((item) => item.url as string);

      if (uploadedUrls.length > 0) {
        formField.onChange(allowMultiple ? uploadedUrls : uploadedUrls[0]);
      } else {
        formField.onChange(allowMultiple ? [] : '');
      }
    },
    [formField, allowMultiple]
  );

  return (
    <div className="space-y-3">
      {pickerType ? (
        <MediaAssetPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          mediaType={pickerType}
          onSelect={(asset) => {
            formField.onChange(allowMultiple ? [asset.url] : asset.url);
          }}
        />
      ) : null}

      <ImageUploader
        allowMultiple={allowMultiple}
        maxImages={maxImages}
        maxSizeMB={maxSizeMB}
        emptyHint={field.placeholder}
        defaultPreviews={previews}
        onChange={handleChange}
      />

      {allowDirectUrl ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {metadata?.directUrlLabel || 'Or paste image URL'}
          </div>
          <Input
            value={(formField.value as string) || ''}
            onChange={(event) => formField.onChange(event.target.value)}
            placeholder={
              metadata?.directUrlPlaceholder || 'https://example.com/image.jpg'
            }
          />
        </div>
      ) : null}

      {pickerType === 'image' ? (
        <Button
          type="button"
          variant="outline"
          className="h-auto w-full whitespace-normal rounded-full px-4 py-2 sm:w-auto"
          onClick={() => setPickerOpen(true)}
        >
          <FolderOpen className="size-4" />
          {metadata?.mediaLibraryPicker?.buttonText || 'Choose from Library'}
        </Button>
      ) : null}
    </div>
  );
}
