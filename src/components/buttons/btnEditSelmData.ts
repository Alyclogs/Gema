import { ActionRowBuilder, ModalActionRowComponentBuilder, ModalBuilder, StringSelectMenuComponent, TextInputBuilder, TextInputStyle } from "discord.js";
import { GButton, GSelectMenu } from "../../models/gema-models";

const btnEditSelmData = new GButton()
btnEditSelmData.customId = 'btnEditSelmData'
btnEditSelmData.data.style = 1
btnEditSelmData.data.label = 'Editar datos'
btnEditSelmData.data.emoji = '<:settings:1151582651535347814>'

btnEditSelmData.run = async ({ interaction, client }) => {
    const selectmenu = interaction.message.components[0].components[0] as StringSelectMenuComponent
    const gselectmenu = client.selectmenus.filter(s => s.guildId === interaction.guildId).find(s => s.customId === selectmenu.customId) as GSelectMenu

    const txtPlaceholder = new TextInputBuilder()
        .setCustomId('txtSelmPlaceholder')
        .setLabel('Texto del menú de selección')
        .setStyle(TextInputStyle.Short)
        .setMinLength(3)
        .setRequired(false)
        .setPlaceholder('Ejemplo: Seleccione una opción')
    if (selectmenu.placeholder) txtPlaceholder.setValue(selectmenu.placeholder)

    const txtMinvalues = new TextInputBuilder()
        .setCustomId('txtSelmMinValues')
        .setLabel('Mínimo de opciones seleccionables')
        .setPlaceholder('Ejemplo: 1')
        .setMaxLength(2)
        .setRequired(false)
        .setValue(`${selectmenu.data.min_values || ''}`)
        .setStyle(TextInputStyle.Short)
    if (selectmenu.minValues) txtMinvalues.setValue(`${selectmenu.minValues}`)

    const txtMaxvalues = new TextInputBuilder()
        .setCustomId('txtSelmMaxValues')
        .setLabel('Máximo de opciones seleccionables')
        .setPlaceholder('Ejemplo: 1')
        .setMaxLength(2)
        .setRequired(false)
        .setValue(`${selectmenu.data.max_values || ''}`)
        .setStyle(TextInputStyle.Short)
    if (selectmenu.maxValues) txtMaxvalues.setValue(`${selectmenu.maxValues}`)

    const txtReply = new TextInputBuilder()
        .setCustomId('txtSelmReply')
        .setLabel('Respuesta general del menú de selección')
        .setPlaceholder('Ejemplo: Se te añadieron los roles seleccionados!')
        .setValue(`${gselectmenu.reply || ''}`)
        .setRequired(false)
        .setStyle(TextInputStyle.Paragraph)
    if (gselectmenu.reply) txtReply.setValue(gselectmenu.reply.rawreply)

    const txtEphemeral = new TextInputBuilder()
        .setCustomId('txtEphemeral')
        .setLabel('Respuesta visible sólo para el usuario')
        .setPlaceholder('true/false')
        .setValue('false')
        .setRequired(false)
        .setStyle(TextInputStyle.Short)
    if (gselectmenu.ephemeral) txtEphemeral.setValue(`${gselectmenu.ephemeral}`)

    const modalEditData = new ModalBuilder()
        .setCustomId(`mdlEditSelmData_${gselectmenu.name}`)
        .setTitle('Datos del menú de selección')
        .setComponents([
            new ActionRowBuilder<ModalActionRowComponentBuilder>()
                .setComponents(txtPlaceholder),
            new ActionRowBuilder<ModalActionRowComponentBuilder>()
                .setComponents(txtMinvalues),
            new ActionRowBuilder<ModalActionRowComponentBuilder>()
                .setComponents(txtMaxvalues),
            new ActionRowBuilder<ModalActionRowComponentBuilder>()
                .setComponents(txtEphemeral),
            new ActionRowBuilder<ModalActionRowComponentBuilder>()
                .setComponents(txtReply)
        ])

    await interaction.showModal(modalEditData)
}

export default btnEditSelmData;