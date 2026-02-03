import { envConfigs } from '@/config';
import { defaultTheme } from '@/config/theme';

/**
 * get active theme
 */
export function getActiveTheme(): string {
  const theme = envConfigs.theme as string;

  if (theme) {
    return theme;
  }

  return defaultTheme;
}

/**
 * load theme page with retry mechanism
 */
export async function getThemePage(pageName: string, theme?: string) {
  const loadTheme = theme || getActiveTheme();
  const maxRetries = 3;

  // Helper function to attempt import with retries
  const attemptImport = async (themeName: string, retries: number = 0): Promise<any> => {
    try {
      const module = await import(`@/themes/${themeName}/pages/${pageName}`);
      return module.default;
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes('Failed to load chunk') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('ChunkLoadError') ||
        error?.message?.includes('Failed to fetch dynamically imported module');

      if (isChunkError && retries < maxRetries) {
        console.log(
          `[Theme] Chunk loading error for page "${pageName}", retry ${retries + 1}/${maxRetries}`
        );
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        return attemptImport(themeName, retries + 1);
      }

      throw error;
    }
  };

  try {
    // load theme page with retries
    return await attemptImport(loadTheme);
  } catch (error) {
    console.log(
      `Failed to load page "${pageName}" from theme "${loadTheme}":`,
      error
    );

    // fallback to default theme
    if (loadTheme !== defaultTheme) {
      try {
        return await attemptImport(defaultTheme);
      } catch (fallbackError) {
        console.error(`Failed to load fallback page:`, fallbackError);
        throw fallbackError;
      }
    }

    throw error;
  }
}

/**
 * load theme layout with retry mechanism
 */
export async function getThemeLayout(layoutName: string, theme?: string) {
  const loadTheme = theme || getActiveTheme();
  const maxRetries = 3;

  // Helper function to attempt import with retries
  const attemptImport = async (themeName: string, retries: number = 0): Promise<any> => {
    try {
      const module = await import(`@/themes/${themeName}/layouts/${layoutName}`);
      return module.default;
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes('Failed to load chunk') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('ChunkLoadError') ||
        error?.message?.includes('Failed to fetch dynamically imported module');

      if (isChunkError && retries < maxRetries) {
        console.log(
          `[Theme] Chunk loading error for layout "${layoutName}", retry ${retries + 1}/${maxRetries}`
        );
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        return attemptImport(themeName, retries + 1);
      }

      throw error;
    }
  };

  try {
    // load theme layout with retries
    return await attemptImport(loadTheme);
  } catch (error) {
    console.log(
      `Failed to load layout "${layoutName}" from theme "${loadTheme}":`,
      error
    );

    // fallback to default theme
    if (loadTheme !== defaultTheme) {
      try {
        return await attemptImport(defaultTheme);
      } catch (fallbackError) {
        console.error(`Failed to load fallback layout:`, fallbackError);
        throw fallbackError;
      }
    }

    throw error;
  }
}

/**
 * convert kebab-case to PascalCase
 */
function kebabToPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * load theme block with retry mechanism
 */
export async function getThemeBlock(blockName: string, theme?: string) {
  const loadTheme = theme || getActiveTheme();
  const pascalCaseName = kebabToPascalCase(blockName);
  const maxRetries = 3;

  // Helper function to attempt import with retries
  const attemptImport = async (themeName: string, retries: number = 0): Promise<any> => {
    try {
      const module = await import(`@/themes/${themeName}/blocks/${blockName}`);
      // Try PascalCase named export first, then original blockName
      const component = module[pascalCaseName] || module[blockName];
      if (!component) {
        throw new Error(`No valid export found in block "${blockName}"`);
      }
      return component;
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes('Failed to load chunk') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('ChunkLoadError') ||
        error?.message?.includes('Failed to fetch dynamically imported module');

      if (isChunkError && retries < maxRetries) {
        console.log(
          `[Theme] Chunk loading error for block "${blockName}", retry ${retries + 1}/${maxRetries}`
        );
        await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
        return attemptImport(themeName, retries + 1);
      }

      throw error;
    }
  };

  try {
    // load theme block with retries
    return await attemptImport(loadTheme);
  } catch (error) {
    console.error(
      `Failed to load block "${blockName}" from theme "${loadTheme}":`,
      error
    );

    // fallback to default theme
    if (loadTheme !== defaultTheme) {
      try {
        return await attemptImport(defaultTheme);
      } catch (fallbackError) {
        console.error(`Failed to load fallback block:`, fallbackError);
        throw fallbackError;
      }
    }

    throw error;
  }
}
