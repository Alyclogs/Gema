import { ActionRowBuilder, ButtonBuilder, ButtonStyle, CollectorFilter, EmbedBuilder, Message, MessageComponentInteraction, SlashCommandBuilder, StringSelectMenuInteraction } from "discord.js";
import { SlashCommand } from "../../../structures/Command";
import { Permissions } from '../../../lib/Permissions';
import { Chatbot, model as chatbotModel } from '../../../models/chatbot-model';
import { GButton } from "../../../models/gema-models";

export default new SlashCommand({
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
    cooldown: 0,
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ interaction, client, color, emojis }) {
        await interaction.deferReply()

        const subcommand = interaction.options.getSubcommand()
        const channel = interaction.options.getChannel('channel')
        await client.syncButtons();

        const chatbotData = await chatbotModel.findOne({ guildId: interaction.guild?.id }).exec()

        const embed = new EmbedBuilder()
            .setColor(color)

        if (subcommand === 'setchannel') {
            if (chatbotData) {
                await chatbotData.updateOne({ guildId: interaction.guild?.id }, { channelId: channel?.id })
            } else {
                await chatbotModel.create({ guildId: interaction.guild?.id, channelId: channel?.id, chat: [] })
            }
            embed.setTitle(`${emojis['check']}  Canal establecido`)
            embed.setDescription(`Ahora se podrá interactuar con ${client.user?.username} en <#${channel?.id}>`)

            return await interaction.editReply({
                embeds: [embed]
            })
        }
        if (subcommand === 'removechannel') {

            if (chatbotData) {
                await chatbotModel.updateOne({ guildId: interaction.guild?.id }, { channelId: "" })
                return await interaction.editReply({ content: `${emojis['check']} | Se ha removido el canal correctamente` })

            } else {
                return interaction.editReply({
                    content: `${emojis.confused} No se ha establecido un canal para este servidor`
                })
            }
        }
        if (subcommand === 'resetprompt') {

            if (chatbotData) {
                embed.setTitle(`${emojis['warning']}  Precaución`)
                embed.setDescription('¿Estás seguro que deseas reiniciar el historial de conversaciones con Gema?')

                const row = new ActionRowBuilder<ButtonBuilder>()
                    .setComponents(
                        (client.buttons.get('btnCancelar') as GButton).getButton(),
                        new ButtonBuilder()
                            .setCustomId('btnAceptar')
                            .setLabel('Aceptar')
                            .setStyle(ButtonStyle.Success));

                const m = await interaction.editReply({ embeds: [embed], components: [row] });

                const filter = (i: MessageComponentInteraction) => i.user.id === interaction.user.id

                const collector = m.createMessageComponentCollector({ filter: filter, time: 5000 });

                collector.on('collect', async (i) => {
                    await i.deferUpdate()
                    if (i.user.id !== interaction.user.id) {
                        await i.reply({ content: `${emojis.hmph} No puedes hacer eso`, ephemeral: true })
                    }
                    if (i.customId === 'btnAceptar') {
                        await chatbotModel.updateOne({ guildId: interaction.guild?.id }, { chat: [] })
                        await i.editReply({ content: `${emojis['check']} Se ha reiniciado el historial de chats para este servidor`, embeds: [], components: [] })
                    }
                })

                collector.on('end', async () => {
                    await m.edit({ content: `${emojis['error']} Se ha cancelado la operación`, embeds: [], components: [] })
                })
            } else {
                return interaction.editReply({
                    content: `${emojis.confused} No se ha establecido un canal para este servidor`
                })
            }
        }
    }
})