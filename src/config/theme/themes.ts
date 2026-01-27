/**
 * Theme Configuration
 * Biblical-inspired color themes for the application
 */

export interface ThemeColors {
    name: string;
    label: string;
    description: string;
    colors: {
        light: {
            primary: string;
            secondary: string;
            accent: string;
            background: string;
            foreground: string;
            muted: string;
            border: string;
        };
        dark: {
            primary: string;
            secondary: string;
            accent: string;
            background: string;
            foreground: string;
            muted: string;
            border: string;
        };
    };
}

export const themes: ThemeColors[] = [
    {
        name: 'divine',
        label: 'Divine Light',
        description: 'Cream, Navy Blue & Gold - Faith, Purity & Glory',
        colors: {
            light: {
                primary: 'oklch(0.40 0.10 255)', // Deep Navy Blue
                secondary: 'oklch(0.75 0.08 85)', // Pale Gold
                accent: 'oklch(0.70 0.15 60)', // Rich Gold
                background: 'oklch(0.98 0.005 75)', // Soft Cream
                foreground: 'oklch(0.25 0.02 255)',
                muted: 'oklch(0.95 0.005 75)',
                border: 'oklch(0.88 0.01 75)',
            },
            dark: {
                primary: 'oklch(0.60 0.12 255)',
                secondary: 'oklch(0.80 0.10 85)',
                accent: 'oklch(0.75 0.15 60)',
                background: 'oklch(0.15 0.02 255)',
                foreground: 'oklch(0.95 0.005 255)',
                muted: 'oklch(0.22 0.02 255)',
                border: 'oklch(0.30 0.03 255)',
            },
        },
    },
    {
        name: 'healing',
        label: 'Healing Warmth',
        description: 'Olive, Gold & Orange - Peace, Comfort & Renewal',
        colors: {
            light: {
                primary: 'oklch(0.38 0.12 135)', // Deep Olive Green
                secondary: 'oklch(0.75 0.12 85)', // Bright Gold (L=0.75 - 明亮金色)
                accent: 'oklch(0.58 0.18 55)', // Deep Warm Orange
                background: 'oklch(0.96 0.01 75)', // Warm Cream
                foreground: 'oklch(0.28 0.04 65)', // Deep Brown
                muted: 'oklch(0.94 0.01 75)',
                border: 'oklch(0.88 0.02 75)',
            },
            dark: {
                primary: 'oklch(0.55 0.12 135)',
                secondary: 'oklch(0.75 0.12 85)',
                accent: 'oklch(0.65 0.18 55)',
                background: 'oklch(0.18 0.02 135)',
                foreground: 'oklch(0.92 0.01 75)',
                muted: 'oklch(0.25 0.02 135)',
                border: 'oklch(0.35 0.03 135)',
            },
        },
    },
    {
        name: 'biblical',
        label: 'Biblical',
        description: 'Indigo, Purple & Gold - Heaven, Royalty & Glory',
        colors: {
            light: {
                primary: 'oklch(0.55 0.20 270)', // Indigo
                secondary: 'oklch(0.50 0.18 290)', // Purple
                accent: 'oklch(0.70 0.15 60)', // Amber Gold
                background: 'oklch(0.98 0.01 270)',
                foreground: 'oklch(0.25 0.04 270)',
                muted: 'oklch(0.96 0.01 270)',
                border: 'oklch(0.90 0.01 270)',
            },
            dark: {
                primary: 'oklch(0.65 0.18 270)',
                secondary: 'oklch(0.60 0.16 290)',
                accent: 'oklch(0.75 0.13 60)',
                background: 'oklch(0.18 0.04 270)',
                foreground: 'oklch(0.95 0.01 270)',
                muted: 'oklch(0.25 0.04 270)',
                border: 'oklch(0.35 0.04 270)',
            },
        },
    },
    {
        name: 'warm',
        label: 'Warm Sunset',
        description: 'Amber, Orange & Red - Warmth, Comfort & Peace',
        colors: {
            light: {
                primary: 'oklch(0.65 0.18 50)', // Amber
                secondary: 'oklch(0.62 0.20 40)', // Orange
                accent: 'oklch(0.58 0.22 30)', // Red-Orange
                background: 'oklch(0.98 0.01 50)',
                foreground: 'oklch(0.25 0.04 50)',
                muted: 'oklch(0.96 0.01 50)',
                border: 'oklch(0.90 0.01 50)',
            },
            dark: {
                primary: 'oklch(0.70 0.16 50)',
                secondary: 'oklch(0.67 0.18 40)',
                accent: 'oklch(0.63 0.20 30)',
                background: 'oklch(0.18 0.04 50)',
                foreground: 'oklch(0.95 0.01 50)',
                muted: 'oklch(0.25 0.04 50)',
                border: 'oklch(0.35 0.04 50)',
            },
        },
    },
    {
        name: 'ocean',
        label: 'Ocean Breeze',
        description: 'Blue, Cyan & Teal - Peace, Tranquility & Hope',
        colors: {
            light: {
                primary: 'oklch(0.55 0.18 240)', // Blue
                secondary: 'oklch(0.60 0.16 220)', // Cyan
                accent: 'oklch(0.65 0.14 200)', // Teal
                background: 'oklch(0.98 0.01 240)',
                foreground: 'oklch(0.25 0.04 240)',
                muted: 'oklch(0.96 0.01 240)',
                border: 'oklch(0.90 0.01 240)',
            },
            dark: {
                primary: 'oklch(0.65 0.16 240)',
                secondary: 'oklch(0.68 0.14 220)',
                accent: 'oklch(0.70 0.12 200)',
                background: 'oklch(0.18 0.04 240)',
                foreground: 'oklch(0.95 0.01 240)',
                muted: 'oklch(0.25 0.04 240)',
                border: 'oklch(0.35 0.04 240)',
            },
        },
    },
    {
        name: 'forest',
        label: 'Forest Peace',
        description: 'Green, Emerald & Lime - Growth, Life & Renewal',
        colors: {
            light: {
                primary: 'oklch(0.55 0.18 155)', // Green
                secondary: 'oklch(0.60 0.16 165)', // Emerald
                accent: 'oklch(0.70 0.14 120)', // Lime
                background: 'oklch(0.98 0.01 155)',
                foreground: 'oklch(0.25 0.04 155)',
                muted: 'oklch(0.96 0.01 155)',
                border: 'oklch(0.90 0.01 155)',
            },
            dark: {
                primary: 'oklch(0.65 0.16 155)',
                secondary: 'oklch(0.68 0.14 165)',
                accent: 'oklch(0.75 0.12 120)',
                background: 'oklch(0.18 0.04 155)',
                foreground: 'oklch(0.95 0.01 155)',
                muted: 'oklch(0.25 0.04 155)',
                border: 'oklch(0.35 0.04 155)',
            },
        },
    },
    {
        name: 'royal',
        label: 'Royal Majesty',
        description: 'Purple, Magenta & Pink - Majesty, Love & Grace',
        colors: {
            light: {
                primary: 'oklch(0.55 0.20 310)', // Purple
                secondary: 'oklch(0.58 0.22 330)', // Magenta
                accent: 'oklch(0.65 0.18 350)', // Pink
                background: 'oklch(0.98 0.01 310)',
                foreground: 'oklch(0.25 0.04 310)',
                muted: 'oklch(0.96 0.01 310)',
                border: 'oklch(0.90 0.01 310)',
            },
            dark: {
                primary: 'oklch(0.65 0.18 310)',
                secondary: 'oklch(0.68 0.20 330)',
                accent: 'oklch(0.72 0.16 350)',
                background: 'oklch(0.18 0.04 310)',
                foreground: 'oklch(0.95 0.01 310)',
                muted: 'oklch(0.25 0.04 310)',
                border: 'oklch(0.35 0.04 310)',
            },
        },
    },
    {
        name: 'classic',
        label: 'Classic Elegance',
        description: 'Neutral, Gray & Silver - Timeless & Professional',
        colors: {
            light: {
                primary: 'oklch(0.50 0.02 270)', // Dark Gray
                secondary: 'oklch(0.60 0.01 270)', // Medium Gray
                accent: 'oklch(0.70 0.03 60)', // Subtle Gold
                background: 'oklch(0.98 0.005 270)',
                foreground: 'oklch(0.25 0.02 270)',
                muted: 'oklch(0.96 0.005 270)',
                border: 'oklch(0.88 0.005 270)',
            },
            dark: {
                primary: 'oklch(0.70 0.01 270)',
                secondary: 'oklch(0.65 0.01 270)',
                accent: 'oklch(0.75 0.03 60)',
                background: 'oklch(0.20 0.01 270)',
                foreground: 'oklch(0.93 0.005 270)',
                muted: 'oklch(0.24 0.01 270)',
                border: 'oklch(0.40 0.01 270)',
            },
        },
    },
    {
        name: 'deep-earth',
        label: 'Deep Earth',
        description: 'Deep Brown, Gold & Earth Tones - Rich & Grounded',
        colors: {
            light: {
                primary: 'oklch(0.35 0.08 65)', // Deep Brown (最深)
                secondary: 'oklch(0.50 0.15 85)', // Deep Gold (最深)
                accent: 'oklch(0.45 0.12 55)', // Deep Orange-Brown (最深)
                background: 'oklch(0.97 0.015 75)', // #fdf6ee 奶油色
                foreground: 'oklch(0.20 0.04 65)', // Very Deep Brown
                muted: 'oklch(0.95 0.01 75)',
                border: 'oklch(0.88 0.02 75)',
            },
            dark: {
                primary: 'oklch(0.55 0.10 65)',
                secondary: 'oklch(0.70 0.15 85)',
                accent: 'oklch(0.65 0.12 55)',
                background: 'oklch(0.18 0.02 65)',
                foreground: 'oklch(0.92 0.01 75)',
                muted: 'oklch(0.25 0.02 65)',
                border: 'oklch(0.35 0.03 65)',
            },
        },
    },
    {
        name: 'olive-gold',
        label: 'Olive & Gold',
        description: 'Warm Orange, Bright Gold & Olive - Natural & Warm',
        colors: {
            light: {
                primary: 'oklch(0.65 0.15 55)', // Warm Orange (主按钮)
                secondary: 'oklch(0.8 0.08 85)', // Bright Gold
                accent: 'oklch(0.45 0.08 135)', // Olive Green (强调色)
                background: 'oklch(0.96 0.01 75)', // Cream White
                foreground: 'oklch(0.35 0.10 135)', // Deep Olive Green Text (橄榄绿文字)
                muted: 'oklch(0.94 0.01 75)',
                border: 'oklch(0.88 0.02 75)',
            },
            dark: {
                primary: 'oklch(0.70 0.15 55)',
                secondary: 'oklch(0.80 0.10 85)',
                accent: 'oklch(0.60 0.10 135)',
                background: 'oklch(0.18 0.02 55)',
                foreground: 'oklch(0.88 0.08 135)', // Light Olive Green Text
                muted: 'oklch(0.25 0.02 55)',
                border: 'oklch(0.35 0.03 55)',
            },
        },
    },
    {
        name: 'fitness',
        label: 'Fitness Energy',
        description: 'Black & Orange - Power, Energy & Performance',
        colors: {
            light: {
                primary: 'oklch(0.65 0.22 35)', // Vibrant Orange
                secondary: 'oklch(0.55 0.20 25)', // Red-Orange
                accent: 'oklch(0.75 0.18 40)', // Light Orange
                background: 'oklch(0.12 0.01 0)', // Deep Black
                foreground: 'oklch(0.98 0.01 0)', // White Text
                muted: 'oklch(0.25 0.01 0)', // Dark Gray
                border: 'oklch(0.30 0.01 0)', // Border Gray
            },
            dark: {
                primary: 'oklch(0.70 0.22 35)', // Vibrant Orange
                secondary: 'oklch(0.60 0.20 25)', // Red-Orange
                accent: 'oklch(0.75 0.18 40)', // Light Orange
                background: 'oklch(0.08 0.01 0)', // Pure Black
                foreground: 'oklch(0.98 0.01 0)', // White Text
                muted: 'oklch(0.20 0.01 0)', // Dark Gray
                border: 'oklch(0.25 0.01 0)', // Border Gray
            },
        },
    },
];

export const defaultTheme = 'fitness';
