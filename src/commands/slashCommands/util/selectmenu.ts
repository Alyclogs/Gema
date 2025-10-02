import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, SlashCommandBuilder, SelectMenuComponentOptionData, ComponentEmojiResolvable, ButtonBuilder, ChatInputCommandInteraction } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { Permissions } from '../../../util/Permissions'
import { Autoresponder, GButton, GSelectMenu, GSelectMenuOption, buttonModel, selectmenuModel } from '../../../models/gema-models';
import ExtendedInteraction from '../../../typing/ExtendedInteraction';
import { createEmbedPagination } from '../../../util/Pagination';

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
                .setDescription('Añade una opción a un menú de selección')),
    timeout: 0,
    memberperms: [Permissions.gestionarServidor],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async autocomplete({ interaction, client, args }) {
        client.selectmenus = await selectmenuModel.find({}).exec()
        const selmNames = client.selectmenus.map(s => s.name)

        try {
            const focusedValue = args.getFocused()
            if (!focusedValue) {
                await interaction.respond(selmNames.map(choice => ({ name: choice, value: choice })))
            } else {
                const filtered = selmNames.filter(choice => choice.startsWith(focusedValue))
                await interaction.respond(filtered.map(choice => ({ name: choice, value: choice })))
            }

        } catch (e) {
            console.log(`a: ${e}`)
        }
    },

    async run({ interaction, client, args, color, emojis }) {
        await interaction.deferReply({ ephemeral: true })
        client.selectmenus = await selectmenuModel.find({}).exec()

        const selmName = args.getString('name') || args.getString('selectmenu')
        const subcommand = args.getSubcommand()
        const group = args.getSubcommandGroup()

        let selmData = { guildId: interaction.guild?.id, customId: `arselm#${selmName}` }
        let selectmenuf = client.selectmenus.filter(sm => sm.guildId === interaction.guildId).find(sm => sm.customId === `arselm#${selmName}`)

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
        if (subcommand === 'create') {
            let selectmenu = new GSelectMenu()
            if (Array.from(client.selectmenus.filter(b => b.guildId === interaction.guild?.id)).length == 6)
                return interaction.editReply(`${emojis.error} Límite de 6 menús de selección por servidor alcanzado. Considera eliminar alguno con /selectmenu delete`)
            if (!selmName) return await interaction.editReply(`${emojis.hmph} Debes especificar un nombre para el menú de selección`)
            if (selectmenuf) return await interaction.editReply(`${emojis.hmph} Ya existe un menú de selección con ese nombre, prueba a editarlo con /selectmenu edit`)

            if (interaction.guild) selectmenu.guildId = interaction.guild?.id
            selectmenu.customId = `arselm#${selmName}`
            selectmenu.name = selmName

            await selectmenuModel.create(selectmenu)
            return await interaction.editReply(`${emojis.check} El menú de selección **${selmName}** fue creado correctamente`)
        }
        if (subcommand === 'delete') {
            if (!selectmenuf) return await interaction.editReply(`${emojis.hmph} No existe un menú de selección con ese nombre, prueba a crearlo con /selectmenu create`)

            await selectmenuModel.deleteOne(selmData)
            return await interaction.editReply(`${emojis.check} El  menú de selección **${selmName}** fue eliminado correctamente`)
        }
        if (group === 'edit' || subcommand === 'add-option') {
            if (!selectmenuf) return await interaction.editReply(`${emojis.hmph} No existe un menú de selección con ese nombre, prueba a crearlo con /selectmenu create`)

            let alloptions: SelectMenuComponentOptionData[] | undefined = undefined
            let prevSelm = new StringSelectMenuBuilder()
                .setCustomId(selectmenuf.customId)
            if (selectmenuf.data.minValues) prevSelm.setMinValues(selectmenuf.data.minValues)
            if (selectmenuf.data.maxValues) prevSelm.setMaxValues(selectmenuf.data.maxValues)
            if (selectmenuf.data.placeholder) prevSelm.setPlaceholder(selectmenuf.data.placeholder)
            if (selectmenuf.data.options?.length) {
                prevSelm.setOptions(selectmenuf.data.options)
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

            if (subcommand === 'data') {
                let minvalues = args.getNumber('min-values')
                let maxvalues = args.getNumber('max-values')
                let placeholder = args.getString('placeholder')
                let ephemeral = args.getBoolean('ephemeral')

                interface SelectMenuData {
                    data: {
                        placeholder?: string
                        minvalues?: number
                        maxvalues?: number
                        options?: SelectMenuComponentOptionData[]
                    }
                    ephemeral?: boolean
                }

                const dataToEdit: SelectMenuData = { data: {} }
                if (placeholder || minvalues || maxvalues || ephemeral) {
                    if (placeholder) {
                        dataToEdit.data.placeholder = placeholder
                        prevSelm.setPlaceholder(placeholder)
                    }
                    if (ephemeral) dataToEdit.ephemeral = ephemeral
                    if (minvalues || maxvalues) {
                        if (minvalues && maxvalues && minvalues > maxvalues) return await interaction.editReply(`${emojis.error} El número mínimo de opciones seleccionables debe ser menor al número máximo`)
                        if (minvalues && isNaN(Number(minvalues))) return await interaction.editReply(`${emojis.error} El número mínimo de opciones seleccionables no es un número válido`)
                        if (maxvalues && isNaN(Number(maxvalues))) return await interaction.editReply(`${emojis.error} El número máximo de opciones seleccionables no es un número válido`)

                        if (minvalues && !isNaN(Number(minvalues))) {
                            dataToEdit.data.minvalues = Number(minvalues)
                            prevSelm.setMinValues(minvalues)
                        }
                        if (maxvalues && !isNaN(Number(maxvalues))) {
                            dataToEdit.data.maxvalues = Number(maxvalues)
                            prevSelm.setMaxValues(maxvalues)
                        }
                    }
                    await selectmenuModel.updateOne(selmData, dataToEdit)
                }

                return await interaction.editReply({
                    content: `${emojis.check} Datos de menú de selección actualizados. \nSi el menú de selección no se muestra, es porque hay un error en los datos, intenta añadirle más opciones`,
                    components: components || []
                })
            }
            if (subcommand === 'add-option') {
                let label = args.getString('label')
                let desc = args.getString('desc')
                let emoji = args.getString('emoji')
                let reply = args.getString('reply')

                if (!label) return await interaction.editReply(`${emojis.confused} Debes especificar el título para la opción`)
                let index = alloptions?.length || 1

                let opcion: GSelectMenuOption = { index: index, label: label, value: label + "_" + index }
                if (emoji && !emoji.match(/^:.*?:$|^<a?:.*?:\d+>$/) && !emoji.match(/[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/u)) return await interaction.reply({
                    content: `${emojis.error} El emoji ingresado no es válido. Intenta ingresar uno con los siguientes formatos: \`:emoji:\` \`<emoji:id>\` o un emoji unicode: \\🤍`,
                    components: []
                })
                if (desc) opcion.description = desc
                if (emoji) opcion.emoji = emoji

                if (reply) {
                    let ar: Autoresponder | undefined = undefined

                    try {
                        ar = await client.functions.createAutoresponder(interaction as ExtendedInteraction, reply)
                    } catch (e) { return interaction.reply(`${e}`) }

                    if (ar) opcion.reply = ar.arReply
                }

                if (alloptions?.length) alloptions.push(opcion)
                else alloptions = [opcion]

                await selectmenuModel.updateOne(selmData, { "data.options": alloptions })
                prevSelm.setOptions(alloptions)

                return await interaction.editReply({
                    content: `${emojis.check} Opción añadida al menú de selección`,
                    components: components
                })
            }
        }
    }
})