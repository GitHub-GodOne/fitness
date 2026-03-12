'use client';

import { isArray } from 'util';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useRouter } from '@/core/i18n/navigation';
import { SmartIcon } from '@/shared/blocks/common/smart-icon';
import { Button } from '@/shared/components/ui/button';
import {
  Form as FormComponent,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  FormField as FormFieldType,
  FormSubmit,
} from '@/shared/types/blocks/form';

import { Checkbox } from './checkbox';
import { Input } from './input';
import { Markdown } from './markdown';
import { PromptTestAction } from './prompt-test-action';
import { Select } from './select';
import { Switch } from './switch';
import { UploadImage } from './upload-image';

function buildFieldSchema(field: FormFieldType) {
  if (field.type === 'switch') {
    return z.boolean();
  }

  if (field.type === 'number') {
    // Accept both number (from initial data) and string (from input onChange)
    let schema = z.union([z.number(), z.string()]);

    if (field.validation?.required) {
      schema = schema.refine(
        (val) => {
          if (val === null || val === undefined || val === '') {
            return false;
          }
          return true;
        },
        {
          message: field.validation.message || `${field.title} is required`,
        }
      );
    }

    // Validate that the value can be converted to a valid number
    schema = schema.refine(
      (val) => {
        const num = typeof val === 'number' ? val : Number(val);
        return !isNaN(num) && isFinite(num);
      },
      {
        message:
          field.validation?.message || `${field.title} must be a valid number`,
      }
    );

    // Apply min validation if specified
    if (field.validation?.min !== undefined) {
      schema = schema.refine(
        (val) => {
          const num = typeof val === 'number' ? val : Number(val);
          return num >= field.validation!.min!;
        },
        {
          message:
            field.validation?.message ||
            `${field.title} must be at least ${field.validation.min}`,
        }
      );
    }

    // Apply max validation if specified
    if (field.validation?.max !== undefined) {
      schema = schema.refine(
        (val) => {
          const num = typeof val === 'number' ? val : Number(val);
          return num <= field.validation!.max!;
        },
        {
          message:
            field.validation?.message ||
            `${field.title} must be at most ${field.validation.max}`,
        }
      );
    }

    return schema;
  }

  if (
    field.type === 'upload_image' &&
    field.metadata?.max &&
    field.metadata.max > 1
  ) {
    let arraySchema = z.array(z.string());

    if (field.validation?.required) {
      arraySchema = arraySchema.min(1, {
        message: field.validation.message || `${field.title} is required`,
      });
    }

    return arraySchema;
  }

  if (field.type === 'checkbox') {
    let schema = z.array(z.string());

    return schema;
  }

  if (field.type === 'upload_image') {
    let schema = z.string();

    if (field.validation?.required) {
      schema = schema.min(1, {
        message: field.validation.message || `${field.title} is required`,
      });
    }

    return schema;
  }

  let schema = z.string();

  if (field.validation?.required) {
    schema = schema.min(1, {
      message: field.validation.message || `${field.title} is required`,
    });
  }

  if (field.validation?.min) {
    schema = schema.min(field.validation.min, {
      message:
        field.validation.message ||
        `${field.title} must be at least ${field.validation.min} characters`,
    });
  }

  if (field.validation?.max) {
    schema = schema.max(field.validation.max, {
      message:
        field.validation.message ||
        `${field.title} must be at most ${field.validation.max} characters`,
    });
  }

  if (field.validation?.email) {
    schema = schema.email({
      message:
        field.validation.message || `${field.title} must be a valid email`,
    });
  }

  return schema;
}

const generateFormSchema = (fields: FormFieldType[]) => {
  const schemaFields: Record<string, any> = {};

  fields.forEach((field) => {
    if (field.name) {
      schemaFields[field.name] = buildFieldSchema(field);
    }
  });

  return z.object(schemaFields);
};

