const { EmbedBuilder } = require('discord.js')
const { color } = require('../../config.json')

function Reply(interaction, emoji, description, type) {

    interaction.reply({
        embeds: [
            new EmbedBuilder()
            .setColor(color)
            .setDescription(`${emoji}  |  ${description}`)
        ],
        ephemeral: type
    })
}

module.exports = Reply