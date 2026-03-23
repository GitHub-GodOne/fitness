import { useRef, useState } from 'react';
import { FolderOpen, Loader, Upload } from 'lucide-react';
import { ControllerRenderProps } from 'react-hook-form';
import { toast } from 'sonner';

import { MediaAssetPickerDialog } from '@/shared/blocks/admin/media-asset-picker-dialog';
import { Button } from '@/shared/components/ui/button';
import { Input as InputComponent } from '@/shared/components/ui/input';
import { uploadAdminMediaFilesDirect } from '@/shared/lib/admin-media-upload';
import { FormField } from '@/shared/types/blocks/form';

export function Input({
  field,
  formField,
  data,
}: {
  field: FormField;
  formField: ControllerRenderProps<Record<string, unknown>, string>;
  data?: any;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const pickerType = field.metadata?.mediaLibraryPicker?.mediaType as
    | 'image'
    | 'video'
    | 'audio'
    | undefined;
  const uploadType = field.metadata?.mediaUpload?.mediaType as
    | 'image'
    | 'video'
    | 'audio'
    | undefined;

  async function handleUpload(file: File) {
    if (!uploadType) {
      return;
    }

    try {
      setIsUploading(true);
      const uploadedItems = await uploadAdminMediaFilesDirect({
        files: [file],
        path:
          field.metadata?.mediaUpload?.path ||
          `media-library/form-input/${uploadType}`,
      });

      const uploadedUrl = uploadedItems[0]?.url;
      if (!uploadedUrl) {
        throw new Error('Upload failed');
      }

      formField.onChange(uploadedUrl);
      toast.success(
        field.metadata?.mediaUpload?.successMessage || 'Upload completed',
      );
    } catch (error: any) {
      toast.error(error?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    }
  }

  return (
    <div className="space-y-3">
      {pickerType ? (
        <MediaAssetPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          mediaType={pickerType}
          onSelect={(asset) => {
            formField.onChange(asset.url);
          }}
        />
      ) : null}

      {uploadType ? (
        <input
          ref={uploadInputRef}
          type="file"
          accept={field.metadata?.mediaUpload?.accept || `${uploadType}/*`}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }

            void handleUpload(file);
          }}
        />
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <InputComponent
          value={formField.value as string}
          onChange={formField.onChange}
          type={field.type || 'text'}
          placeholder={field.placeholder}
          className="bg-background placeholder:text-base-content/50 rounded-md"
          {...field.attributes}
        />
        {pickerType ? (
          <Button
            type="button"
            variant="outline"
            className="sm:w-auto"
            onClick={() => setPickerOpen(true)}
          >
            <FolderOpen className="size-4" />
            {field.metadata?.mediaLibraryPicker?.buttonText || 'Choose from Library'}
          </Button>
        ) : null}
        {uploadType ? (
          <Button
            type="button"
            variant="outline"
            className="sm:w-auto"
            disabled={isUploading}
            onClick={() => uploadInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {field.metadata?.mediaUpload?.buttonText || 'Upload File'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
