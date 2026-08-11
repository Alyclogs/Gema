import { AttachmentBuilder } from 'discord.js';

const MAX_ATTEMPTS = 3;

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
 * Las imágenes se sirven desde nuestro propio CDN (cdn.rina-ai.app, cacheado por nginx
 * frente a un bucket de GCS), así que la descarga es rápida. Se adjunta en vez de linkear
 * directo para que el embed llegue completo de una, sin el pop-in que hace Discord al
 * crawlear una URL externa recién referenciada.
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
