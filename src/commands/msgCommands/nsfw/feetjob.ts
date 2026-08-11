import { EmbedBuilder } from 'discord.js'
import { Permissions } from '../../../lib/Permissions';
import nsfw from '../../../lib/actions'
import { Command } from '../../../structures/Command';
import { fetchNsfwMedia } from '../../../util/nsfw/nsfwMedia';

export default new Command({
    name: 'feetjob',
    description: 'Usa los pies para complacer a alguien en roleplay',
    uso: '',
    aliases: [],
    nsfw: true,
    timeout: 0,
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

            const media = await fetchNsfwMedia(nsfw.feetjob)
            if (!media) return message.reply(`${emojis.error} No pude cargar una imagen, intenta de nuevo`)

            const descriptions = [
                `**${message.member?.displayName}** usa sus pies para complacer a **${user.displayName}**`,
                `**${message.member?.displayName}** masajea con los pies a **${user.displayName}**`,
                `**${message.member?.displayName}** atiende a **${user.displayName}** con los pies`
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
