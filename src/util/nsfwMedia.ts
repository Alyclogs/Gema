import { AttachmentBuilder } from 'discord.js';
import { fetch } from 'undici';

const MAX_ATTEMPTS = 5;

export interface NsfwMediaResult {
    attachment: AttachmentBuilder;
    /** Referencia lista para usar en `.setImage()` / `.setThumbnail()` */
    url: string;
}

function extractExtension(url: string): string {
    const match = url.match(/\.(gif|png|jpe?g|webp)(?:$|\?)/i);
    return match ? match[1].toLowerCase() : 'gif';
}

/**
 * Descarga una imagen al azar de `pool` y la envuelve en un `AttachmentBuilder`.
 * Discord no puede proxear de forma confiable imágenes hoteladas en `i.ibb.co` (las bloquea/limita
 * desde sus propias IPs), así que en vez de enlazar la URL directamente en el embed, la bajamos
 * nosotros y la subimos como adjunto para que quede servida desde el CDN de Discord.
 * Si una URL está caída (dominio muerto, 404, vacía) reintenta con otra del mismo array.
 */
export async function fetchNsfwMedia(pool: string[]): Promise<NsfwMediaResult | null> {
    const candidates = pool.filter(Boolean);
    if (!candidates.length) return null;

    const tried = new Set<number>();
    const attempts = Math.min(MAX_ATTEMPTS, candidates.length);

    for (let attempt = 0; attempt < attempts; attempt++) {
        let index: number;
        do {
            index = Math.floor(Math.random() * candidates.length);
        } while (tried.has(index) && tried.size < candidates.length);
        tried.add(index);

        const url = candidates[index];
        try {
            const res = await fetch(url);
            const contentType = res.headers.get('content-type') || '';
            if (!res.ok || !contentType.startsWith('image')) continue;

            const buffer = Buffer.from(await res.arrayBuffer());
            const filename = `nsfw.${extractExtension(url)}`;
            return {
                attachment: new AttachmentBuilder(buffer, { name: filename }),
                url: `attachment://${filename}`
            };
        } catch {
            continue;
        }
    }

    return null;
}
