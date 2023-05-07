const { SlashCommandBuilder, Client, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const chatbotModel = require('../../../utility/models/chatbot-model')
const { chatbot } = require('../../../utility/data/chatbot');
const { Permissions2 } = require('../../../utility/validation/Permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chatbot')
        .setDescription('Interactúa con Gema')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription('Establece un canal para interactuar con Gema')
                .addChannelOption(option => option.setName('channel').setDescription('El canal a establecer').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('removechannel')
                .setDescription('Remueve el canal para interactuar con Gema'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resetprompt')
                .setDescription('Reinicia el historial de conversaciones con Gema')),
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes, Permissions2.insertarEnlaces],

    /**
   * @param {Client} client
   * @param {ChatInputCommandInteraction} interaction
   */
    async execute(interaction, client, color, emojis) {
        await interaction.deferReply()

        const subcommand = interaction.options.getSubcommand()
        const channel = interaction.options.getChannel('channel')

        const chatbotData = await chatbotModel.findOne({ guildId: interaction.guild.id }).exec()

        const embed = new EmbedBuilder()
            .setColor(color)

        if (subcommand === 'setchannel') {
            if (chatbotData) {
                await chatbotData.updateOne({ guildId: interaction.guild.id }, { channelId: channel.id })
            } else {
                await chatbotModel.create({ guildId: interaction.guild.id, channelId: channel.id, prompt: chatbot.prompt, nPrompts: 0 })
            }
            embed.setTitle(`${emojis['check']}  Canal establecido`)
            embed.setDescription(`Ahora se podrá interactuar con ${client.user.username} en <#${channel.id}>`)

            return await interaction.editReply({
                embeds: [embed]
            })
        }
        if (subcommand === 'removechannel') {

            if (chatbotData) {
                await chatbotModel.updateOne({ guildId: interaction.guild.id }, { channelId: "" })
                return await interaction.editReply({ content: `${emojis['check']} | Se ha removido el canal correctamente` })

            } else {
                return interaction.editReply({
                    content: `${emojis.confused} | No se ha establecido un canal para este servidor`
                })
            }
        }
        if (subcommand === 'resetprompt') {

            if (chatbotData) {
                embed.setTitle(`${emojis['warning']}  Precaución`)
                embed.setDescription('¿Estás seguro que deseas reiniciar el historial de conversaciones con Gema?')

                const row = new ActionRowBuilder()
                    .setComponents(
                        new ButtonBuilder()
                            .setCustomId('btnCancelar')
                            .setLabel('Cancelar')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('btnAceptar')
                            .setLabel('Aceptar')
                            .setStyle(ButtonStyle.Success));

                const m = await interaction.editReply({ embeds: [embed], components: [row] });

                const filter = i => i.user.id === interaction.user.id

                const collector = m.createMessageComponentCollector({ filter, time: 5000 });

                collector.on('collect', async i => {
                    await i.deferUpdate()
                    if (i.user.id != interaction.user.id) {
                        return i.reply({ content: `${emojis.hmph} No puedes hacer eso`, ephemeral: true })
                    }
                    if (i.customId === 'btnCancelar') {
                        await i.editReply({ content: `${emojis['check']} Se ha cancelado la operación`, embeds: [], components: [] })
                    }
                    if (i.customId === 'btnAceptar') {
                        await chatbotModel.updateOne({ guildId: interaction.guild.id }, { prompt: chatbot.prompt })
                        await i.editReply({ content: `${emojis['check']} Se ha removido el canal correctamente`, embeds: [], components: [] })
                    }
                })

                collector.on('end', async () => {
                    await m.edit({ content: `${emojis['error']} Se ha cancelado la operación`, embeds: [], components: [] })
                })
            } else {
                return interaction.editReply({
                    content: `${emojis.confused} | No se ha establecido un canal para este servidor`
                })
            }
        }
    }
}