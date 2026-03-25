import { envConfigs } from '@/config';

export const revalidate = 3600;

export function GET() {
  const appUrl = envConfigs.app_url.replace(/\/$/, '');
  const appName = envConfigs.app_name || 'Fear Not';
  const description =
    envConfigs.app_description ||
    'Fear Not helps people create AI-generated Bible comfort videos, prayer videos, and faith-based showcase pages.';

  const content = [
    `# ${appName}`,
    '',
    `> ${description}`,
    '',
    '## Primary URLs',
    `- Home: ${appUrl}/`,
    `- Pricing: ${appUrl}/pricing`,
    `- Showcases: ${appUrl}/showcases`,
    `- Blog: ${appUrl}/blog`,
    `- Updates: ${appUrl}/updates`,
    `- AI Video Generator: ${appUrl}/ai-video-generator`,
    '',
    '## Content Focus',
    '- AI-generated Bible comfort videos',
    '- Christian prayer and scripture-based video experiences',
    '- Showcase video collections and watch pages',
    '- Pricing, updates, and blog content related to faith video creation',
    '',
    '## Publisher',
    `- Name: ${appName}`,
    `- URL: ${appUrl}`,
  ].join('\n');

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
