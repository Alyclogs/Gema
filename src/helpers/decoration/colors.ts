export type ToneKey = 'warm' | 'cool' | 'pastel' | 'vibrant' | 'neon' | 'earth' | 'mono' | 'random';

interface ToneRange {
    label: string;
    /** Uno o más rangos de matiz (en grados, 0-360) entre los que se elige al azar */
    hue: [number, number][];
    saturation: [number, number];
    lightness: [number, number];
}

export const TONES: Record<ToneKey, ToneRange> = {
    warm: { label: 'Cálido', hue: [[0, 50], [330, 360]], saturation: [60, 90], lightness: [45, 65] },
    cool: { label: 'Frío', hue: [[170, 260]], saturation: [55, 85], lightness: [45, 65] },
    pastel: { label: 'Pastel', hue: [[0, 360]], saturation: [35, 55], lightness: [78, 90] },
    vibrant: { label: 'Vibrante', hue: [[0, 360]], saturation: [80, 100], lightness: [45, 58] },
    neon: { label: 'Neón', hue: [[0, 360]], saturation: [95, 100], lightness: [50, 62] },
    earth: { label: 'Tierra', hue: [[20, 45]], saturation: [30, 60], lightness: [25, 45] },
    mono: { label: 'Monocromático', hue: [[0, 0]], saturation: [0, 0], lightness: [15, 90] },
    random: { label: 'Aleatorio', hue: [[0, 360]], saturation: [30, 100], lightness: [25, 75] },
};

export interface GeneratedColor {
    hex: string;
    hsl: { h: number; s: number; l: number };
}

function randomInRange([min, max]: [number, number]): number {
    return Math.random() * (max - min) + min;
}

function pickHue(tone: ToneRange): number {
    const range = tone.hue[Math.floor(Math.random() * tone.hue.length)];
    return randomInRange(range);
}

function interpolateHue(a: number, b: number, t: number): number {
    const diff = ((b - a + 540) % 360) - 180;
    return (a + diff * t + 360) % 360;
}

export function hslToHex(h: number, s: number, l: number): string {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function generateColor(toneKey?: ToneKey): GeneratedColor {
    const tone = TONES[toneKey ?? 'random'];
    const h = pickHue(tone);
    const s = randomInRange(tone.saturation);
    const l = randomInRange(tone.lightness);
    return { hex: hslToHex(h, s, l), hsl: { h: Math.round(h), s: Math.round(s), l: Math.round(l) } };
}

export function generateGradient(toneKey?: ToneKey, steps = 5): GeneratedColor[] {
    const start = generateColor(toneKey);
    const end = generateColor(toneKey);
    const colors: GeneratedColor[] = [];
    for (let i = 0; i < steps; i++) {
        const t = steps === 1 ? 0 : i / (steps - 1);
        const h = interpolateHue(start.hsl.h, end.hsl.h, t);
        const s = start.hsl.s + (end.hsl.s - start.hsl.s) * t;
        const l = start.hsl.l + (end.hsl.l - start.hsl.l) * t;
        colors.push({ hex: hslToHex(h, s, l), hsl: { h: Math.round(h), s: Math.round(s), l: Math.round(l) } });
    }
    return colors;
}

export function generatePalette(toneKey?: ToneKey, count = 5): GeneratedColor[] {
    const tone = TONES[toneKey ?? 'random'];
    const isFixedHue = tone.hue.length === 1 && tone.hue[0][0] === tone.hue[0][1];
    const baseHue = pickHue(tone);
    const hueStep = 360 / (count * 2);
    const colors: GeneratedColor[] = [];
    for (let i = 0; i < count; i++) {
        const offset = (i - Math.floor(count / 2)) * hueStep;
        const h = isFixedHue ? baseHue : baseHue + offset;
        const s = randomInRange(tone.saturation);
        const l = randomInRange(tone.lightness);
        colors.push({ hex: hslToHex(h, s, l), hsl: { h: Math.round(((h % 360) + 360) % 360), s: Math.round(s), l: Math.round(l) } });
    }
    return colors;
}
