import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, EmbedBuilder, SlashCommandBuilder, SelectMenuComponentOptionData, ComponentEmojiResolvable, ButtonBuilder, ChatInputCommandInteraction, ButtonStyle } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { Permissions } from '../../../util/Permissions'
import { Autoresponder, GButton, GSelectMenu, GSelectMenuOption, buttonModel, selectmenuModel } from '../../../models/gema-models';
import ExtendedInteraction from '../../../typing/ExtendedInteraction';
import { createEmbedPagination } from '../../../util/Pagination';

const normalizeSelectMenuOptions = (options?: GSelectMenuOption[]) =>
    (options ?? []).map(option => ({
        label: option.label,
        value: option.value,
        description: option.description,
        emoji: option.emoji as ComponentEmojiResolvable | undefined
    }))

const isValidEmoji = (emoji: string) => {
    try {
        new StringSelectMenuOptionBuilder().setLabel('Opción').setValue('option').setEmoji(emoji).toJSON()
        return true
    } catch {
        return false
    }
}

export default new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('selectmenu')
        .setDescription('Crea o gestiona los menús de selección para tus mensajes')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Crea un menú de selección')
                .addStringOption(opt => opt.setName('name').setDescription('El nombre para tu menú de selección').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Muestra un menú de selección')
                .addStringOption(opt => opt.setName('name').setDescription('El nombre para tu menú de selección').setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lista los menús de selección de este servidor'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Muestra información sobre un menú de selección')
                .addStringOption(opt => opt.setName('name').setDescription('El nombre del menú de selección').setRequired(true).setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Elimina un menú de selección')
                .addStringOption(opt => opt.setName('name').setDescription('El nombre del menú de selección').setRequired(true).setAutocomplete(true)))
        .addSubcommandGroup(group =>
            group
                .setName('edit')
                .setDescription('Edita la respuesta o la información de un menú de selección')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('reply')
                        .setDescription('Edita la respuesta que se mostrará cuando se haga clic en un menú de selección')
                        .addStringOption(opt => opt.setName('selectmenu').setDescription('El nombre del menú de selección').setRequired(true).setAutocomplete(true))
                        .addStringOption(opt => opt.setName('reply').setDescription('La respuesta para tu menú de selección, puedes incluir variables para autoresponders').setRequired(true))
                        .addBooleanOption(opt => opt.setName('ephemeral').setDescription('Respuesta visible sólo para el que interactuó con el menú de selección')))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('data')
                        .setDescription('Edita los datos de un menú de selección')
                        .addStringOption(opt => opt.setName('selectmenu').setDescription('El nombre del menú de selección').setRequired(true).setAutocomplete(true))
                        .addNumberOption(opt => opt.setName('min-values').setDescription('El número mínimo de opciones seleccionables permitidas'))
                        .addNumberOption(opt => opt.setName('max-values').setDescription('El número máximo de opciones seleccionables permitidas'))
                        .addStringOption(opt => opt.setName('placeholder').setDescription('El texto a mostrar en el menú de selección'))
                        .addBooleanOption(opt => opt.setName('ephemeral').setDescription('Indica si la respuesta del menú de selección es privada'))))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-option')
                .setDescription('Añade una opción a un menú de selección')
                .addStringOption(opt => opt.setName('selectmenu').setDescription('El nombre del menú de selección').setRequired(true).setAutocomplete(true))
                .addStringOption(opt => opt.setName('label').setDescription('El título de la opción').setRequired(true))
                .addStringOption(opt => opt.setName('description').setDescription('La descripción de la opción'))
                .addStringOption(opt => opt.setName('reply').setDescription('La respuesta cuando se seleccione la opción'))
                .addStringOption(opt => opt.setName('emoji').setDescription('El emoji para la opción')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit-option')
                .setDescription('Edita una opción de un menú de selección')
                .addStringOption(opt => opt.setName('selectmenu').setDescription('El nombre del menú de selección').setRequired(true).setAutocomplete(true))
                .addStringOption(opt => opt.setName('option').setDescription('La etiqueta, valor o índice de la opción').setRequired(true).setAutocomplete(true))
                .addStringOption(opt => opt.setName('label').setDescription('El nuevo título de la opción').setMaxLength(100))
                .addStringOption(opt => opt.setName('description').setDescription('La nueva descripción de la opción').setMaxLength(100))
                .addStringOption(opt => opt.setName('reply').setDescription('La nueva respuesta de la opción'))
                .addStringOption(opt => opt.setName('emoji').setDescription('El nuevo emoji de la opción')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete-option')
                .setDescription('Elimina una opción de un menú de selección')
                .addStringOption(opt => opt.setName('selectmenu').setDescription('El nombre del menú de selección').setRequired(true).setAutocomplete(true))
                .addStringOption(opt => opt.setName('option').setDescription('La etiqueta, valor o índice de la opción').setRequired(true).setAutocomplete(true))),
    timeout: 0,
    memberperms: [Permissions.gestionarServidor],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async autocomplete({ interaction, client, args }) {
        client.selectmenus = await selectmenuModel.find({ guildId: interaction.guildId }).exec()
        const focused = args.getFocused(true)
        const selectedMenu = client.selectmenus.find(menu => menu.name === args.getString('selectmenu'))
        const choices = focused.name === 'option'
            ? (selectedMenu?.data.options ?? []).map(option => ({ name: option.label, value: option.value }))
            : client.selectmenus.map(menu => ({ name: menu.name, value: menu.name }))

        try {
            const focusedValue = focused.value
            if (!focusedValue) {
                await interaction.respond(choices.slice(0, 25))
            } else {
                const filtered = choices.filter(choice => choice.name.toLowerCase().startsWith(focusedValue.toLowerCase()))
                await interaction.respond(filtered.slice(0, 25))
            }

        } catch (e) {
            console.log(`a: ${e}`)
        }
    },

    async run({ interaction, client, args, color, emojis }) {
        await interaction.deferReply()
        client.functions.setInput(interaction)

        try {
            client.selectmenus = await selectmenuModel.find({}).exec()
        } catch (error) {
            console.error('[⚠️] No se pudieron cargar los menús de selección desde MongoDB:', error)
            client.selectmenus = []
        }

        const selmName = args.getString('name') || args.getString('selectmenu')
        const subcommand = args.getSubcommand()
        const group = args.getSubcommandGroup()

        const selmData = { guildId: interaction.guild?.id, customId: `arselm#${selmName}` }
        let selectmenuf = await selectmenuModel.findOne(selmData).exec()

        if (subcommand === 'list') {
            if (client.selectmenus.filter((em) => em.guildId === interaction.guild?.id).length) {
                let embedNames = client.selectmenus.filter((em) => em.guildId === interaction.guild?.id).map(function (em) {
                    return `${emojis['dot']} ${em.name}`
                })
                let selectmenus: EmbedBuilder[] = [], sliced = []

                for (let i = 0; i < embedNames.length; i += 10) {
                    sliced.push(embedNames.slice(i, i + 10))
                }

                sliced.forEach(embs => {
                    let emb = new EmbedBuilder()
                        .setColor(color)
                        .setAuthor({ name: interaction.guild?.name || '', iconURL: interaction.guild?.iconURL() || undefined })
                        .setTitle('Lista de menús de selección')
                        .setDescription(embs.join('\n'))
                    selectmenus.push(emb)
                })
                return createEmbedPagination(interaction as ChatInputCommandInteraction<"cached">, selectmenus)
            } else {
                return interaction.editReply(`${emojis.error} Aún no hay menús de selección creados en este servidor ${emojis.sweat}`)
            }
        }
        if (subcommand === 'show') {
            if (!selectmenuf) return await interaction.editReply(`${emojis.hmph} No existe un menú de selección con ese nombre, prueba a crearlo con /selectmenu create`)

            let selm = new StringSelectMenuBuilder()
                .setCustomId(selectmenuf.customId)
            const optionCount = Math.max(selectmenuf.data.options?.length ?? 0, 1)
            const maxValues = Math.min(selectmenuf.data.maxValues ?? 1, optionCount)
            const minValues = Math.min(selectmenuf.data.minValues ?? 1, maxValues)
            selm.setMinValues(minValues).setMaxValues(maxValues)
            if (selectmenuf.data.placeholder) selm.setPlaceholder(selectmenuf.data.placeholder)
            if (selectmenuf.data.options?.length) {
                selm.setOptions(normalizeSelectMenuOptions(selectmenuf.data.options))
            } else {
                selm.addOptions([{ label: "Opción de ejemplo", value: "ejemplo", description: "Descripción de ejemplo" }])
            }

            return await interaction.editReply({
                content: `${emojis.check} Menú de selección **${selmName}**`,
                components: [new ActionRowBuilder<StringSelectMenuBuilder>().setComponents([selm])]
            })
        }
        if (subcommand === 'info') {
            if (!selectmenuf) return await interaction.editReply(`${emojis.hmph} No existe un menú de selección con ese nombre, prueba a crearlo con /selectmenu create`)

            const infoSelect = new StringSelectMenuBuilder()
                .setCustomId(`info_${selectmenuf.customId}`)
                .setPlaceholder('Selecciona una opción para ver más información')

            if (selectmenuf.data.options?.length) {
                selectmenuf.data.options.forEach((opt, index) => {
                    infoSelect.addOptions({
                        label: opt.label,
                        value: opt.value,
                        description: "Selecciona para ver la información de esta opción",
                        emoji: opt.emoji as ComponentEmojiResolvable | undefined
                    })
                })
            }

            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: interaction.guild?.name || '', iconURL: interaction.guild?.iconURL() || undefined })
                .setTitle(`Información del menú de selección **${selmName}**`)
                .setDescription(`**ID:** ${selectmenuf.customId}\n**Nombre:** ${selectmenuf.name}\n**Opciones:** ${selectmenuf.data.options?.length || 0}\n**Mínimo de opciones seleccionables:** ${selectmenuf.data.minValues || 1}\n**Máximo de opciones seleccionables:** ${selectmenuf.data.maxValues || 1}\n**Placeholder:** ${selectmenuf.data.placeholder || 'Ninguno'}\n**Ephemeral:** ${selectmenuf.ephemeral ? 'Sí' : 'No'}`)

            const button = new ActionRowBuilder<ButtonBuilder>()
                .setComponents([new ButtonBuilder()
                    .setCustomId(`showInfo|${selectmenuf.customId}`)
                    .setLabel('Mostrar Información')
                    .setStyle(ButtonStyle.Primary)
                ])
            const components = selectmenuf.data.options?.length
                ? [new ActionRowBuilder<StringSelectMenuBuilder>().setComponents([infoSelect]), button]
                : [button]
            return await interaction.editReply({ embeds: [embed], components })
        }
        if (subcommand === 'create') {
            let selectmenu = new GSelectMenu()
            if (await selectmenuModel.countDocuments({ guildId: interaction.guild?.id }) >= 6)
                return interaction.editReply(`${emojis.error} Límite de 6 menús de selección por servidor alcanzado. Considera eliminar alguno con /selectmenu delete`)
            if (!selmName) return await interaction.editReply(`${emojis.hmph} Debes especificar un nombre para el menú de selección`)
            if (selectmenuf) return await interaction.editReply(`${emojis.hmph} Ya existe un menú de selección con ese nombre, prueba a editarlo con /selectmenu edit`)

            if (interaction.guild) selectmenu.guildId = interaction.guild?.id
            selectmenu.customId = `arselm#${selmName}`
            selectmenu.name = selmName

            await selectmenuModel.create(selectmenu)
            client.selectmenus = await selectmenuModel.find({}).exec()
            return await interaction.editReply(`${emojis.check} El menú de selección **${selmName}** fue creado correctamente`)
        }
        if (subcommand === 'delete') {
            if (!selectmenuf) return await interaction.editReply(`${emojis.hmph} No existe un menú de selección con ese nombre, prueba a crearlo con /selectmenu create`)

            await selectmenuModel.deleteOne(selmData)
            client.selectmenus = await selectmenuModel.find({}).exec()
            return await interaction.editReply(`${emojis.check} El  menú de selección **${selmName}** fue eliminado correctamente`)
        }
        if (group === 'edit' || ['add-option', 'edit-option', 'delete-option'].includes(subcommand)) {
            if (!selectmenuf) return await interaction.editReply(`${emojis.hmph} No existe un menú de selección con ese nombre, prueba a crearlo con /selectmenu create`)

            let alloptions: SelectMenuComponentOptionData[] | undefined = undefined
            let prevSelm = new StringSelectMenuBuilder()
                .setCustomId(selectmenuf.customId)
            const previewOptionCount = Math.max(selectmenuf.data.options?.length ?? 0, 1)
            const previewMax = Math.min(selectmenuf.data.maxValues ?? 1, previewOptionCount)
            const previewMin = Math.min(selectmenuf.data.minValues ?? 1, previewMax)
            prevSelm.setMinValues(previewMin).setMaxValues(previewMax)
            if (selectmenuf.data.placeholder) prevSelm.setPlaceholder(selectmenuf.data.placeholder)
            if (selectmenuf.data.options?.length) {
                prevSelm.setOptions(normalizeSelectMenuOptions(selectmenuf.data.options))
            } else {
                prevSelm.addOptions([{ label: "Opción de ejemplo", value: "ejemplo", description: "Descripción de ejemplo" }])
            }

            alloptions = selectmenuf.data.options

            await client.syncButtons()

            const editSelmRow = new ActionRowBuilder<ButtonBuilder>()
                .setComponents([
                    (client.buttons.get('btnEditSelmData') as GButton).getButton(),
                    (client.buttons.get('btnEditSelmOptions') as GButton).getButton()
                ])

            let components = [
                new ActionRowBuilder<StringSelectMenuBuilder>()
                    .setComponents([prevSelm]), editSelmRow
            ]

            if (subcommand === 'reply') {
                const reply = args.getString('reply', true)
                const ephemeral = args.getBoolean('ephemeral') ?? false
                let autoresponder: Autoresponder

                try {
                    autoresponder = await client.functions.createAutoresponder(interaction as ExtendedInteraction, reply)
                } catch (error) {
                    return interaction.editReply(`${emojis.error} ${error}`)
                }

                await selectmenuModel.updateOne(selmData, {
                    $set: { reply: autoresponder.arReply, ephemeral }
                })
                client.selectmenus = await selectmenuModel.find({}).exec()
                return interaction.editReply({
                    content: `${emojis.check} Respuesta general del menú actualizada`,
                    components
                })
            }
            if (subcommand === 'data') {
                const minvalues = args.getNumber('min-values')
                const maxvalues = args.getNumber('max-values')
                const placeholder = args.getString('placeholder')
                const ephemeral = args.getBoolean('ephemeral')
                const nextMin = minvalues ?? selectmenuf.data.minValues ?? 1
                const nextMax = maxvalues ?? selectmenuf.data.maxValues ?? 1
                const optionCount = Math.max(selectmenuf.data.options?.length ?? 0, 1)

                if (!Number.isInteger(nextMin) || !Number.isInteger(nextMax) || nextMin < 0 || nextMax < 1)
                    return interaction.editReply(`${emojis.error} El mínimo y máximo deben ser números enteros válidos`)
                if (nextMin > nextMax)
                    return interaction.editReply(`${emojis.error} El número mínimo no puede superar al máximo`)
                if (nextMax > optionCount)
                    return interaction.editReply(`${emojis.error} El máximo no puede superar las ${optionCount} opciones disponibles`)

                const updates: Record<string, unknown> = {
                    'data.minValues': nextMin,
                    'data.maxValues': nextMax
                }
                if (placeholder !== null) updates['data.placeholder'] = placeholder
                if (ephemeral !== null) updates.ephemeral = ephemeral

                await selectmenuModel.updateOne(selmData, { $set: updates })
                prevSelm.setMinValues(nextMin).setMaxValues(nextMax)
                if (placeholder) prevSelm.setPlaceholder(placeholder)
                client.selectmenus = await selectmenuModel.find({}).exec()

                return await interaction.editReply({
                    content: `${emojis.check} Datos de menú de selección actualizados`,
                    components
                })
            }
            if (subcommand === 'delete-option') {
                let optionToDelete = args.getString('option')

                if (!optionToDelete) return await interaction.editReply(`${emojis.confused} Debes especificar la opción a eliminar`)

                const normalizedTarget = optionToDelete.trim()
                const initialOptions = alloptions ?? selectmenuf.data.options ?? []

                const targetOption = initialOptions.find(option =>
                    option.label === normalizedTarget ||
                    option.value === normalizedTarget ||
                    `${(option as GSelectMenuOption).index ?? ''}` === normalizedTarget
                )

                if (!targetOption) return await interaction.editReply(`${emojis.hmph} No existe una opción con ese valor en el menú de selección`)

                alloptions = initialOptions.filter(option => option !== targetOption)

                const remainingCount = Math.max(alloptions.length, 1)
                const nextMax = Math.min(selectmenuf.data.maxValues ?? 1, remainingCount)
                const nextMin = Math.min(selectmenuf.data.minValues ?? 1, nextMax)
                await selectmenuModel.updateOne(selmData, { $set: {
                    'data.options': alloptions,
                    'data.minValues': nextMin,
                    'data.maxValues': nextMax
                } })
                prevSelm.setMinValues(nextMin).setMaxValues(nextMax)
                prevSelm.setOptions(alloptions.length ? normalizeSelectMenuOptions(alloptions) : [{
                    label: 'Opción de ejemplo', value: 'ejemplo', description: 'Añade opciones para activar este menú'
                }])
                client.selectmenus = await selectmenuModel.find({}).exec()

                return await interaction.editReply({
                    content: `${emojis.check} Opción eliminada del menú de selección`,
                    components: [
                        new ActionRowBuilder<StringSelectMenuBuilder>().setComponents([prevSelm]),
                        new ActionRowBuilder<ButtonBuilder>().setComponents([
                            (client.buttons.get('btnEditSelmData') as GButton).getButton(),
                            (client.buttons.get('btnEditSelmOptions') as GButton).getButton()
                        ])
                    ]
                })
            }
            if (subcommand === 'add-option') {
                let label = args.getString('label')
                let desc = args.getString('description')
                let emoji = args.getString('emoji')
                let reply = args.getString('reply')

                if (!label) return await interaction.editReply(`${emojis.confused} Debes especificar el título para la opción`)
                if ((alloptions?.length ?? 0) >= 25) return interaction.editReply(`${emojis.error} El menú ya tiene 25 opciones`)
                const index = Math.max(0, ...(alloptions ?? []).map(option => (option as GSelectMenuOption).index ?? 0)) + 1

                let opcion: GSelectMenuOption = { index: index, label: label, value: `option_${index}` }
                if (emoji && !emoji.match(/^:.*?:$|^<a?:.*?:\d+>$/) && !emoji.match(/[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/u)) return await interaction.editReply({
                    content: `${emojis.error} El emoji ingresado no es válido. Intenta ingresar uno con los siguientes formatos: \`:emoji:\` \`<emoji:id>\` o un emoji unicode: \\🤍`,
                    components: []
                })
                if (desc) opcion.description = desc
                if (emoji) opcion.emoji = emoji

                if (reply) {
                    let ar: Autoresponder | undefined = undefined

                    try {
                        ar = await client.functions.createAutoresponder(interaction as ExtendedInteraction, reply)
                    } catch (e) { return interaction.editReply(`${e}`) }

                    if (ar) opcion.reply = ar.arReply
                }

                if (alloptions?.length) alloptions.push(opcion)
                else alloptions = [opcion]

                await selectmenuModel.updateOne(selmData, { $set: { 'data.options': alloptions } })
                prevSelm.setOptions(normalizeSelectMenuOptions(alloptions))
                client.selectmenus = await selectmenuModel.find({}).exec()

                return await interaction.editReply({
                    content: `${emojis.check} Opción añadida al menú de selección`,
                    components: [
                        new ActionRowBuilder<StringSelectMenuBuilder>().setComponents([prevSelm]),
                        new ActionRowBuilder<ButtonBuilder>().setComponents([
                            (client.buttons.get('btnEditSelmData') as GButton).getButton(),
                            (client.buttons.get('btnEditSelmOptions') as GButton).getButton()
                        ])
                    ]
                })
            }
            if (subcommand === 'edit-option') {
                const target = args.getString('option', true).trim()
                const options = (alloptions ?? selectmenuf.data.options ?? []) as GSelectMenuOption[]
                const optionIndex = options.findIndex(option =>
                    option.label === target || option.value === target || `${option.index ?? ''}` === target
                )
                if (optionIndex === -1)
                    return interaction.editReply(`${emojis.hmph} No existe una opción con esa etiqueta, valor o índice`)

                const option = { ...options[optionIndex] }
                const label = args.getString('label')
                const description = args.getString('description')
                const reply = args.getString('reply')
                const emoji = args.getString('emoji')

                if (label !== null) option.label = label
                if (description !== null) option.description = description
                if (emoji !== null) {
                    if (!isValidEmoji(emoji)) return interaction.editReply(`${emojis.error} El emoji ingresado no es válido`)
                    option.emoji = emoji
                }
                if (reply !== null) {
                    try {
                        option.reply = (await client.functions.createAutoresponder(interaction as ExtendedInteraction, reply)).arReply
                    } catch (error) {
                        return interaction.editReply(`${emojis.error} ${error}`)
                    }
                }

                options[optionIndex] = option
                await selectmenuModel.updateOne(selmData, { $set: { 'data.options': options } })
                prevSelm.setOptions(normalizeSelectMenuOptions(options))
                client.selectmenus = await selectmenuModel.find({}).exec()

                return interaction.editReply({
                    content: `${emojis.check} Opción **${option.label}** actualizada`,
                    components: [new ActionRowBuilder<StringSelectMenuBuilder>().setComponents([prevSelm])]
                })
            }
        }
    }
})
