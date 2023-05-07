const { Client, Message, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const chatbotModel = require('../../../utility/models/chatbot-model')
const { chatbot } = require('../../../utility/data/chatbot');
const { Permissions2 } = require('../../../utility/validation/Permissions');

module.exports = {
    name: 'chatbot',
    description: 'Interactúa y chatea con Gema',
    aliases: [],
    uso: '',
    subcommands: [
        {
            name: 'setchannel',
            description: 'Establece el canal para interactuar con Gema',
            uso: `\`gema chatbot setchannel #canal\``,
        },
        {
            name: 'removechannel',
            description: 'Remueve el canal para interactuar con Gema',
        },
        {
            name: 'resetprompt',
            description: 'Reestablece el historial de conversaciones con Gema',
        }
    ],
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes, Permissions2.insertarEnlaces],

    /**
     * @param {Client} client
     * @param {Message} message
     */
    async execute(client, message, args, prefix, emojis, color) {
        const chatbotData = await chatbotModel.findOne({ guildId: message.guild.id }).exec()

        const embed = new EmbedBuilder()
            .setColor(color)

        if (args[0]) {
            if (args[0] === 'setchannel') {
                let channel = message.guild.channels.cache.get(args[1]?.replace(/[\\<>@#&!]/g, ""))

                if (!channel) {
                    return message.reply(`${emojis.hmph} Debes especificar un canal`)
                }
                if (chatbotData) {
                    await chatbotData.updateOne({ guildId: message.guild.id }, { channelId: channel.id })
                } else {
                    await chatbotModel.create({ guildId: message.guild.id, channelId: channel.id, prompt: chatbot.prompt, nPrompts: 0 })
                }
                embed.setTitle(`${emojis['check']}  Canal establecido`)
                embed.setDescription(`Ahora se podrá interactuar con ${client.user.username} en <#${channel.id}>`)

                return await message.reply({
                    embeds: [embed],
                    allowedMentions: { repliedUser: false }
                })
            }
            if (args[0] === 'removechannel') {
                if (chatbotData) {
                    await chatbotModel.updateOne({ guildId: interaction.guild.id }, { channelId: "" })
                    return await interaction.editReply({ content: `${emojis['check']} | Se ha removido el canal correctamente` })

                } else {
                    return message.reply({
                        content: `${emojis['hmph']} No se ha establecido un canal para este servidor`,
                        allowedMentions: { repliedUser: false }
                    })
                }
            }
            if (args[0] === 'resetprompt') {
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

                    const m = await message.reply({ embeds: [embed], components: [row], allowedMentions: { repliedUser: false } });

                    const filter = i => i.isButton() && i.user.id === message.author.id

                    const collector = m.createMessageComponentCollector({ filter, time: 5000 });

                    collector.on('collect', async i => {
                        if (i.user.id != message.author.id) {
                            return i.reply({ content: `${emojis.hmph} No puedes hacer eso`, ephemeral: true })
                        }
                        if (i.customId === 'btnCancelar') {
                            await i.update({ content: `${emojis['check']} Se ha cancelado la operación`, embeds: [], components: [], allowedMentions: { repliedUser: false } })
                        }
                        if (i.customId === 'btnAceptar') {
                            await chatbotModel.updateOne({ guildId: interaction.guild.id }, { prompt: chatbot.prompt })
                            await i.update({ content: `${emojis['check']} Se ha removido el canal correctamente`, embeds: [], components: [], allowedMentions: { repliedUser: false } })
                        }
                    })

                    collector.on('end', async i => {
                        await m.edit({ content: `${emojis['error']} Se ha cancelado la operación`, embeds: [], components: [], allowedMentions: { repliedUser: false } })
                    })
                } else {
                    message.reply({
                        content: `${emojis.confused} No existen datos de chatbot configurados para este servidor`,
                        allowedMentions: { repliedUser: false }
                    })
                }
            }
        }
    }
}