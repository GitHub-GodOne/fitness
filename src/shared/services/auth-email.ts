import { envConfigs } from '@/config';
import type { Configs } from '@/shared/models/config';
import { getEmailService } from '@/shared/services/email';

function isZhLocale(locale?: string | null) {
  return String(locale || '').toLowerCase().startsWith('zh');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendResetPasswordEmail({
  configs,
  user,
  url,
}: {
  configs: Configs;
  user: {
    email?: string | null;
    name?: string | null;
    locale?: string | null;
  };
  url: string;
}) {
  if (!user.email) {
    throw new Error('Reset password email requires a user email');
  }

  const useZh = isZhLocale(user.locale);
  const safeName = escapeHtml(user.name || (useZh ? '朋友' : 'there'));
  const appName = escapeHtml(envConfigs.app_name);
  const appUrl = envConfigs.app_url;

  const subject = useZh
    ? `${appName} 密码重置链接`
    : `${appName} password reset link`;

  const intro = useZh
    ? '我们收到了你的密码重置请求。如果这是你本人操作，请点击下面的按钮继续。'
    : 'We received a request to reset your password. If this was you, use the button below to continue.';

  const ignoreText = useZh
    ? '如果这不是你本人发起的请求，可以直接忽略这封邮件，你的账户不会受到影响。'
    : 'If you did not request this, you can safely ignore this email and your account will remain unchanged.';

  const buttonText = useZh ? '重置密码' : 'Reset password';
  const expiryText = useZh
    ? '该链接将在 1 小时后失效。'
    : 'This link expires in 1 hour.';

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
    <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(15,23,42,0.08);">
        <div style="padding:32px 28px;background:linear-gradient(135deg,#8b5e3c 0%,#c98a4d 100%);color:#ffffff;">
          <div style="font-size:28px;font-weight:700;line-height:1.2;">${subject}</div>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 16px;">${useZh ? '你好' : 'Hello'} ${safeName},</p>
          <p style="margin:0 0 16px;line-height:1.7;">${intro}</p>
          <div style="margin:28px 0;text-align:center;">
            <a href="${url}" style="display:inline-block;background:#1f2937;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:600;">
              ${buttonText}
            </a>
          </div>
          <p style="margin:0 0 12px;line-height:1.7;">${expiryText}</p>
          <p style="margin:0 0 12px;line-height:1.7;">${ignoreText}</p>
          <p style="margin:0;color:#6b7280;font-size:13px;word-break:break-all;">
            ${url}
          </p>
        </div>
        <div style="padding:20px 28px;border-top:1px solid #e5e7eb;background:#fafaf9;color:#6b7280;font-size:12px;">
          ${appName} · <a href="${appUrl}" style="color:#8b5e3c;text-decoration:none;">${appUrl}</a>
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim();

  const text = `
${subject}

${useZh ? '你好' : 'Hello'} ${user.name || (useZh ? '朋友' : 'there')},

${intro}

${buttonText}: ${url}

${expiryText}
${ignoreText}

${appName}
${appUrl}
  `.trim();

  const emailService = await getEmailService(configs);
  return emailService.sendEmail({
    to: user.email,
    subject,
    html,
    text,
  });
}
