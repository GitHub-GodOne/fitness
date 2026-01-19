'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Share2, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface ShareButtonProps {
  url: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm';
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link';
  disabled?: boolean;
}

/**
 * Reusable Share Button Component
 * Features:
 * - Copy URL to clipboard
 * - Success/error toast notifications
 * - Mobile responsive
 * - Internationalization support
 * - Performance optimized with useCallback
 * 
 * @param url - The URL to share/copy
 * @param className - Additional CSS classes
 * @param size - Button size
 * @param variant - Button variant
 * @param disabled - Whether button is disabled
 */
export function ShareButton({
  url,
  className,
  size = 'sm',
  variant = 'ghost',
  disabled = false,
}: ShareButtonProps) {
  const t = useTranslations('components.share');
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (!url || url.trim() === '') {
      toast.error(t('errors.no_url'));
      return;
    }

    try {
      // Try modern Clipboard API first (better UX)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setIsCopied(true);
        toast.success(t('success.copied'));
        
        // Reset copied state after 2 seconds
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setIsCopied(true);
            toast.success(t('success.copied'));
            setTimeout(() => {
              setIsCopied(false);
            }, 2000);
          } else {
            throw new Error('Copy command failed');
          }
        } catch (err) {
          throw new Error('Copy command not supported');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('[ShareButton] Copy failed:', error);
      toast.error(t('errors.copy_failed'));
    }
  }, [url, t]);

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleShare}
      disabled={disabled || !url || url.trim() === ''}
      className={cn('transition-all', className)}
      title={t('tooltip')}
    >
      {isCopied ? (
        <>
          <Check className="h-4 w-4 sm:h-4 sm:w-4" />
          <span className="sr-only">{t('copied')}</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4 sm:h-4 sm:w-4" />
          <span className="sr-only">{t('share')}</span>
        </>
      )}
    </Button>
  );
}
