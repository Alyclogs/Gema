import fontsData from '../lib/fonts.json';

export type FontKey = keyof typeof fontsData;

interface SubstitutionFontConfig {
    name: string;
    upper: string[];
    lower: string[];
}

interface CombiningFontConfig {
    name: string;
    combining: string;
}

type FontConfig = SubstitutionFontConfig | CombiningFontConfig;

export function getRandomFontKey(): FontKey {
    const fontKeys = Object.keys(fontsData) as FontKey[];
    const randomIndex = Math.floor(Math.random() * fontKeys.length);
    return fontKeys[randomIndex];
}

export function applyUnicodeFont(text: string, fontKey: FontKey): string {
    const font: FontConfig = (fontsData as Record<string, FontConfig>)[fontKey];
    if (!font) return text;

    if ('combining' in font) {
        return text
            .split('')
            .map((char) => char === ' ' ? char : char + font.combining)
            .join('');
    }

    return text
        .split('')
        .map((char) => {
            const code = char.charCodeAt(0);

            // Mayúsculas (A-Z)
            if (code >= 65 && code <= 90) {
                return font.upper[code - 65];
            }
            // Minúsculas (a-z)
            if (code >= 97 && code <= 122) {
                return font.lower[code - 97];
            }
            return char;
        })
        .join('');
}