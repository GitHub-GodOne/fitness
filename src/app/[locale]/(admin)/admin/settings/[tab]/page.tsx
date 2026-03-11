import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requireAllPermissions } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { getConfigs, saveConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/models/user';
import {
  getSettingGroups,
  getSettings,
  getSettingTabs,
} from '@/shared/services/settings';
import { Crumb } from '@/shared/types/blocks/common';
import { Form as FormType } from '@/shared/types/blocks/form';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string; tab: string }>;
}) {
  const { locale, tab } = await params;
  setRequestLocale(locale);

  // Check if user has permission to read settings
  await requireAllPermissions({
    codes: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const configs = await getConfigs();

  const settingGroups = await getSettingGroups();
  const settings = await getSettings();

  const t = await getTranslations('admin.settings');

  const crumbs: Crumb[] = [
    { title: t('edit.crumbs.admin'), url: '/admin' },
    { title: t('edit.crumbs.settings'), is_active: true },
  ];

  const tabs = await getSettingTabs(tab ?? 'auth');

  const handleSubmit = async (data: FormData, passby: any) => {
    'use server';

    const user = await getUserInfo();

    if (!user) {
      throw new Error('no auth');
    }

    data.forEach((value, name) => {
      configs[name] = value as string;
    });

    await saveConfigs(configs);

    return {
      status: 'success',
      message: 'Settings updated',
    };
  };

  let forms: FormType[] = [];

  if (tab === 'comfly') {
    const comflyGroup = settingGroups.find((group) => group.name === 'comfly');
    const comflySettings = settings.filter((setting) => setting.group === 'comfly');
    const promptSettingNames = new Set([
      'comfly_image_edit_prompt',
      'comfly_default_video_prompt',
      'comfly_script_system_prompt',
    ]);

    if (comflyGroup) {
      comflySettings.forEach((setting) => {
        if (!promptSettingNames.has(setting.name)) {
          return;
        }

        forms.push({
          title: setting.title,
          description: setting.tip || comflyGroup.description,
          fields: [
            {
              name: setting.name,
              title: setting.title,
              type: setting.type as any,
              placeholder: setting.placeholder,
              group: setting.group,
              options: setting.options,
              tip: setting.tip,
              value: setting.value,
              attributes: setting.attributes,
              metadata: setting.metadata,
            },
          ],
          passby: {
            provider: comflyGroup.name,
            tab: comflyGroup.tab,
          },
          data: configs,
          submit: {
            button: {
              title: t('edit.buttons.submit'),
            },
            handler: handleSubmit as any,
          },
        });
      });

      const ttsSettingNames = new Set(['comfly_tts_voice', 'comfly_tts_speed']);
      const mergeSettingNames = new Set([
        'comfly_merge_bgm_url',
        'comfly_merge_bgm_volume',
        'comfly_merge_voice_volume',
        'comfly_merge_max_words_per_line',
        'comfly_merge_long_token_dur_s',
      ]);

      const ttsSettings = comflySettings
        .filter((setting) => ttsSettingNames.has(setting.name))
        .map((setting) => ({
          name: setting.name,
          title: setting.title,
          type: setting.type as any,
          placeholder: setting.placeholder,
          group: setting.group,
          options: setting.options,
          tip: setting.tip,
          value: setting.value,
          attributes: setting.attributes,
          metadata: setting.metadata,
        }));

      if (ttsSettings.length > 0) {
        forms.push({
          title: 'Comfly TTS Settings',
          description:
            'Configure the default TTS voice file and speech speed used by Comfly.',
          fields: ttsSettings,
          passby: {
            provider: comflyGroup.name,
            tab: comflyGroup.tab,
            formTestActions: [
              {
                provider: 'comfly',
                promptType: 'audio',
                execute: true,
                title: 'Test Audio Generation',
                description:
                  'Sends a real backend TTS request and returns the generated audio URL.',
                sampleInput:
                  'Breathe slowly. You are not alone tonight. God is still near.',
                textLabel: 'Narration text',
                voiceLabel: 'Voice file',
                speedLabel: 'Speech speed',
              },
            ],
          },
          data: configs,
          submit: {
            button: {
              title: t('edit.buttons.submit'),
            },
            handler: handleSubmit as any,
          },
        });
      }

      const mergeSettings = comflySettings
        .filter((setting) => mergeSettingNames.has(setting.name))
        .map((setting) => ({
          name: setting.name,
          title: setting.title,
          type: setting.type as any,
          placeholder: setting.placeholder,
          group: setting.group,
          options: setting.options,
          tip: setting.tip,
          value: setting.value,
          attributes: setting.attributes,
          metadata: setting.metadata,
        }));

      if (mergeSettings.length > 0) {
        forms.push({
          title: 'Comfly Video Merge Settings',
          description:
            'Configure the default subtitle and audio mix parameters used by Comfly video merge.',
          fields: mergeSettings,
          passby: {
            provider: comflyGroup.name,
            tab: comflyGroup.tab,
            formTestActions: [
              {
                provider: 'comfly',
                promptType: 'merge_video',
                execute: true,
                title: 'Test Video Merge',
                description:
                  'Sends a real backend video merge request using a video URL, audio URL, and subtitle text.',
                sampleInput:
                  'Fear not, for I am with you... do not be dismayed, for I am your God.',
                textLabel: 'Subtitle text',
                requiresVideo: true,
                requiresAudio: true,
                videoLabel: 'Source video URL',
                audioLabel: 'Source audio URL',
                titleLabel: 'Overlay title',
                bgmUrlLabel: 'BGM URL',
                bgmVolumeLabel: 'BGM volume',
                voiceVolumeLabel: 'Voice volume',
                maxWordsLabel: 'Max words per line',
                longTokenDurLabel: 'Long token duration (s)',
              },
            ],
          },
          data: configs,
          submit: {
            button: {
              title: t('edit.buttons.submit'),
            },
            handler: handleSubmit as any,
          },
        });
      }
    }
  } else {
    settingGroups.forEach((group) => {
      if (group.tab !== tab) {
        return;
      }

      forms.push({
        title: group.title,
        description: group.description,
        fields: settings
          .filter((setting) => setting.group === group.name)
          .map((setting) => ({
            name: setting.name,
            title: setting.title,
            type: setting.type as any,
            placeholder: setting.placeholder,
            group: setting.group,
            options: setting.options,
            tip: setting.tip,
            value: setting.value,
            attributes: setting.attributes,
            metadata: setting.metadata,
          })),
        passby: {
          provider: group.name,
          tab: group.tab,
        },
        data: configs,
        submit: {
          button: {
            title: t('edit.buttons.submit'),
          },
          handler: handleSubmit as any,
        },
      });
    });
  }

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('edit.title')} tabs={tabs} />
        {forms.map((form) => (
          <FormCard
            key={form.title}
            title={form.title}
            description={form.description}
            form={form}
            className={tab === 'comfly' ? 'mb-8 w-full' : 'mb-8 md:max-w-xl'}
            defaultCollapsed={false}
            collapsible={true}
          />
        ))}
      </Main>
    </>
  );
}
