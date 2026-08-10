import { EmbedBuilder } from 'discord.js'
import { Permissions } from '../../../lib/Permissions';
import nsfw from '../../../lib/actions'
import { Command } from '../../../structures/Command';
import { fetchNsfwMedia } from '../../../util/moderation/nsfwMedia';

export default new Command({
    name: 'fuck',
    description: 'Comando de roleplay, se debe mencionar a un miembro',
    uso: '',
    aliases: [],
    nsfw: true,
    timeout: 0,
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ client, message, args, prefix, emojis, color }) {
        let replied;
        if (message.type === 19) replied = await message.fetchReference()
        const user = message.mentions.members?.first() || replied?.author || message.guild?.members.cache
            .find(m => m.id === args[0] || m.displayName.startsWith(args[0]) || m.user.tag.startsWith(args[0]))
        if (user) {
            if (user.id === client.user?.id)
                return message.reply(`${emojis.blush} Hey! No quiero gracias ><`)
            if (user.id === message.author.id)
                return message.reply(`${emojis.hmph} No puedes hacer eso`)

            const media = fetchNsfwMedia(nsfw.fuck)
            if (!media) return message.reply(`${emojis.error} No pude cargar una imagen, intenta de nuevo`)

            let embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(`**${message.member?.displayName}** le da amor a **${user.displayName}** ${emojis.drool} ❤️`)
                .setImage(media.url)
                .setTimestamp()
            return await message.reply({ embeds: [embed] })
        } else {
            return message.reply(`${emojis.confused} Necesitas mencionar a alguien`)
        }
    }
})
