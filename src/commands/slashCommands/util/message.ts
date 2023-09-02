import { ActionRowBuilder, ButtonBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, StringSelectMenuBuilder } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { Permissions } from '../../../util/Permissions'
import { GMessage, messageModel, buttonModel } from '../../../models/gema-models'
import { createEmbedPagination } from '../../../util/Pagination'
import { bot } from '../../..';
import ExtendedInteraction from '../../../typing/ExtendedInteraction';

(async () => { await bot.syncButtons() })

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('message')
        .setDescription('Crea o administra los mensajes del servidor, puedes añadirles botones y menús')
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Muestra un mensaje')
                .addStringOption(option => option.setName('name').setDescription('El nombre del mensaje').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Crea un mensaje para este servidor')
                .addStringOption(option => option.setName('name').setDescription('El nombre del mensaje').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lista los mensajes de este servidor'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit-content')
                .setDescription('Edita un mensaje, puedes hacer uso de las /variables')
                .addStringOption(option => option.setName('message').setDescription('El nombre del mensaje').setRequired(true).setAutocomplete(true))
                .addStringOption(option => option.setName('content').setDescription('El contenido para el mensaje').setRequired(true)))
        .addSubcommandGroup(group =>
            group
                .setName('attach')
                .setDescription('Adjunta un botón o un menú de selección previamente configurado')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('button')
                        .setDescription('Adjunta un botón a tu mensaje')
                        .addStringOption(option => option.setName('message').setDescription('El nombre del mensaje').setRequired(true).setAutocomplete(true))
                        .addStringOption(option => option.setName('button-name').setDescription('El nombre del botón').setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('selectmenu')
                        .setDescription('Adjunta un menú de selección a tu mensaje')
                        .addStringOption(option => option.setName('message').setDescription('El nombre del mensaje').setRequired(true).setAutocomplete(true))
                        .addStringOption(option => option.setName('selectmenu-name').setDescription('El nombre del menú de selección').setRequired(true))))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Elimina un mensaje')
                .addStringOption(option => option.setName('message').setDescription('El nombre del mensaje').setRequired(true).setAutocomplete(true))),
    timeout: 0,
    memberperms: [Permissions.gestionarServidor],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async autocomplete({ interaction, client, args, color, emojis }) {

        client.messages = await messageModel.find({}).exec()
        const messageNames = client.messages.filter(m => m.guildId === interaction.guild?.id).map(m => m.name)

        try {
            const focusedValue = args.getFocused()
            if (!focusedValue) {
                await interaction.respond(messageNames.map(choice => ({ name: choice, value: choice })))
            } else {
                const filtered = messageNames.filter(choice => choice.startsWith(focusedValue))
                await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })))
            }

        } catch (e) {
            console.log(`a: ${e}`)
        }
    },

    async run({ interaction, client, args, color, emojis }) {
        if (!interaction.guild) return
        await interaction.deferReply({ ephemeral: true })

        client.messages = await messageModel.find({}).exec()

        const subcommand = args.getSubcommand()
        const group = args.getSubcommandGroup()
        const messageName = args.getString('name') || args.getString('message')
        const messageData = { guildId: interaction.guild?.id, name: messageName }
        const messagef = client.messages.find(m => m.guildId === interaction.guild?.id && m.name === messageName)

        if (subcommand === 'create') {
            if (messagef) return interaction.editReply(`${emojis.hmph} Ya existe un mensaje con ese nombre. Edítalo con /message edit`)
            if (!messageName) return interaction.editReply(`${emojis.confused} Debes especificar un nombre para el mensaje`)

            let message = new GMessage()
            message.guildId = interaction.guild?.id
            message.name = messageName

            await messageModel.create(message)
            return await interaction.editReply(`${emojis.check} El mensaje **${messageName}** fue creado correctamente`)
        }
        if (subcommand === 'delete') {
            if (!messagef) return await interaction.editReply(`${emojis.hmph} No existe un mensaje con ese nombre. Créalo con /message create`)

            await messageModel.deleteOne(messageData)
            return await interaction.editReply(`${emojis.check} El mensaje **${messageName}** fue eliminado correctamente`)
        }
        if (subcommand === 'list') {
            if (client.messages.filter((em) => em.guildId === interaction.guild?.id).length) {
                let embedNames = client.messages.filter((em) => em.guildId === interaction.guild?.id).map(function (em) {
                    return `${emojis['dot']} ${em.name}`
                })
                let messages: EmbedBuilder[] = [], sliced = []

                for (let i = 0; i < embedNames.length; i += 10) {
                    sliced.push(embedNames.slice(i, i + 10))
                }

                sliced.forEach(embs => {
                    let emb = new EmbedBuilder()
                        .setColor(color)
                        .setAuthor({ name: interaction.guild?.name || '', iconURL: interaction.guild?.iconURL() || undefined })
                        .setTitle('Lista de messages')
                        .setDescription(embs.join('\n'))
                    messages.push(emb)
                })
                return createEmbedPagination(interaction as ChatInputCommandInteraction<"cached">, messages)
            } else {
                return interaction.editReply(`${emojis.error} Aún no hay messages creados en este servidor ${emojis.sweat}`)
            }
        }
        if (group === 'attach' || subcommand === 'edit-content' || subcommand === 'show') {
            if (!messagef) return await interaction.editReply(`${emojis.hmph} No existe un mensaje con ese nombre. Créalo con /message create`)
            const { replaceVars, createAutoresponder, executeReply } = (await import('../../../util/functions'))?.default(client, interaction)

            let prevButtons: ButtonBuilder[] = []
            let allbtns: string[] = []

            if (messagef.reply && messagef.reply.buttons?.length) {
                messagef.reply.buttons.forEach(async (boton) => {
                    let btnf = await buttonModel.findOne({ guildId: interaction.guild?.id, name: boton }).exec()

                    if (btnf) {
                        allbtns.push(btnf.name)
                        let btn = new ButtonBuilder()
                            .setCustomId(btnf.customId)
                            .setLabel(btnf.data.label)
                            .setStyle(btnf.data.style)
                        if (btnf.data.emoji) btn.setEmoji(btnf.data.emoji)
                        prevButtons.push(btn)
                    } else console.log('boton no se encontro')
                })
            }

            if (subcommand == 'show') {
                if (messagef.reply) {
                    await interaction.editReply(`Enviando mensaje...`)
                    await executeReply(messagef.reply, interaction as ExtendedInteraction)
                } else {
                    return await interaction.editReply(`${emojis.error} El mensaje aún no tiene contenido, asígnale uno con /message edit-content`)
                }
            }
            if (subcommand === 'edit-content') {
                let content = args.getString('content')
                if (!content) return await interaction.editReply(`${emojis.confused} Debes especificar un contenido para el mensaje`)

                const ar = await createAutoresponder(interaction as ExtendedInteraction, content)
                if (ar) {
                    await messageModel.updateOne(messageData, { reply: ar.arReply })
                    await interaction.editReply({ content: `${emojis.check} Contenido editado, enviando previsualización...` })
                    await executeReply(ar.arReply, interaction as ExtendedInteraction)
                }
            }
            if (subcommand === 'button') {
                let button = args.getString('button-name')
                if (!button) return await interaction.editReply(`${emojis.confused} Debes especificar el nombre del botón que quieres añadir`)
                if (!client.buttons.get(`arbnt_${button}`)) return await interaction.editReply(`${emojis.confused} El botón no existe, créalo con /button create`)

                if (messagef.reply) {
                    messagef.reply.rawreply = `${messagef.reply.rawreply} + {button:${button}}`
                    await interaction.editReply({ content: `${emojis.check} Botón añadido, enviando previsualización...` })
                    await executeReply(messagef.reply, interaction as ExtendedInteraction)
                }
            }
            if (subcommand === 'selectmenu') {
                let selectmenu = args.getString('selectmenu-name')
                if (!selectmenu) return await interaction.editReply(`${emojis.confused} Debes especificar el nombre del menú de selección que quieres añadir`)
                if (!client.selectmenus.find(sm => sm.customId === `arselm_${selectmenu}`)) return await interaction.editReply(`${emojis.confused} El menú de selección especificado no existe, créalo con /selectmenu create`)

                if (messagef.reply) {
                    messagef.reply.rawreply = `${messagef.reply.rawreply} + {selectmenu:${selectmenu}}`
                    await interaction.editReply({ content: `${emojis.check} Menú de selección añadido, enviando previsualización...` })
                    await executeReply(messagef.reply, interaction as ExtendedInteraction)
                }
            }
        }
    }
});
