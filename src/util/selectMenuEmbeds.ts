import { EmbedBuilder, Guild } from 'discord.js'
import Bot from '../structures/Bot'
import { GSelectMenu, GSelectMenuOption } from '../models/gema-models'

export function buildSelectMenuInfoEmbed(client: Bot, guild: Guild | null | undefined, selectmenu: GSelectMenu, mode: 'general' | 'option', option?: GSelectMenuOption) {
    const baseEmbed = new EmbedBuilder()
        .setColor(client.color)
        .setAuthor({ name: guild?.name || '', iconURL: guild?.iconURL() || undefined })

    if (mode === 'option' && option) {
        return baseEmbed
            .setTitle(`Opción de ${selectmenu.name}`)
            .setDescription(`**Etiqueta:** ${option.label}\n**Valor:** ${option.value}\n**Descripción:** ${option.description || 'Sin descripción'}\n**Emoji:** ${option.emoji || 'Sin emoji'}`)
    }

    return baseEmbed
        .setTitle(`Información de ${selectmenu.name}`)
        .setDescription(`**ID:** ${selectmenu.customId}\n**Nombre:** ${selectmenu.name}\n**Opciones:** ${selectmenu.data?.options?.length || 0}\n**Mínimo:** ${selectmenu.data?.minValues || 1}\n**Máximo:** ${selectmenu.data?.maxValues || 1}\n**Placeholder:** ${selectmenu.data?.placeholder || 'Ninguno'}\n**Ephemeral:** ${selectmenu.ephemeral ? 'Sí' : 'No'}`)
}
