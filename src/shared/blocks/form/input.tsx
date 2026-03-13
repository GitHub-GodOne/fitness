import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { ControllerRenderProps } from 'react-hook-form';

import { MediaAssetPickerDialog } from '@/shared/blocks/admin/media-asset-picker-dialog';
import { Button } from '@/shared/components/ui/button';
import { Input as InputComponent } from '@/shared/components/ui/input';
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
  const pickerType = field.metadata?.mediaLibraryPicker?.mediaType as
    | 'image'
    | 'video'
    | undefined;

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
      </div>
    </div>
  );
}
