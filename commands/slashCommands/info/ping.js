const { SlashCommandBuilder, EmbedBuilder ,Client, ChatInputCommandInteraction } = require('discord.js');
const { Permissions2 } = require('../../../utility/validation/Permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Devuelve información sobre mi latencia (ms)'),
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes, Permissions2.insertarEnlaces],

    /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
    async execute(interaction, client, color, emojis) {
        await interaction.deferReply({
            fetchReply: true
        })

        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                .setTitle(`🏓 Pong!`)
                    .setDescription(`${emojis.dot}Mensajes: \`${Date.now() - interaction.createdTimestamp}\` ms\n${emojis.dot}API: \`${Math.round(client.ws.ping)}\` ms`)
                    .setColor(color)
            ]
        })
    }
}
