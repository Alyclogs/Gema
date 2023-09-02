import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, SlashCommandBuilder, SelectMenuComponentOptionData, ComponentEmojiResolvable, ButtonBuilder } from 'discord.js';
import { SlashCommand } from '../../../structures/Command';
import { Permissions } from '../../../util/Permissions'
import { Autoresponder, GButton, GSelectMenu, buttonModel, selectmenuModel } from '../../../models/gema-models';
import ExtendedInteraction from '../../../typing/ExtendedInteraction';

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
                        .addStringOption(opt => opt.setName('placeholder').setDescription('El texto a mostrar en el menú de selección'))))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-option')
                .setDescription('Añade una opción a un menú de selección')
                .addStringOption(opt => opt.setName('selectmenu').setDescription('El nombre del menú de selección').setRequired(true).setAutocomplete(true))
                .addStringOption(opt => opt.setName('label').setDescription('El título de la opción').setRequired(true))
                .addStringOption(opt => opt.setName('description').setDescription('La descripción de la opción').setRequired(true))
                .addStringOption(opt => opt.setName('value').setDescription('El valor de la opción, puedes colocar un @rol').setRequired(true))
                .addStringOption(opt => opt.setName('respuesta').setDescription('La respuesta cuando se seleccione la opción'))
                .addStringOption(opt => opt.setName('emoji').setDescription('El emoji para la opción')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit-option')
                .setDescription('Añade una opción a un menú de selección')
                .addStringOption(opt => opt.setName('selectmenu').setDescription('El nombre del menú de selección').setRequired(true).setAutocomplete(true))
                .addStringOption(opt => opt.setName('label').setDescription('El título de la opción').setRequired(true))
                .addStringOption(opt => opt.setName('description').setDescription('La descripción de la opción').setRequired(true))
                .addStringOption(opt => opt.setName('value').setDescription('El valor de la opción, puedes colocar un @rol').setRequired(true))
                .addStringOption(opt => opt.setName('emoji').setDescription('El emoji para la opción'))),
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
        await interaction.deferReply()
        const { createAutoresponder } = (await import('../../../util/functions'))?.default(client, interaction)
        client.selectmenus = await selectmenuModel.find({}).exec()

        const selmName = args.getString('name') || args.getString('selectmenu')
        const subcommand = args.getSubcommand()
        const group = args.getSubcommandGroup()

        let selmData = { guildId: interaction.guild?.id, customId: `arselm:${selmName}` }
        let selectmenuf = client.selectmenus.find(sm => sm.customId === `arselm:${selmName}`)

        if (subcommand === 'create') {
            let selectmenu = new GSelectMenu()
            if (Array.from(client.selectmenus.filter(b => b.guildId === interaction.guild?.id)).length == 6)
                return interaction.editReply(`${emojis.error} Límite de 6 menús de selección por servidor alcanzado. Considera eliminar alguno con /selectmenu delete`)
            if (!selmName) return await interaction.editReply(`${emojis.hmph} Debes especificar un nombre para el menú de selección`)
            if (selectmenuf) return await interaction.editReply(`${emojis.hmph} Ya existe un menú de selección con ese nombre, prueba a editarlo con /selectmenu edit`)

            if (interaction.guild) selectmenu.guildId = interaction.guild?.id
            selectmenu.customId = `arselm:${selmName}`
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
                alloptions = selectmenuf.data.options
            } else {
                prevSelm.addOptions([{ label: "Opción de ejemplo", value: "opcion1", description: "Descripción de ejemplo" }])
            }

            await client.syncButtons()
            const gbtn1 = client.buttons.find(b => b.customId === 'btnEditSelmData') as GButton
            const gbtn2 = client.buttons.find(b => b.customId === 'btnEditSelmOptions') as GButton

            const editSelmRow = new ActionRowBuilder<ButtonBuilder>()
                .setComponents([
                    new ButtonBuilder().setCustomId(gbtn1.customId).setStyle(gbtn1.data.style)
                        .setLabel(gbtn1.data.label).setEmoji(gbtn1.data.emoji as ComponentEmojiResolvable),
                    new ButtonBuilder().setCustomId(gbtn2.customId).setStyle(gbtn2.data.style)
                        .setLabel(gbtn2.data.label).setEmoji(gbtn2.data.emoji as ComponentEmojiResolvable)
                ])

            let msg = await interaction.editReply({
                components: [
                    new ActionRowBuilder<StringSelectMenuBuilder>()
                        .setComponents([prevSelm]), editSelmRow
                ]
            })

            if (subcommand === 'data') {
                let minvalues = args.getNumber('min-values')
                let maxvalues = args.getNumber('max-values')
                let placeholder = args.getString('placeholder')

                interface SelectMenuData {
                    data: {
                        placeholder?: string
                        minvalues?: number
                        maxvalues?: number
                    }
                }

                const dataToEdit: SelectMenuData = { data: {} }
                if (placeholder || minvalues || maxvalues) {
                    if (placeholder) {
                        dataToEdit.data.placeholder = placeholder
                        prevSelm.setPlaceholder(placeholder)
                    }
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

                return await msg.edit({
                    content: `${emojis.check} Datos de menú de selección actualizados`,
                    components: [
                        new ActionRowBuilder<StringSelectMenuBuilder>()
                            .setComponents(prevSelm), editSelmRow
                    ]
                })
            }
            if (subcommand === 'add-option') {
                let label = args.getString('label')
                let desc = args.getString('desc')
                let emoji = args.getString('emoji')

                if (!label) return await interaction.editReply(`${emojis.confused} Debes especificar el título para la opción`)
                if (!desc) return await interaction.editReply(`${emojis.confused} Debes especificar el título para la opción`)
                if (emoji && !emoji.match(/^:.*?:$|^<a?:.*?:\d+>$/)) return await interaction.editReply(`${emojis.error} El emoji ingresado no es válido. Intenta ingresar uno con los siguientes formatos: \`:emoji:\` \`<emoji:id>\`. Puedes hacerlo colocando un \`\\\` ántes del emoji.`)

                let opcion = {
                    label: label,
                    description: desc,
                    value: label.toLowerCase().replace(/ /g, '_'),
                    emoji: emoji as ComponentEmojiResolvable,
                }

                if (alloptions?.length) alloptions.push(opcion)
                else alloptions = [opcion]

                await selectmenuModel.updateOne(selmData, { options: alloptions })
                prevSelm.addOptions(opcion)

                return await interaction.editReply({
                    content: `${emojis.check} Opción añadida al menú de selección`,
                    components: [new ActionRowBuilder<StringSelectMenuBuilder>()
                        .setComponents(prevSelm)]
                })
            }
        }
    }
})