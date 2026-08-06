import { ColorResolvable, EmbedBuilder } from 'discord.js';
import fontsData from '../lib/fonts.json';
import emojis from '../lib/emojis.json';

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

const FONTS_PER_PAGE = 10;
const FONT_LIST_COLUMNS = 2;

/** Construye las páginas (una por embed) con la lista de fuentes en 2 columnas, listas para `createEmbedPagination`. */
export function buildFontListEmbeds(color: ColorResolvable): EmbedBuilder[] {
    const sample = 'AaBb123';
    const keys = Object.keys(fontsData) as FontKey[];
    const embeds: EmbedBuilder[] = [];

    for (let i = 0; i < keys.length; i += FONTS_PER_PAGE) {
        const pageKeys = keys.slice(i, i + FONTS_PER_PAGE);
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emojis.star} Fuentes disponibles`)
            .setDescription('Usa el nombre de la fuente con `{font:<fuente>}` o con `gema utility decor <texto> | <fuente>`');

        pageKeys.forEach((key, idx) => {
            const font = (fontsData as Record<string, { name: string }>)[key];
            embed.addFields({
                name: `\`${key}\``,
                value: `${font.name}\n${applyUnicodeFont(sample, key)}`,
                inline: true
            });
            if (idx % FONT_LIST_COLUMNS === FONT_LIST_COLUMNS - 1) {
                embed.addFields({ name: '​', value: '​', inline: true });
            }
        });

        embeds.push(embed);
    }

    return embeds;
}