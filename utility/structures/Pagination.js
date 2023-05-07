const { ButtonBuilder } = require('discord.js')
const { Pagination } = require('pagination.djs');
const { color } = require('../../config.json')
const emojis = require('../data/emojis.json')

function createEmbedPagination(interaction, embeds) {
    const pagination = new Pagination(interaction);
    pagination.setEmbeds(embeds, (embed, index, array) => {
        return embed.setFooter({ text: `Página: ${index + 1} de ${array.length}` })
    })
    pagination.setColor(color)
  
    pagination.setEmojis({
        firstEmoji: emojis['arrows-left'],
        prevEmoji: emojis['arrow-left'],
        nextEmoji: emojis['arrow-right'],
        lastEmoji: emojis['arrows-right']
    })
    pagination.render()
} 

module.exports = { createEmbedPagination }
