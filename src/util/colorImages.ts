import { createCanvas, CanvasRenderingContext2D } from '@napi-rs/canvas';

function drawRoundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

const BACKGROUND = '#0e0e14';

export function renderColorSwatch(hex: string): Buffer {
    const width = 500;
    const height = 220;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    const pad = 24;
    drawRoundedRectPath(ctx, pad, pad, width - pad * 2, height - pad * 2 - 44, 20);
    ctx.fillStyle = hex;
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hex, width / 2, height - 30);

    return canvas.toBuffer('image/png');
}

export function renderGradient(colors: string[]): Buffer {
    const width = 700;
    const height = 220;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    const pad = 24;
    const barX = pad, barY = pad, barW = width - pad * 2, barH = height - pad * 2 - 44;

    drawRoundedRectPath(ctx, barX, barY, barW, barH, 20);
    const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    colors.forEach((c, i) => gradient.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), c));
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    colors.forEach((c, i) => {
        const rawX = barX + (colors.length === 1 ? barW / 2 : (barW / (colors.length - 1)) * i);
        const x = Math.min(Math.max(rawX, barX + 32), barX + barW - 32);
        ctx.fillText(c, x, height - 26);
    });

    return canvas.toBuffer('image/png');
}

export function renderPalette(colors: string[]): Buffer {
    const swatchSize = 140, gap = 16, padding = 24;
    const width = colors.length * swatchSize + (colors.length - 1) * gap + padding * 2;
    const height = swatchSize + padding * 2 + 36;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    colors.forEach((c, i) => {
        const x = padding + i * (swatchSize + gap);
        const y = padding;
        drawRoundedRectPath(ctx, x, y, swatchSize, swatchSize, 16);
        ctx.fillStyle = c;
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(c, x + swatchSize / 2, y + swatchSize + 22);
    });

    return canvas.toBuffer('image/png');
}
