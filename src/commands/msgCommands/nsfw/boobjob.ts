import { EmbedBuilder } from 'discord.js'
import { Permissions } from '../../../lib/Permissions';
import nsfw from '../../../lib/actions'
import { Command } from '../../../structures/Command';
import { fetchNsfwMedia } from '../../../helpers/media/nsfwMedia';

export default new Command({
    name: 'boobjob',
    description: 'Usa los pechos para complacer a alguien en roleplay',
    uso: '',
    aliases: [],
    nsfw: true,
    cooldown: 0,
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ client, message, args, emojis, color }) {
        let replied;
        if (message.type === 19) replied = await message.fetchReference()
        const user = message.mentions.members?.first() || replied?.author || message.guild?.members.cache
            .find(m => m.id === args[0] || m.displayName.startsWith(args[0]) || m.user.tag.startsWith(args[0]))
        if (user) {
            if (user.id === client.user?.id)
                return message.reply(`${emojis.blush} Hey! No quiero gracias ><`)
            if (user.id === message.author.id)
                return message.reply(`${emojis.hmph} No puedes hacer eso`)

            const media = await fetchNsfwMedia(nsfw.boobjob)
            if (!media) return message.reply(`${emojis.error} No pude cargar una imagen, intenta de nuevo`)

            const descriptions = [
                `**${message.member?.displayName}** usa sus pechos para complacer a **${user.displayName}**`,
                `**${message.member?.displayName}** envuelve el miembro de **${user.displayName}** entre sus pechos`,
                `**${message.member?.displayName}** le hace una paja con los pechos a **${user.displayName}**`
            ]

            let embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(descriptions[Math.floor(Math.random() * descriptions.length)])
                .setImage(media.url)
                .setTimestamp()
            return await message.reply({
                embeds: [embed],
                files: [media.attachment]
            })
        } else {
            return message.reply(`${emojis.confused} Necesitas mencionar a alguien`)
        }
    }
})
