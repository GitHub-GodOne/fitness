"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { Link, useRouter } from "@/core/i18n/navigation";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

type HtmlPageEditorState = {
  status?: "error" | "success";
  message?: string;
  redirectUrl?: string;
};

export function HtmlPageEditorForm({
  action,
  defaultLocale,
  localeOptions,
  initialValues,
  labels,
  cancelUrl,
  previewUrl,
  showMetadataFields = true,
}: {
  action: (
    state: HtmlPageEditorState,
    formData: FormData,
  ) => Promise<HtmlPageEditorState>;
  defaultLocale: string;
  localeOptions: { value: string; label: string }[];
  initialValues: {
    slug: string;
    locale: string;
    title: string;
    description: string;
    html: string;
  };
  labels: {
    locale: string;
    slug: string;
    title: string;
    description: string;
    html: string;
    uploadHtml: string;
    uploadHint: string;
    submit: string;
    back: string;
    preview: string;
    pathPreview: string;
  };
  cancelUrl: string;
  previewUrl?: string;
  showMetadataFields?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, {});
  const [pageLocale, setPageLocale] = useState(initialValues.locale);
  const [slug, setSlug] = useState(initialValues.slug);
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [html, setHtml] = useState(initialValues.html);

  useEffect(() => {
    if (state.redirectUrl) {
      router.push(state.redirectUrl);
    }
  }, [router, state.redirectUrl]);

  const localePrefix =
    pageLocale && pageLocale !== defaultLocale ? `/${pageLocale}` : "";
  const normalizedSlug = slug.trim().replace(/^\/+/, "");
  const previewPath = normalizedSlug
    ? `${localePrefix}/${normalizedSlug}`
    : `${localePrefix || "/"}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.submit}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetLocale">{labels.locale}</Label>
              <select
                id="targetLocale"
                name="targetLocale"
                value={pageLocale}
                onChange={(event) => setPageLocale(event.target.value)}
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                {localeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">{labels.slug}</Label>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="example-page"
                required
              />
              <p className="text-muted-foreground text-xs">
                {labels.pathPreview}: <span className="font-mono">{previewPath}</span>
              </p>
            </div>
          </div>

          {showMetadataFields ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">{labels.title}</Label>
                <Input
                  id="title"
                  name="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{labels.description}</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-24"
                />
              </div>
            </>
          ) : null}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label htmlFor="html">{labels.html}</Label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="file"
                  accept=".html,text/html"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    setHtml(await file.text());
                    event.target.value = "";
                  }}
                />
                <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2">
                  <Upload className="size-4" />
                  {labels.uploadHtml}
                </span>
              </label>
            </div>
            <p className="text-muted-foreground text-xs">{labels.uploadHint}</p>
            <Textarea
              id="html"
              name="html"
              value={html}
              onChange={(event) => setHtml(event.target.value)}
              className="min-h-[420px] font-mono text-sm"
              required
            />
          </div>

          {state.message ? (
            <div
              className={
                state.status === "error"
                  ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  : "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              }
            >
              {state.message}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {labels.submit}
            </Button>
            <Button asChild variant="outline">
              <Link href={cancelUrl}>{labels.back}</Link>
            </Button>
            {previewUrl ? (
              <Button asChild variant="outline">
                <a href={previewUrl} target="_blank" rel="noreferrer">
                  {labels.preview}
                </a>
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
