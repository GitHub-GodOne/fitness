export const sansFontPresets = [
  {
    title: 'Noto Sans Mono',
    value: 'noto-sans-mono',
    stack: 'Noto Sans Mono, ui-sans-serif, sans-serif, system-ui',
  },
  {
    title: 'System Sans',
    value: 'system-sans',
    stack:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, system-ui',
  },
  {
    title: 'Arial',
    value: 'arial',
    stack: 'Arial, Helvetica, sans-serif',
  },
  {
    title: 'Helvetica',
    value: 'helvetica',
    stack: 'Helvetica, Arial, sans-serif',
  },
  {
    title: 'Verdana',
    value: 'verdana',
    stack: 'Verdana, Geneva, sans-serif',
  },
  {
    title: 'Tahoma',
    value: 'tahoma',
    stack: 'Tahoma, Geneva, sans-serif',
  },
  {
    title: 'Trebuchet MS',
    value: 'trebuchet-ms',
    stack: '"Trebuchet MS", Helvetica, sans-serif',
  },
] as const;

export const serifFontPresets = [
  {
    title: 'Merriweather',
    value: 'merriweather',
    stack: 'Merriweather, serif',
  },
  {
    title: 'Georgia',
    value: 'georgia',
    stack: 'Georgia, "Times New Roman", serif',
  },
  {
    title: 'Times New Roman',
    value: 'times-new-roman',
    stack: '"Times New Roman", Times, serif',
  },
  {
    title: 'Palatino',
    value: 'palatino',
    stack: '"Palatino Linotype", Palatino, serif',
  },
  {
    title: 'Garamond',
    value: 'garamond',
    stack: 'Garamond, Baskerville, serif',
  },
  {
    title: 'Book Antiqua',
    value: 'book-antiqua',
    stack: '"Book Antiqua", Palatino, serif',
  },
  {
    title: 'Cambria',
    value: 'cambria',
    stack: 'Cambria, Georgia, serif',
  },
] as const;

export const monoFontPresets = [
  {
    title: 'JetBrains Mono',
    value: 'jetbrains-mono',
    stack: 'JetBrains Mono, monospace',
  },
  {
    title: 'Noto Sans Mono',
    value: 'noto-sans-mono',
    stack: 'Noto Sans Mono, monospace',
  },
  {
    title: 'System Mono',
    value: 'system-mono',
    stack:
      'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  {
    title: 'Courier New',
    value: 'courier-new',
    stack: '"Courier New", Courier, monospace',
  },
  {
    title: 'Consolas',
    value: 'consolas',
    stack: 'Consolas, "Courier New", monospace',
  },
  {
    title: 'Menlo',
    value: 'menlo',
    stack: 'Menlo, Monaco, "Courier New", monospace',
  },
  {
    title: 'Monaco',
    value: 'monaco',
    stack: 'Monaco, Menlo, "Courier New", monospace',
  },
] as const;

export const defaultFontPresetValues = {
  sans: 'noto-sans-mono',
  serif: 'merriweather',
  mono: 'jetbrains-mono',
} as const;

export function resolveFontPresetStack(
  value: unknown,
  presets: readonly { value: string; stack: string }[],
  fallbackValue: string
) {
  if (typeof value !== 'string' || !value.trim()) {
    return presets.find((item) => item.value === fallbackValue)?.stack || presets[0].stack;
  }

  const matchedPreset = presets.find((item) => item.value === value);
  if (matchedPreset) {
    return matchedPreset.stack;
  }

  return value
    .replace(/[\n\r{};]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
