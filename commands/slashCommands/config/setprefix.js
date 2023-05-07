const { SlashCommandBuilder, ChatInputCommandInteraction, Client } = require('discord.js');
const { Permissions2 } = require('../../../utility/validation/Permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setprefix')
        .setDescription('Cambia el prefijo de la bot')
        .addStringOption((option) =>
            option.setName('prefix').setDescription('El nuevo prefijo').setRequired(true)),
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

    /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
    async execute(interaction, client, color, emojis) {
        await interaction.deferReply()
        const prefijo = interaction.options.getString('prefix')

        const data = { guildId: message.guild.id }
        const serverdata = await serverconfig.findOne(data).exec()

        if (!serverdata) await serverconfig.create(data)
        await serverconfig.updateOne(data, { prefix: prefijo })

        await interaction.editReply({
            content: `${emojis.check} Ahora el prefijo de Gema es \`${prefijo}\``,
            allowedMentions: { repliedUser: false }
        })
    }
}