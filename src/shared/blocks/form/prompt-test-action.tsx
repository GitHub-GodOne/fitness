'use client';

import { useRef, useState } from 'react';
import { AudioLines, FolderOpen, Loader, PlayCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { MediaAssetPickerDialog } from '@/shared/blocks/admin/media-asset-picker-dialog';
import { ImageUploader } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';

type PromptTestActionConfig = {
  provider: 'comfly';
  promptType: 'image_edit' | 'video' | 'script' | 'audio' | 'merge_video';
  execute?: boolean;
  title?: string;
  description?: string;
  sampleInput?: string;
  requiresImage?: boolean;
  requiresVideo?: boolean;
  requiresAudio?: boolean;
  textLabel?: string;
  imageLabel?: string;
  videoLabel?: string;
  audioLabel?: string;
  titleLabel?: string;
  voiceLabel?: string;
  speedLabel?: string;
  bgmUrlLabel?: string;
  bgmVolumeLabel?: string;
  voiceVolumeLabel?: string;
  maxWordsLabel?: string;
  longTokenDurLabel?: string;
};

export function PromptTestAction({
  config,
  getValues,
  updateValue,
  onResultChange,
  showInlineResult = true,
}: {
  config: PromptTestActionConfig;
  getValues: () => Record<string, any>;
  updateValue?: (name: string, value: string) => void;
  onResultChange?: (result: { title: string; data: any } | null) => void;
  showInlineResult?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sampleInput, setSampleInput] = useState(
    config.sampleInput ||
      (config.promptType === 'script' ? 'I feel lonely and anxious tonight' : '')
  );
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [title, setTitle] = useState('');
  const [libraryType, setLibraryType] = useState<'image' | 'video' | 'audio' | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState<'video' | 'audio' | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  async function uploadMedia(file: File, mediaType: 'video' | 'audio') {
    const formData = new FormData();
    formData.append('files', file);
    formData.append('path', `media-library/comfly-tests/${mediaType}`);

    const response = await fetch('/api/admin/media-assets/upload', {
      method: 'POST',
      body: formData,
    });

    const payload = await response.json();
    if (!response.ok || payload.code !== 0) {
      throw new Error(payload.message || 'Upload failed');
    }

    const uploadedUrl = payload.data?.items?.[0]?.url;
    if (!uploadedUrl) {
      throw new Error('Upload failed');
    }

    return uploadedUrl as string;
  }

  async function handleTest() {
    try {
      setLoading(true);
      const values = getValues();
      const ttsVoice = String(values.comfly_tts_voice || 'output.wav');
      const ttsSpeed = String(values.comfly_tts_speed || '1');
      const bgmUrl = String(values.comfly_merge_bgm_url || '');
      const bgmVolume = String(values.comfly_merge_bgm_volume || '3');
      const voiceVolume = String(values.comfly_merge_voice_volume || '1.0');
      const maxWordsPerLine = String(
        values.comfly_merge_max_words_per_line || '20'
      );
      const longTokenDurS = String(
        values.comfly_merge_long_token_dur_s || '0.8'
      );
      const overrides = {
        comfly_image_edit_prompt: String(values.comfly_image_edit_prompt || ''),
        comfly_default_video_prompt: String(values.comfly_default_video_prompt || ''),
        comfly_script_system_prompt: String(values.comfly_script_system_prompt || ''),
        comfly_tts_voice: ttsVoice,
        comfly_tts_speed: ttsSpeed,
        comfly_merge_bgm_url: bgmUrl,
        comfly_merge_bgm_volume: bgmVolume,
        comfly_merge_voice_volume: voiceVolume,
        comfly_merge_max_words_per_line: maxWordsPerLine,
        comfly_merge_long_token_dur_s: longTokenDurS,
      };

      const response = await fetch('/api/admin/ai/comfly/test-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: config.promptType,
          input: config.promptType === 'image_edit' ? '' : sampleInput,
          imageUrl,
          videoUrl,
          audioUrl,
          title,
          voice: ttsVoice,
          speed: Number(ttsSpeed),
          bgmUrl,
          bgmVolume,
          voiceVolume,
          maxWordsPerLine,
          longTokenDurS,
          execute: config.execute === true,
          overrides,
        }),
      });

      const payload = await response.json();
      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || 'Prompt test failed');
      }

      setResult(payload.data);
      onResultChange?.({
        title: config.title || 'Prompt Test',
        data: payload.data,
      });
      toast.success('Prompt test completed');
    } catch (error: any) {
      onResultChange?.(null);
      toast.error(error?.message || 'Prompt test failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-0 space-y-3 rounded-2xl border border-dashed bg-muted/20 p-4">
      <div className="space-y-1">
        <div className="text-sm font-medium">
          {config.title || 'Prompt Test'}
        </div>
        {config.description ? (
          <p className="text-xs text-muted-foreground">{config.description}</p>
        ) : null}
      </div>

      {(config.promptType === 'script' ||
        config.promptType === 'audio' ||
        config.promptType === 'merge_video') ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {config.textLabel || 'Test input'}
          </div>
          <Textarea
            rows={3}
            value={sampleInput}
            onChange={(event) => setSampleInput(event.target.value)}
            placeholder="Describe the emotion you want to test"
          />
        </div>
      ) : null}

      {config.requiresImage ? (
        <div className="space-y-3">
          <MediaAssetPickerDialog
            open={libraryType === 'image'}
            onOpenChange={(open) => setLibraryType(open ? 'image' : null)}
            mediaType="image"
            onSelect={(asset) => setImageUrl(asset.url)}
          />
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {config.imageLabel || 'Test image'}
            </div>
            <ImageUploader
              allowMultiple={false}
              maxImages={1}
              defaultPreviews={imageUrl ? [imageUrl] : []}
              onChange={(items) => {
                const nextImageUrl =
                  items.find((item) => item.status === 'uploaded' && item.url)?.url || '';
                setImageUrl(nextImageUrl);
              }}
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Or paste image URL</div>
            <Input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://example.com/test-image.jpg"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setLibraryType('image')}
            className="h-auto w-full whitespace-normal rounded-full px-4 py-2 sm:w-auto"
          >
            <FolderOpen className="size-4" />
            Choose from Library
          </Button>
        </div>
      ) : null}

      {config.requiresVideo ? (
        <div className="space-y-3">
          <MediaAssetPickerDialog
            open={libraryType === 'video'}
            onOpenChange={(open) => setLibraryType(open ? 'video' : null)}
            mediaType="video"
            onSelect={(asset) => setVideoUrl(asset.url)}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              try {
                setUploadingMedia('video');
                const uploadedUrl = await uploadMedia(file, 'video');
                setVideoUrl(uploadedUrl);
                toast.success('Video uploaded');
              } catch (error: any) {
                toast.error(error?.message || 'Upload failed');
              } finally {
                setUploadingMedia(null);
                event.target.value = '';
              }
            }}
          />
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {config.videoLabel || 'Test video URL'}
            </div>
            <Input
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="https://example.com/test-video.mp4"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploadingMedia === 'video'}
              className="h-auto w-full whitespace-normal rounded-full px-4 py-2 sm:w-auto"
            >
              {uploadingMedia === 'video' ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload Video
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setLibraryType('video')}
              className="h-auto w-full whitespace-normal rounded-full px-4 py-2 sm:w-auto"
            >
              <FolderOpen className="size-4" />
              Choose Video from Library
            </Button>
          </div>
        </div>
      ) : null}

      {config.requiresAudio ? (
        <div className="space-y-3">
          <MediaAssetPickerDialog
            open={libraryType === 'audio'}
            onOpenChange={(open) => setLibraryType(open ? 'audio' : null)}
            mediaType="audio"
            onSelect={(asset) => setAudioUrl(asset.url)}
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              try {
                setUploadingMedia('audio');
                const uploadedUrl = await uploadMedia(file, 'audio');
                setAudioUrl(uploadedUrl);
                toast.success('Audio uploaded');
              } catch (error: any) {
                toast.error(error?.message || 'Upload failed');
              } finally {
                setUploadingMedia(null);
                event.target.value = '';
              }
            }}
          />
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {config.audioLabel || 'Test audio URL'}
            </div>
            <Input
              value={audioUrl}
              onChange={(event) => setAudioUrl(event.target.value)}
              placeholder="https://example.com/test-audio.wav"
            />
          </div>
          {audioUrl ? (
            <div className="rounded-xl border bg-background/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <AudioLines className="size-4" />
                Audio Preview
              </div>
              <audio controls className="w-full" src={audioUrl} preload="metadata" />
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => audioInputRef.current?.click()}
              disabled={uploadingMedia === 'audio'}
              className="h-auto w-full whitespace-normal rounded-full px-4 py-2 sm:w-auto"
            >
              {uploadingMedia === 'audio' ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload Audio
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setLibraryType('audio')}
              className="h-auto w-full whitespace-normal rounded-full px-4 py-2 sm:w-auto"
            >
              <FolderOpen className="size-4" />
              Choose Audio from Library
            </Button>
          </div>
        </div>
      ) : null}

      {config.promptType === 'audio' ? (
        <div className="rounded-xl border bg-background/70 p-3 text-xs text-muted-foreground">
          {`${config.voiceLabel || 'Voice file'} and ${config.speedLabel || 'Speech speed'} use the values from the settings form on the right.`}
        </div>
      ) : null}

      {config.promptType === 'merge_video' ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {config.titleLabel || 'Video title'}
            </div>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Isaiah 41:10"
            />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {config.bgmUrlLabel || 'BGM URL'}
            </div>
            <div className="rounded-xl border bg-background/70 p-3 text-xs text-muted-foreground">
              Uses the BGM URL configured in the settings form on the right.
            </div>
          </div>
          <div className="rounded-xl border bg-background/70 p-3 text-xs text-muted-foreground">
            {`${config.bgmVolumeLabel || 'BGM volume'}, ${config.voiceVolumeLabel || 'Voice volume'}, ${config.maxWordsLabel || 'Max words per line'}, and ${config.longTokenDurLabel || 'Long token duration (s)'} use the values from the settings form on the right.`}
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleTest}
        disabled={loading}
        className="h-auto w-full whitespace-normal rounded-full px-4 py-2 sm:w-auto"
      >
        {loading ? <Loader className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
        Test Prompt
      </Button>

      {showInlineResult && result ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Result</div>
          <pre className="overflow-x-auto rounded-xl border bg-background p-3 text-xs leading-6">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
