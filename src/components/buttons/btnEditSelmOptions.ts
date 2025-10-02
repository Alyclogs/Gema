import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuComponent } from "discord.js"
import { GButton } from "../../models/gema-models"

const btnEditSelmOptions = new GButton()
btnEditSelmOptions.customId = 'btnEditSelmOptions'
btnEditSelmOptions.data.label = 'Editar opciones'
btnEditSelmOptions.data.emoji = '<:edit:1151582653867376761>'
btnEditSelmOptions.data.style = 2
btnEditSelmOptions.run = async ({ interaction, emojis }) => {
    const selectmenu = interaction.message.components[0].components[0] as StringSelectMenuComponent

    if (selectmenu.data.options.length == 1 && selectmenu.data.options[0].label === "Opción de ejemplo") {
        return await interaction.reply(`${emojis.confused} Este menú de selección no tiene opciones. Añade algunas con </selectmenu add-option:1137889596160614465>`)
    }
    const selmToEdit = new StringSelectMenuBuilder()
        .setCustomId(`editing_${selectmenu.customId}`)
        .setMinValues(selectmenu.data.min_values || 1)
        .setMaxValues(selectmenu.data.max_values || 1)
        .setPlaceholder(selectmenu.data.placeholder || "Seleccione una opción")
        .setOptions(selectmenu.data.options)

    await interaction.deferUpdate()
    await interaction.editReply({
        content: `🔧 Editando menú de selección **${selectmenu.customId.substring(selectmenu.customId.indexOf('#') + 1)}**
                \nSelecciona la opción que deseas editar`,
        components: [new ActionRowBuilder<StringSelectMenuBuilder>().setComponents([selmToEdit])]
    })
}

export default btnEditSelmOptions