export function Form({
  title,
  description,
  fields,
  data,
  passby,
  submit,
}: {
  title?: string;
  description?: string;
  fields?: FormFieldType[];
  data?: any;
  passby?: any;
  submit?: FormSubmit;
}) {
  if (!fields) {
    fields = [];
  }

  const [loading, setLoading] = useState(false);
  const [mobileTestingOpen, setMobileTestingOpen] = useState<
    Record<string, boolean>
  >({});
  const [testResults, setTestResults] = useState<
    Record<string, { title: string; data: any } | null>
  >({});
  const isComflySettingsTab = passby?.tab === 'comfly';
  const formLevelTestActions = Array.isArray(passby?.formTestActions)
    ? passby.formTestActions
    : [];

  const router = useRouter();
  const FormSchema = generateFormSchema(fields);
  const defaultValues: Record<string, any> = {};

  fields.forEach((field) => {
    if (field.name) {
      if (field.type === 'switch') {
        const val = data?.[field.name] ?? field.value;
        defaultValues[field.name] =
          val === true || val === 'true' || val === 1 || val === '1';
      } else if (
        field.type === 'upload_image' &&
        field.metadata?.max &&
        field.metadata.max > 1
      ) {
        // Multiple image upload: default value is an array
        const val = data?.[field.name] ?? field.value;
        if (typeof val === 'string' && val) {
          // If it's a comma-separated string, convert to array
          defaultValues[field.name] = val.split(',').filter(Boolean);
        } else if (Array.isArray(val)) {
          defaultValues[field.name] = val;
        } else {
          defaultValues[field.name] = [];
        }
      } else if (field.type === 'checkbox') {
        const val = data?.[field.name] ?? field.value;
        if (typeof val === 'string' && val) {
          try {
            const parsed = JSON.parse(val);
            defaultValues[field.name] = Array.isArray(parsed) ? parsed : [];
          } catch {
            defaultValues[field.name] = [];
          }
        } else if (Array.isArray(val)) {
          defaultValues[field.name] = val;
        } else {
          defaultValues[field.name] = [];
        }
      } else if (field.type === 'number') {
        // Convert number to string for input fields (HTML inputs always return strings)
        const val = data?.[field.name] ?? field.value;
        defaultValues[field.name] =
          val !== null && val !== undefined ? String(val) : '';
      } else {
        defaultValues[field.name] = data?.[field.name] || field.value || '';
      }
    }
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues,
  });

  const isTestingOpen = (key: string) => mobileTestingOpen[key] === true;
  const setTestResult = (key: string, result: { title: string; data: any } | null) => {
    setTestResults((prev) => ({
      ...prev,
      [key]: result,
    }));
  };

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    // console.log('=== Form Submit Start ===');
    // console.log('[Form Submit] Raw form data:', data);

    // Check upload_image field
    fields?.forEach((field) => {
      if (field.type === 'upload_image' && field.name) {
        // console.log(`[Form Submit] Upload field "${field.name}":`, {
        //   value: data[field.name],
        //   type: typeof data[field.name],
        //   isArray: Array.isArray(data[field.name]),
        //   metadata: field.metadata,
        // });
      }
    });

    if (!submit?.handler) return;

    try {
      const formData = new FormData();

      Object.entries(data).forEach(([key, value]) => {
        console.log('checkbox value', key, typeof value);
        // If it's an array, join with commas
        if (Array.isArray(value)) {
          // const joinedValue = value.join(",");
          // console.log(`[Form Submit] ${key} (array):`, value, "→", joinedValue);
          // formData.append(key, joinedValue);
          formData.append(key, JSON.stringify(value));
        } else {
          // console.log(`[Form Submit] ${key}:`, value);
          // Preserve boolean and other types' original values
          formData.append(key, String(value));
        }
      });

      setLoading(true);
      const res = await submit.handler(formData, passby);

      if (!res) {
        throw new Error('No response received from server');
      }

      if (res.message) {
        if (res.status === 'success') {
          toast.success(res.message);
        } else {
          toast.error(res.message);
        }
      }

      if (res.redirect_url) {
        router.push(res.redirect_url as any);
      } else {
        router.refresh();
      }

      setLoading(false);
    } catch (err: any) {
      console.log('submit form error', err);
      toast.error(err.message || 'submit form failed');
      setLoading(false);
    }
  }

  return (
    <FormComponent {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={
          isComflySettingsTab
            ? 'w-full space-y-0 pb-2'
            : 'w-full space-y-0 pb-2 md:max-w-xl'
        }
      >
        {/* {title && <h2 className="text-lg font-bold">{title}</h2>}
        {description && <p className="text-muted-foreground">{description}</p>} */}
        <div
          className={
            isComflySettingsTab && formLevelTestActions.length > 0
              ? 'mb-6 grid gap-6 xl:grid-cols-2 xl:items-stretch'
              : 'mb-6 space-y-6'
          }
        >
          {isComflySettingsTab && formLevelTestActions.length > 0 ? (
            <div className="h-full rounded-2xl border bg-muted/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">Testing</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 lg:hidden"
                  onClick={() =>
                    setMobileTestingOpen((prev) => ({
                      ...prev,
                      form: !prev.form,
                    }))
                  }
                >
                  {isTestingOpen('form') ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </Button>
              </div>
              <div
                className={
                  isTestingOpen('form')
                    ? 'mt-3 space-y-3'
                    : 'mt-3 hidden space-y-3 lg:block'
                }
              >
                {formLevelTestActions.map((action: any, index: number) => (
                  <PromptTestAction
                    key={`form-test-action-${index}`}
                    config={action}
                    getValues={() => form.getValues()}
                    updateValue={(name, value) =>
                      form.setValue(name as any, value, {
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    onResultChange={(result) =>
                      setTestResult(`form-test-action-${index}`, result)
                    }
                    showInlineResult={false}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div
            className={
              isComflySettingsTab && formLevelTestActions.length > 0
                ? 'flex h-full flex-col space-y-6 rounded-2xl border bg-background p-4'
                : 'space-y-6'
            }
          >
          {fields.map((item, index) => {
            const hasTestPanel =
              Boolean(item.metadata?.testAction) ||
              (Array.isArray(item.metadata?.testActions) &&
                item.metadata.testActions.length > 0);
            const fieldResultKey = `${item.name || `field-${index}`}-primary`;
            const renderFieldInput = (field: any) => {
              if (item.type === 'textarea') {
                return (
                  <Textarea
                    {...(field as any)}
                    placeholder={item.placeholder}
                    className={
                      isComflySettingsTab && hasTestPanel
                        ? 'min-h-[320px] flex-1 resize-y'
                        : undefined
                    }
                    {...item.attributes}
                  />
                );
              }

              if (item.type === 'select') {
                return <Select field={item} formField={field} data={data} />;
              }

              if (item.type === 'switch') {
                return <Switch field={item} formField={field} data={data} />;
              }

              if (item.type === 'checkbox') {
                return <Checkbox field={item} formField={field} data={data} />;
              }

              if (item.type === 'markdown_editor') {
                return <Markdown field={item} formField={field} data={data} />;
              }

              if (item.type === 'upload_image') {
                return (
                  <UploadImage
                    field={item}
                    formField={field}
                    data={data}
                    metadata={item.metadata}
                  />
                );
              }

              return <Input field={item} formField={field} data={data} />;
            };

            const renderTestPanels = () => (
              <>
                {item.metadata?.testAction ? (
                  <PromptTestAction
                    config={item.metadata.testAction}
                    getValues={() => form.getValues()}
                    updateValue={(name, value) =>
                      form.setValue(name as any, value, {
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    onResultChange={(result) => setTestResult(fieldResultKey, result)}
                    showInlineResult={false}
                  />
                ) : null}
                {Array.isArray(item.metadata?.testActions)
                  ? item.metadata.testActions.map((action: any, index: number) => (
                      <PromptTestAction
                        key={`${item.name}-test-action-${index}`}
                        config={action}
                        getValues={() => form.getValues()}
                        updateValue={(name, value) =>
                          form.setValue(name as any, value, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }
                        onResultChange={(result) =>
                          setTestResult(`${item.name}-test-action-${index}`, result)
                        }
                        showInlineResult={false}
                      />
                    ))
                  : null}
              </>
            );

            return (
              <FormField
                key={index}
                control={form.control}
                name={item.name || ''}
                render={({ field }) => (
                  <FormItem className={isComflySettingsTab && hasTestPanel ? 'h-full' : ''}>
                    <div className="space-y-4">
                      <div
                        className={
                          isComflySettingsTab && hasTestPanel
                            ? 'grid gap-6 xl:grid-cols-2 xl:items-stretch'
                          : 'space-y-3'
                        }
                      >
                      {hasTestPanel ? (
                        <div className="h-full rounded-2xl border bg-muted/10 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-medium">Testing</div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="shrink-0 lg:hidden"
                              onClick={() =>
                                setMobileTestingOpen((prev) => ({
                                  ...prev,
                                  [item.name || `field-${index}`]:
                                    !prev[item.name || `field-${index}`],
                                }))
                              }
                            >
                              {isTestingOpen(item.name || `field-${index}`) ? (
                                <ChevronUp className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </Button>
                          </div>
                          <div
                            className={
                              isTestingOpen(item.name || `field-${index}`)
                                ? 'mt-3 space-y-3'
                                : 'mt-3 hidden space-y-3 lg:block'
                            }
                          >
                            {renderTestPanels()}
                          </div>
                        </div>
                      ) : null}

                      <div
                        className={
                          isComflySettingsTab && hasTestPanel
                            ? 'flex h-full flex-col space-y-3 rounded-2xl border bg-background p-4'
                            : 'space-y-3'
                        }
                      >
                        <FormLabel>
                          {item.title}
                          {item.validation?.required && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </FormLabel>
                        <FormControl
                          className={
                            isComflySettingsTab && hasTestPanel ? 'flex-1' : ''
                          }
                        >
                          {renderFieldInput(field)}
                        </FormControl>
                        {item.tip && (
                          <FormDescription
                            dangerouslySetInnerHTML={{ __html: item.tip }}
                          />
                        )}
                      </div>
                      </div>
                      {isComflySettingsTab && hasTestPanel ? (
                        <>
                          {testResults[fieldResultKey] ? (
                            <div className="rounded-2xl border bg-background p-4">
                              <div className="mb-2 text-sm font-medium">
                                {testResults[fieldResultKey]?.title} Result
                              </div>
                              <pre className="overflow-x-auto rounded-xl border bg-muted/20 p-3 text-xs leading-6">
                                {JSON.stringify(testResults[fieldResultKey]?.data, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                          {Array.isArray(item.metadata?.testActions)
                            ? item.metadata.testActions.map((action: any, actionIndex: number) => {
                                const resultKey = `${item.name}-test-action-${actionIndex}`;
                                const result = testResults[resultKey];

                                if (!result) {
                                  return null;
                                }

                                return (
                                  <div
                                    key={`${resultKey}-panel`}
                                    className="rounded-2xl border bg-background p-4"
                                  >
                                    <div className="mb-2 text-sm font-medium">
                                      {result.title} Result
                                    </div>
                                    <pre className="overflow-x-auto rounded-xl border bg-muted/20 p-3 text-xs leading-6">
                                      {JSON.stringify(result.data, null, 2)}
                                    </pre>
                                  </div>
                                );
                              })
                            : null}
                        </>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}
          </div>
          {isComflySettingsTab && formLevelTestActions.length > 0
            ? formLevelTestActions.map((action: any, index: number) => {
                const result = testResults[`form-test-action-${index}`];

                if (!result) {
                  return null;
                }

                return (
                  <div
                    key={`form-test-action-${index}-result`}
                    className="rounded-2xl border bg-background p-4 xl:col-span-2"
                  >
                    <div className="mb-2 text-sm font-medium">
                      {result.title} Result
                    </div>
                    <pre className="overflow-x-auto rounded-xl border bg-muted/20 p-3 text-xs leading-6">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                );
              })
            : null}
        </div>
        {submit?.button && (
          <div className={isComflySettingsTab ? 'flex justify-end' : ''}>
            <Button
              type="submit"
              variant={submit.button.variant}
              className="flex cursor-pointer items-center justify-center gap-2 font-semibold whitespace-normal"
              disabled={loading}
              size={submit.button.size || 'sm'}
            >
              {loading ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                submit.button.icon && (
                  <SmartIcon
                    name={submit.button.icon as string}
                    className="size-4"
                  />
                )
              )}
              {submit.button.title}
            </Button>
          </div>
        )}
      </form>
    </FormComponent>
  );
}

export * from './form-card';
