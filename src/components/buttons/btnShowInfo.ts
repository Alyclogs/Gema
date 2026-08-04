import { GButton } from '../../models/gema-models'
import { buildSelectMenuInfoEmbed } from '../../util/selectMenuEmbeds'

// Botón global con customId dinámico: se crea como `showInfo|<customId del selectmenu>` (ver selectmenu.ts)
// y gracias a `prefix: true` se resuelve por Bot.resolveButton sin tocar interactionCreate.ts
const btnShowInfo = new GButton({ customId: 'showInfo|', prefix: true })

btnShowInfo.run = async ({ client, interaction, params }) => {
    const selectmenu = client.selectmenus.find(s => s.guildId === interaction.guildId && s.customId === params)
    if (!selectmenu || !interaction.message) return

    await interaction.deferUpdate()
    await interaction.message.edit({
        embeds: [buildSelectMenuInfoEmbed(client, interaction.guild, selectmenu, 'general')],
        components: interaction.message.components
    })
}

export default btnShowInfo
