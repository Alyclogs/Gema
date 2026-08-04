import emojisData from '../lib/styles.json';
import { applyUnicodeFont, FontKey } from './fonts';
import fontsData from '../lib/fonts.json';

export type StyleCategory = keyof typeof emojisData;

interface Frame {
    prefix: string;
    suffix: string;
}

interface StyleConfig {
    symbols: string[];
    emojis: string[];
    frames: Frame[];
}

function getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

export function generateDecoration(
    text: string,
    category: StyleCategory,
    specificFont?: FontKey
): string {
    if (!text.trim()) return '';

    const styleConfig = (emojisData as Record<string, StyleConfig>)[category];
    if (!styleConfig) return text;

    // 1. Selección de Fuente
    const availableFonts = Object.keys(fontsData) as FontKey[];
    const selectedFontKey = specificFont || getRandomElement(availableFonts);
    const styledText = applyUnicodeFont(text, selectedFontKey);

    // 2. Composición de Símbolos y Emojis
    const useFrame = Math.random() > 0.3;
    const emoji = getRandomElement(styleConfig.emojis);
    const secondaryEmoji = Math.random() > 0.5 ? ` ${getRandomElement(styleConfig.emojis)}` : '';

    if (useFrame && styleConfig.frames.length > 0) {
        const frame = getRandomElement(styleConfig.frames);
        return `${frame.prefix}${styledText}${frame.suffix} ${emoji}${secondaryEmoji}`;
    } else {
        const symStart = getRandomElement(styleConfig.symbols);
        const symEnd = getRandomElement(styleConfig.symbols);
        return `${symStart} ${styledText} ${symEnd} ${emoji}${secondaryEmoji}`;
    }
}
