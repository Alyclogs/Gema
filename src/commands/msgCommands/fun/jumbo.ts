import { EmbedBuilder } from "discord.js"
import { Command } from "../../../structures/Command"

export default new Command({
    name: "jumbo",
    aliases: ["emoji", "emote"],
    uso: "gema jumbo <emoji>",
    description: "Muestra un emoji personalizado en formato imagen",
    run: async ({ client, message, args, emojis }) => {
        if (!args[0]) return message.reply({ content: `${emojis['hmph']} Debes especificar un emoji personalizado` })
        const emoji = args[0].match(/<a?:\w+:(\d+)>/)
        if (!emoji) return message.reply({ content: `${emojis['hmph']} Debes especificar un emoji personalizado` })
        const isanimated = emoji[0].startsWith('<a:')
        const emojiId = emoji[1]
        const url = isanimated ? `https://cdn.discordapp.com/emojis/${emojiId}.webp?animated=true` : `https://cdn.discordapp.com/emojis/${emojiId}.png`
        const embed = new EmbedBuilder()
            .setTitle(`${emojis.star} Emoji personalizado`)
            .setImage(url)
            .setDescription(`[Descargar](${url})`)

        return message.reply({ embeds: [embed] })
    }
})