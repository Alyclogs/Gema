import { StringSelectMenuInteraction } from 'discord.js'
import Bot from '../structures/Bot'
import { selectmenuModel } from '../models/gema-models'
import ExtendedInteraction from '../typing/ExtendedInteraction'

/** Maneja un selectmenu creado por un servidor con `/selectmenu create` (customId `arselm#<nombre>`). */
export async function dispatchUserSelectMenu(client: Bot, interaction: StringSelectMenuInteraction) {
    client.selectmenus = await selectmenuModel.find({}).exec()
    const selectmenu = client.selectmenus.find(s => s.guildId === interaction.guildId && s.customId === interaction.customId)

    if (!selectmenu) return

    const selectedValues = interaction.values ?? []
    const options = selectmenu.data?.options ?? []
    const extendedInteraction = interaction as unknown as ExtendedInteraction

    if (selectmenu.reply) {
        if (selectmenu.ephemeral) {
            await interaction.deferReply({ ephemeral: true })
            await client.functions.executeReply(selectmenu.reply, extendedInteraction).catch(async (e: Error) => await extendedInteraction.channel.send(`${client.emotes.error} ${e}`))
        } else {
            await interaction.deferReply()
            await client.functions.executeReply(selectmenu.reply, extendedInteraction).catch(async (e: Error) => await extendedInteraction.channel.send(`${client.emotes.error} ${e}`))
        }
    } else {
        const optionReplies = selectedValues
            .map((value) => options.find((option) => option.value === value && option.reply))
            .filter((option): option is NonNullable<typeof option> => Boolean(option))

        if (optionReplies.length > 0) {
            for (const option of optionReplies) {
                if (option.reply) {
                    await interaction.deferReply()
                    await client.functions.executeReply(option.reply, extendedInteraction).catch(async (e: Error) => await extendedInteraction.channel.send(`${client.emotes.error} ${e}`))
                }
            }
        } else {
            await interaction.deferUpdate()
        }
    }
}
