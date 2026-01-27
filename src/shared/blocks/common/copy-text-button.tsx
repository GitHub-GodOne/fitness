'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface CopyTextButtonProps {
  text: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm';
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'link';
  disabled?: boolean;
  showText?: boolean; // Whether to show text label
}

/**
 * Reusable Copy Text Button Component
 * Features:
 * - Copy text to clipboard
 * - Success/error toast notifications
 * - Mobile responsive
 * - Internationalization support
 * - Performance optimized with useCallback
 * 
 * @param text - The text to copy
 * @param className - Additional CSS classes
 * @param size - Button size
 * @param variant - Button variant
 * @param disabled - Whether button is disabled
 * @param showText - Whether to show text label (default: false, icon only)
 */
export function CopyTextButton({
  text,
  className,
  size = 'icon',
  variant = 'ghost',
  disabled = false,
  showText = false,
}: CopyTextButtonProps) {
  const t = useTranslations('components.copy');
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!text || text.trim() === '') {
      toast.error(t('errors.no_text'));
      return;
    }

    try {
      // Try modern Clipboard API first (better UX)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast.success(t('success.copied'));
        
        // Reset copied state after 2 seconds
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
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
      console.error('[CopyTextButton] Copy failed:', error);
      toast.error(t('errors.copy_failed'));
    }
  }, [text, t]);

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleCopy}
      disabled={disabled || !text || text.trim() === ''}
      className={cn('transition-all', className)}
      title={t('tooltip')}
    >
      {isCopied ? (
        <>
          <Check className="h-4 w-4" />
          {showText && <span className="ml-1">{t('copied')}</span>}
          <span className="sr-only">{t('copied')}</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          {showText && <span className="ml-1">{t('copy')}</span>}
          <span className="sr-only">{t('copy')}</span>
        </>
      )}
    </Button>
  );
}
