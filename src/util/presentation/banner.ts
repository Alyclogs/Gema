import { createCanvas, loadImage, CanvasRenderingContext2D } from '@napi-rs/canvas';
import { fetch } from 'undici';
import sharp from 'sharp';

interface BannerOptions {
    avatarUrl: string;
    username: string;
    tagline?: string;
    backgroundUrl?: string;
}

interface AccentTheme {
    primary: string;
    secondary: string;
}

const IMAGE_FETCH_TIMEOUT_MS = 8000;

const ACCENT_THEMES: AccentTheme[] = [
    { primary: '#833ab4', secondary: '#fd1d1d' },
    { primary: '#00c6ff', secondary: '#0072ff' },
    { primary: '#11998e', secondary: '#38ef7d' },
    { primary: '#fc466b', secondary: '#3f5efb' },
    { primary: '#eecda3', secondary: '#ef629f' },
    { primary: '#7F00FF', secondary: '#E100FF' },
    { primary: '#f7971e', secondary: '#ffd200' },
    { primary: '#00b09b', secondary: '#96c93d' },
];

function pickTheme(): AccentTheme {
    return ACCENT_THEMES[Math.floor(Math.random() * ACCENT_THEMES.length)];
}

async function fetchImageBuffer(url: string, timeoutMs = IMAGE_FETCH_TIMEOUT_MS): Promise<Buffer> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: { 'user-agent': 'Mozilla/5.0 (compatible; GemaBot/1.0)' }
        });
        const contentType = res.headers.get('content-type') ?? '';
        if (!res.ok) throw new Error(`HTTP ${res.status} al descargar la imagen (content-type: ${contentType})`);

        const buffer = Buffer.from(await res.arrayBuffer());
        if (!contentType.startsWith('image/')) {
            const preview = buffer.subarray(0, 120).toString('utf8').replace(/\s+/g, ' ').trim();
            throw new Error(`La respuesta no es una imagen (content-type: ${contentType}). Preview: ${preview}`);
        }
        return buffer;
    } finally {
        clearTimeout(timeout);
    }
}

export async function createProfileBanner(options: BannerOptions): Promise<Buffer> {
    const { avatarUrl, username, tagline, backgroundUrl } = options;

    const width = 800;
    const height = 300;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const theme = pickTheme();

    if (backgroundUrl) {
        try {
            const bgBuffer = await fetchImageBuffer(backgroundUrl);
            // Re-codifica a un PNG limpio: el decoder nativo de @napi-rs/canvas falla
            // en algunas imágenes con metadata no estándar (p. ej. chunks C2PA de IA/Adobe).
            const normalizedBuffer = await sharp(bgBuffer)
                .resize(width, height, { fit: 'fill' })
                .png()
                .toBuffer();
            const bgImage = await loadImage(normalizedBuffer);
            ctx.drawImage(bgImage, 0, 0, width, height);

            const scrim = ctx.createLinearGradient(0, 0, width, height);
            scrim.addColorStop(0, 'rgba(8, 8, 14, 0.35)');
            scrim.addColorStop(1, 'rgba(8, 8, 14, 0.7)');
            ctx.fillStyle = scrim;
            ctx.fillRect(0, 0, width, height);
        } catch (error) {
            console.error('Error cargando la imagen de fondo:', error);
            drawThemedGradient(ctx, width, height, theme);
        }
    } else {
        drawThemedGradient(ctx, width, height, theme);
    }

    // Manchas de luz decorativas para dar profundidad al fondo
    drawGlowOrb(ctx, width * 0.06, height * 0.1, 130, theme.primary, 0.4);
    drawGlowOrb(ctx, width * 0.97, height * 0.95, 160, theme.secondary, 0.35);

    const cardX = 28;
    const cardY = 28;
    const cardWidth = width - 56;
    const cardHeight = height - 56;
    const cornerRadius = 26;

    // Sombra de la tarjeta, para que "flote" sobre el fondo
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
    drawRoundedRectPath(ctx, cardX, cardY, cardWidth, cardHeight, cornerRadius);
    ctx.fillStyle = 'rgba(14, 14, 20, 0.6)';
    ctx.fill();
    ctx.restore();

    // Borde con degradado del tema
    ctx.save();
    drawRoundedRectPath(ctx, cardX, cardY, cardWidth, cardHeight, cornerRadius);
    const borderGradient = ctx.createLinearGradient(cardX, cardY, cardX + cardWidth, cardY + cardHeight);
    borderGradient.addColorStop(0, hexWithAlpha(theme.primary, 0.85));
    borderGradient.addColorStop(1, hexWithAlpha(theme.secondary, 0.85));
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    const avatarSize = 130;
    const avatarX = cardX + 38;
    const avatarY = cardY + (cardHeight - avatarSize) / 2;
    const avatarRadius = avatarSize / 2;
    const avatarCenterX = avatarX + avatarRadius;
    const avatarCenterY = avatarY + avatarRadius;

    try {
        const avatarImg = await loadImage(avatarUrl);

        // Halo detrás del avatar (el círculo relleno queda tapado por la imagen)
        ctx.save();
        ctx.shadowColor = hexWithAlpha(theme.primary, 0.7);
        ctx.shadowBlur = 32;
        ctx.beginPath();
        ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // Anillo con degradado del tema
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 3, 0, Math.PI * 2, true);
        const ringGradient = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
        ringGradient.addColorStop(0, theme.primary);
        ringGradient.addColorStop(1, theme.secondary);
        ctx.strokeStyle = ringGradient;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();

        // Punto de estado (estilo "online") en la esquina del avatar
        const dotAngle = Math.PI / 4;
        const dotRadius = 12;
        const dotX = avatarCenterX + (avatarRadius + 2) * Math.cos(dotAngle);
        const dotY = avatarCenterY + (avatarRadius + 2) * Math.sin(dotAngle);
        ctx.save();
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(14, 14, 20, 1)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#3BA55D';
        ctx.fill();
        ctx.restore();
    } catch (error) {
        console.error('Error cargando el avatar:', error);
    }

    const textX = avatarX + avatarSize + 38;

    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 10;
    ctx.fillText(username, textX, avatarCenterY - (tagline ? 20 : 0));
    ctx.restore();

    if (tagline) {
        ctx.fillStyle = 'rgba(230, 230, 240, 0.8)';
        ctx.font = '500 21px sans-serif';
        ctx.fillText(tagline, textX, avatarCenterY + 26);
    }

    // Línea de acento con degradado bajo el nombre
    const underlineY = avatarCenterY + (tagline ? 50 : 26);
    const underlineWidth = 48;
    const underlineHeight = 4;
    const underlineGradient = ctx.createLinearGradient(textX, 0, textX + underlineWidth, 0);
    underlineGradient.addColorStop(0, theme.primary);
    underlineGradient.addColorStop(1, theme.secondary);
    drawRoundedRectPath(ctx, textX, underlineY, underlineWidth, underlineHeight, underlineHeight / 2);
    ctx.fillStyle = underlineGradient;
    ctx.fill();

    return canvas.toBuffer('image/png');
}

function drawThemedGradient(ctx: CanvasRenderingContext2D, width: number, height: number, theme: AccentTheme): void {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, theme.primary);
    gradient.addColorStop(1, theme.secondary);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

function drawGlowOrb(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    color: string,
    alpha: number
): void {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, hexWithAlpha(color, alpha));
    gradient.addColorStop(1, hexWithAlpha(color, 0));
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function hexWithAlpha(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const value = parseInt(clean, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
