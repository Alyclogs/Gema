import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { Permissions } from '../../../lib/Permissions'
import { buttonModel, GButton, Autoresponder } from '../../../models/gema-models'
import ExtendedInteraction from '../../../typing/ExtendedInteraction';
import { createEmbedPagination } from '../../../util/pagination';

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('button')
        .setDescription('Crea o administra los botones para tus mensajes o autoresponders')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Crea un botón')
                .addStringOption(opt => opt.setName('name').setDescription('El nombre para tu botón').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Elimina un botón')
                .addStringOption(opt => opt.setName('name').setDescription('El nombre del botón').setRequired(true).setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Muestra la vista previa de un botón')
                .addStringOption(opt => opt.setName('name').setDescription('El nombre del botón').setRequired(true).setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lista los botones existentes en este servidor'))
        .addSubcommandGroup(group =>
            group
                .setName('edit')
                .setDescription('Edita la respuesta o la información de un botón')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('reply')
                        .setDescription('Edita la respuesta que se mostrará cuando se haga clic en un botón')
                        .addStringOption(opt => opt.setName('button').setDescription('El nombre del botón').setRequired(true).setAutocomplete(true))
                        .addStringOption(opt => opt.setName('reply').setDescription('La respuesta para tu botón, puedes incluir variables para autoresponders').setRequired(true))
                        .addBooleanOption(opt => opt.setName('ephemeral').setDescription('Respuesta visible sólo para el que interactuó con el botón')))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('data')
                        .setDescription('Edita los datos de un botón')
                        .addStringOption(opt => opt.setName('button').setDescription('El nombre del botón').setRequired(true).setAutocomplete(true))
                        .addStringOption(opt => opt.setName('label').setDescription('La etiqueta para tu botón'))
                        .addNumberOption(opt => opt.setName('style').setDescription('El estilo para tu botón').addChoices(
                            { name: 'primary', value: ButtonStyle.Primary },
                            { name: 'secondary', value: ButtonStyle.Secondary },
                            { name: 'success', value: ButtonStyle.Success },
                            { name: 'danger', value: ButtonStyle.Danger }
                        ))
                        .addStringOption(opt => opt.setName('emoji').setDescription('El emoji para tu botón')))),
    timeout: 0,
    memberperms: [Permissions.gestionarServidor],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async autocomplete({ interaction, args, client }) {
        const buttonNames = (await buttonModel.find({ guildId: interaction.guildId }).exec())
            .map(button => button.name)
            .filter(name => name !== '')

        try {
            const focusedValue = args.getFocused()
            if (!focusedValue) {
                await interaction.respond(buttonNames.slice(0, 25).map(choice => ({ name: choice, value: choice })))
            } else {
                const filtered = buttonNames.filter(choice => choice.startsWith(focusedValue))
                await interaction.respond(filtered.slice(0, 25).map(choice => ({ name: choice, value: choice })))
            }

        } catch (e) {
            console.log(`a: ${e}`)
        }
    },

    async run({ interaction, client, args, color, emojis }) {
        await interaction.deferReply()
        client.functions.setInput(interaction)

        await client.syncButtons()
        const buttonName = args.getString('name') || args.getString('button')
        const subcommand = args.getSubcommand()
        const group = args.getSubcommandGroup()

        if (subcommand === 'list') {
            const guildButtons = await buttonModel.find({ guildId: interaction.guildId }).exec()
            if (!guildButtons.length)
                return interaction.editReply(`${emojis.error} Aún no hay botones creados en este servidor ${emojis.sweat}`)

            const buttonNames = guildButtons.map(button => `${emojis.dot} ${button.name}`)
            const pages: EmbedBuilder[] = []
            for (let index = 0; index < buttonNames.length; index += 10) {
                pages.push(new EmbedBuilder()
                    .setColor(color)
                    .setAuthor({ name: interaction.guild?.name || '', iconURL: interaction.guild?.iconURL() || undefined })
                    .setTitle('Lista de botones')
                    .setDescription(buttonNames.slice(index, index + 10).join('\n')))
            }
            return createEmbedPagination(interaction as ChatInputCommandInteraction<'cached'>, pages)
        }

        const buttonData = { guildId: interaction.guild?.id, customId: `arbtn_${buttonName}` }
        const buttonf = await buttonModel.findOne(buttonData).exec()

        if (subcommand === 'show') {
            if (!buttonf)
                return interaction.editReply(`${emojis.hmph} No existe un botón con ese nombre`)

            const button = new ButtonBuilder()
                .setCustomId(buttonf.customId)
                .setStyle(buttonf.data.style || ButtonStyle.Primary)
            if (buttonf.data.label) button.setLabel(buttonf.data.label)
            if (buttonf.data.emoji) button.setEmoji(buttonf.data.emoji)

            return interaction.editReply({
                content: `${emojis.check} Botón **${buttonName}**`,
                components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)]
            })
        }

        if (subcommand === 'create') {
            let button = new GButton()
            if (await buttonModel.countDocuments({ guildId: interaction.guild?.id }) >= 6)
                return interaction.editReply(`${emojis.error} Límite de 6 botones por servidor alcanzado. Considera eliminar alguno con /button delete`)
            if (!buttonName) return await interaction.editReply(`${emojis.hmph} Debes especificar un nombre para el botón`)
            if (buttonf) return await interaction.editReply(`${emojis.hmph} Ya existe un botón con ese nombre, prueba a editarlo con /button edit`)

            if (interaction.guild) button.guildId = interaction.guild?.id
            button.customId = `arbtn_${buttonName}`
            button.name = buttonName

            await buttonModel.create(button)
            await client.syncButtons()
            return await interaction.editReply(`${emojis.check} El botón **${buttonName}** fue creado correctamente`)
        }
        if (subcommand === 'delete') {
            if (!buttonf) return await interaction.editReply(`${emojis.hmph} No existe un botón con ese nombre, prueba a crearlo con /button create`)

            await buttonModel.deleteOne(buttonData)
            await client.syncButtons()
            return await interaction.editReply(`${emojis.check} El  botón **${buttonName}** fue eliminado correctamente`)
        }
        if (group === 'edit') {
            if (!buttonf) return await interaction.editReply(`${emojis.hmph} No existe un botón con ese nombre, prueba a crearlo con /button create`)

            let prevButton = new ButtonBuilder()
            prevButton.setCustomId(buttonf.customId)
            if (buttonf.data.label) prevButton.setLabel(buttonf.data.label)
            if (!isNaN(Number(buttonf.data.style))) prevButton.setStyle(Number(buttonf.data.style))
            if (buttonf.data.emoji) prevButton.setEmoji(buttonf.data.emoji)

            if (subcommand === 'reply') {
                let reply = args.getString('reply')
                let ephemeral = args.getBoolean('ephemeral')

                if (!reply) return await interaction.editReply(`${emojis.confused} Debes especificar una respuesta para el botón`)
                let ar: Autoresponder | undefined = undefined

                try {
                    ar = await client.functions.createAutoresponder(interaction as ExtendedInteraction, reply)
                } catch (e) { return interaction.editReply(`${e}`) }

                if (ar) await buttonModel.updateOne(buttonData, { reply: ar.arReply, ephemeral: ephemeral ?? false })
                await client.syncButtons()

                return await interaction.editReply({
                    content: `${emojis.check} Respuesta de botón actualizada`,
                    components: [
                        new ActionRowBuilder<ButtonBuilder>()
                            .setComponents([prevButton])
                    ]
                })
            }
            if (subcommand === 'data') {
                let label = args.getString('label')
                let style = args.getNumber('style')
                let emoji = args.getString('emoji')

                if (label) prevButton.setLabel(label.trim())
                if (style) prevButton.setStyle(style)
                if (emoji) prevButton.setEmoji(emoji.trim())

                const newData = {
                    label: label ?? buttonf.data.label,
                    style: style ?? ([1, 2, 3, 4].includes(Number(buttonf.data.style)) ? Number(buttonf.data.style) : ButtonStyle.Primary),
                    emoji: emoji ?? buttonf.data.emoji
                }

                await buttonModel.updateOne(buttonData, { data: newData })
                await client.syncButtons()

                return await interaction.editReply({
                    content: `${emojis.check} Datos de botón actualizados`,
                    components: [
                        new ActionRowBuilder<ButtonBuilder>()
                            .setComponents([prevButton])
                    ]
                })
            }
        }
    }
});
