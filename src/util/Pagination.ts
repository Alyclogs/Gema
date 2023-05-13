import { Pagination } from 'pagination.djs';
import { color } from '../config.json';
import { ChatInputCommandInteraction, ColorResolvable, EmbedBuilder, Message } from 'discord.js';

import emojis from '../botdata/emojis.json';

export function createEmbedPagination(interaction: ChatInputCommandInteraction<"cached"> | Message, embeds: EmbedBuilder[]) {
    const pagination = new Pagination(interaction);
    pagination.setEmbeds(embeds, (embed, index, array) => {
        return embed.setFooter({ text: `Página: ${index + 1} de ${array.length}` })
    })
    pagination.setColor(color as ColorResolvable)

    pagination.setEmojis({
        firstEmoji: emojis['arrows-left'],
        prevEmoji: emojis['arrow-left'],
        nextEmoji: emojis['arrow-right'],
        lastEmoji: emojis['arrows-right']
    })
    pagination.render()
}
