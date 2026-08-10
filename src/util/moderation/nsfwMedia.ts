export interface NsfwMediaResult {
    /** Referencia lista para usar en `.setImage()` / `.setThumbnail()` */
    url: string;
}

/**
 * Elige una imagen al azar de `pool`. Las imágenes se sirven desde nuestro propio CDN
 * (cdn.rina-ai.app, backed por un bucket de GCS), así que se puede linkear la URL directo
 * en el embed sin descargarla ni re-subirla como adjunto.
 */
export function fetchNsfwMedia(pool: string[]): NsfwMediaResult | null {
    const candidates = pool.filter(Boolean);
    if (!candidates.length) return null;

    const url = candidates[Math.floor(Math.random() * candidates.length)];
    return { url };
}
