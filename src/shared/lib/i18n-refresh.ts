export const I18N_OVERRIDES_VERSION_KEY = 'i18n-overrides-version';
export const I18N_OVERRIDES_PENDING_KEY = 'i18n-overrides-pending';
export const I18N_OVERRIDES_UPDATED_EVENT = 'i18n-overrides-updated';

export function notifyI18nOverridesUpdated() {
  if (typeof window === 'undefined') {
    return;
  }

  const version = String(Date.now());
  localStorage.setItem(I18N_OVERRIDES_VERSION_KEY, version);
  sessionStorage.setItem(I18N_OVERRIDES_PENDING_KEY, version);
  window.dispatchEvent(new CustomEvent(I18N_OVERRIDES_UPDATED_EVENT, {
    detail: { version },
  }));
}
