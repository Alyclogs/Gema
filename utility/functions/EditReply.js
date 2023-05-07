const { EmbedBuilder } = require('discord.js')
const { color } = require('../../config.json')

function EditReply(interaction, emoji, description, type) {

    interaction.editReply({
        embeds: [
            new EmbedBuilder()
            .setColor(color)
            .setDescription(`${emoji}  |  ${description}`)
        ],
        ephemeral: type
    })
}

module.exports = EditReply