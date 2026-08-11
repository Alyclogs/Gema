import { SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions';
import { buildFontListEmbeds } from '../../../util/decoration/fonts';
import { createEmbedPagination } from '../../../util/interactions/pagination';

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('fonts')
        .setDescription('Muestra las fuentes disponibles para usar con {font:<fuente>} o /utility decor'),
    timeout: 0,
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ interaction, color }) {
        await interaction.deferReply();

        const embeds = buildFontListEmbeds(color);
        return createEmbedPagination(interaction, embeds);
    }
});
