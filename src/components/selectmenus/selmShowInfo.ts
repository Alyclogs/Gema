import { StringSelectMenuInteraction } from 'discord.js'
import { GSelectMenu, selectmenuModel } from '../../models/gema-models'
import { buildSelectMenuInfoEmbed } from '../../util/selectMenuEmbeds'

// customId dinámico: `info_<customId del selectmenu>` (ver selectmenu.ts), resuelto por prefijo
const selmShowInfo = new GSelectMenu()
selmShowInfo.customId = 'info_'
selmShowInfo.prefix = true

selmShowInfo.run = async ({ client, interaction, params }) => {
    const selectInteraction = interaction as StringSelectMenuInteraction

    client.selectmenus = await selectmenuModel.find({}).exec()
    const selectmenu = client.selectmenus.find(s => s.guildId === selectInteraction.guildId && s.customId === params)
    if (!selectmenu) return

    const selectedOption = selectmenu.data?.options?.find(o => o.value === selectInteraction.values[0])

    await selectInteraction.deferUpdate()
    await selectInteraction.message.edit({
        embeds: [buildSelectMenuInfoEmbed(client, selectInteraction.guild, selectmenu, 'option', selectedOption)],
        components: selectInteraction.message.components
    })
}

export default selmShowInfo
