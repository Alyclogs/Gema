import { ActionRowBuilder, ModalActionRowComponentBuilder, ModalBuilder, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from 'discord.js'
import { GSelectMenu, selectmenuModel } from '../../models/gema-models'

// customId dinámico: `editing_<customId del selectmenu>` (ver btnEditSelmOptions.ts), resuelto por prefijo
const selmEditOption = new GSelectMenu()
selmEditOption.customId = 'editing_'
selmEditOption.prefix = true

selmEditOption.run = async ({ client, interaction, params }) => {
    const selectInteraction = interaction as StringSelectMenuInteraction

    client.selectmenus = await selectmenuModel.find({}).exec()
    const selectmenu = client.selectmenus.find(s => s.guildId === selectInteraction.guildId && s.customId === params)
    if (!selectmenu) return

    const option = selectInteraction.component.options.find(o => o.value === selectInteraction.values[0])
    const goption = selectmenu.data.options?.find(o => o.value === option?.value)

    if (!option || !goption) return

    const txtEmoji = new TextInputBuilder()
        .setCustomId('txtSelmOptionEmoji')
        .setLabel('Emoji de la opción')
        .setPlaceholder(`:heart:`)
        .setRequired(false)
        .setStyle(TextInputStyle.Short)
    if (option.emoji) txtEmoji.setValue(`${option.emoji.name}`)

    const txtLabel = new TextInputBuilder()
        .setCustomId('txtSelmOptionLabel')
        .setLabel('Título de la opción')
        .setPlaceholder(`Opción ${(selectmenu.data.options?.length || 0) + 1}`)
        .setMinLength(3)
        .setValue(`${option.label}`)
        .setRequired(false)
        .setStyle(TextInputStyle.Short)

    const txtDesc = new TextInputBuilder()
        .setCustomId('txtSelmOptionDesc')
        .setLabel('Descripción de la opción')
        .setPlaceholder('Escribe tu descripción')
        .setMinLength(3)
        .setMaxLength(1000)
        .setRequired(false)
        .setStyle(TextInputStyle.Paragraph)
    if (option.description) txtDesc.setValue(option.description)

    const txtReply = new TextInputBuilder()
        .setCustomId('txtSelmOptionReply')
        .setLabel('Respuesta cuando se seleccione la opción')
        .setPlaceholder(`Se te ha colocado el rol @cumpleaños {addrole:@cumpleaños}`)
        .setRequired(false)
        .setStyle(TextInputStyle.Paragraph)
    if (goption.reply) txtReply.setValue(goption.reply.rawreply)

    const modalEditOption = new ModalBuilder()
        .setCustomId(`mdlEditSelmOption_${selectmenu.customId}::${encodeURIComponent(option.value)}`)
        .setTitle(`Datos de opción ${option?.label}`)
        .setComponents([
            new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(txtEmoji),
            new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(txtLabel),
            new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(txtDesc),
            new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(txtReply)
        ])

    selectInteraction.showModal(modalEditOption)
}

export default selmEditOption
