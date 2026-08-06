import { Command } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { buildFontListEmbeds } from '../../../util/fonts';
import { createEmbedPagination } from '../../../util/Pagination';

export default new Command({
    name: 'fonts',
    aliases: ['fuentes', 'font'],
    description: 'Muestra las fuentes disponibles para usar con `{font:<fuente>}` o `gema utility decor`',
    uso: '`gema fonts`',
    timeout: 0,
    memberperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ message, color }) {
        const embeds = buildFontListEmbeds(color);
        return createEmbedPagination(message, embeds);
    }
});
