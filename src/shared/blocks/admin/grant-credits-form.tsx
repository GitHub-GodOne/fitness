'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Search, User as UserIcon, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/shared/components/ui/avatar';
import { cn } from '@/shared/lib/utils';

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface GrantCreditsFormProps {
  className?: string;
}

/**
 * Debounce hook for performance optimization
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Admin component to grant credits to users
 * Features:
 * - User search with debounce (300ms)
 * - Mobile responsive
 * - Robust error handling
 * - Performance optimized
 */
export function GrantCreditsForm({ className }: GrantCreditsFormProps) {
  const t = useTranslations('admin.credits.grant_form');

  // Form state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<string>('');
  const [validDays, setValidDays] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // User search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search query (300ms delay for performance)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Search users when debounced query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!debouncedSearchQuery.trim()) {
        setSearchResults([]);
        setShowResults(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const response = await fetch(
          `/api/admin/users/search?q=${encodeURIComponent(debouncedSearchQuery)}&limit=10`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Search failed' }));
          throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        
        if (result.code === 0 && Array.isArray(result.data)) {
          setSearchResults(result.data);
          setShowResults(true);
        } else {
          throw new Error(result.message || 'Invalid response format');
        }
      } catch (error: any) {
        console.error('[GrantCreditsForm] Search error:', error);
        setSearchError(error.message || t('errors.search_failed'));
        setSearchResults([]);
        setShowResults(false);
      } finally {
        setIsSearching(false);
      }
    };

    searchUsers();
  }, [debouncedSearchQuery, t]);

  // Handle user selection
  const handleSelectUser = useCallback((user: User) => {
    setSelectedUser(user);
    setSearchQuery(user.email);
    setShowResults(false);
    setSearchResults([]);
    setSearchError(null);
  }, []);

  // Handle clear user selection
  const handleClearUser = useCallback(() => {
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setSearchError(null);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedUser) {
      toast.error(t('errors.user_required'));
      return;
    }

    const creditsNum = parseInt(credits, 10);
    if (!credits || isNaN(creditsNum) || creditsNum <= 0) {
      toast.error(t('errors.credits_invalid'));
      return;
    }

    const validDaysNum = validDays ? parseInt(validDays, 10) : 0;
    if (validDays && (isNaN(validDaysNum) || validDaysNum < 0)) {
      toast.error(t('errors.valid_days_invalid'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/credits/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          credits: creditsNum,
          validDays: validDaysNum > 0 ? validDaysNum : undefined,
          description: description.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }

      if (result.code === 0) {
        toast.success(t('success.granted', { 
          email: selectedUser.email, 
          credits: creditsNum 
        }));

        // Reset form
        handleClearUser();
        setCredits('');
        setValidDays('');
        setDescription('');

        // Refresh page after 1 second to show new credit record
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        throw new Error(result.message || 'Grant failed');
      }
    } catch (error: any) {
      console.error('[GrantCreditsForm] Submit error:', error);
      toast.error(error.message || t('errors.grant_failed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedUser, credits, validDays, description, t, handleClearUser]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-user-search]')) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-lg sm:text-xl">{t('title')}</CardTitle>
        <CardDescription className="text-sm">{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* User Search */}
          <div className="space-y-2" data-user-search>
            <Label htmlFor="user-search" className="text-sm font-medium">
              {t('fields.user.label')} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="user-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedUser(null);
                    if (e.target.value.trim()) {
                      setShowResults(true);
                    }
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowResults(true);
                    }
                  }}
                  placeholder={t('fields.user.placeholder')}
                  className="pl-9 pr-9"
                  disabled={isSubmitting}
                />
                {selectedUser && (
                  <button
                    type="button"
                    onClick={handleClearUser}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showResults && (isSearching || searchResults.length > 0 || searchError) && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-auto">
                  {isSearching ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">{t('searching')}</span>
                    </div>
                  ) : searchError ? (
                    <div className="p-4 text-sm text-destructive">{searchError}</div>
                  ) : searchResults.length > 0 ? (
                    <div className="p-1">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image || ''} alt={user.name || ''} />
                            <AvatarFallback>
                              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col items-start min-w-0 flex-1">
                            <span className="font-medium truncate w-full">{user.name || t('fields.user.no_name')}</span>
                            <span className="text-xs text-muted-foreground truncate w-full">{user.email}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      {t('no_users_found')}
                    </div>
                  )}
                </div>
              )}

              {/* Selected User Display */}
              {selectedUser && (
                <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/50 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedUser.image || ''} alt={selectedUser.name || ''} />
                    <AvatarFallback>
                      {selectedUser.name?.charAt(0) || selectedUser.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {selectedUser.name || t('fields.user.no_name')}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {selectedUser.email}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Credits Amount */}
          <div className="space-y-2">
            <Label htmlFor="credits" className="text-sm font-medium">
              {t('fields.credits.label')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="credits"
              type="number"
              min="1"
              step="1"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              placeholder={t('fields.credits.placeholder')}
              required
              disabled={isSubmitting}
              className="w-full"
            />
          </div>

          {/* Valid Days */}
          <div className="space-y-2">
            <Label htmlFor="valid-days" className="text-sm font-medium">
              {t('fields.valid_days.label')}
            </Label>
            <Input
              id="valid-days"
              type="number"
              min="0"
              step="1"
              value={validDays}
              onChange={(e) => setValidDays(e.target.value)}
              placeholder={t('fields.valid_days.placeholder')}
              disabled={isSubmitting}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">{t('fields.valid_days.tip')}</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              {t('fields.description.label')}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('fields.description.placeholder')}
              rows={3}
              disabled={isSubmitting}
              className="w-full resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!selectedUser || isSubmitting || !credits}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('submitting')}
              </>
            ) : (
              <>
                {t('submit')}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
