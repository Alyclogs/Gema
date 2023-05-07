const { SlashCommandBuilder, ChatInputCommandInteraction, Client } = require('discord.js');
const { Permissions2 } = require('../../../utility/validation/Permissions');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Envia un mensaje con la bot')
    .addStringOption((option) =>
    option.setName('mensaje').setDescription('El mensaje a enviar').setRequired(true)),
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

    /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
    async execute(interaction, client, color, emojis) {
        interaction.reply({ content: 'Mensaje enviado!', ephemeral: true, fetchReply: true })
        interaction.channel.send(interaction.options.getString('mensaje'))
    }
}