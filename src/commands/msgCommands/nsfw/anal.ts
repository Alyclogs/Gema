import { EmbedBuilder } from 'discord.js'
import { Permissions } from '../../../util/Permissions';
import nsfw from '../../../util/actions'
import { Command } from '../../../structures/Command';

export default new Command({
    name: 'anal',
    description: 'Dale amor a alguien por atrás en roleplay',
    uso: '',
    aliases: [],
    nsfw: true,
    timeout: 0,
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ client, message, args, emojis, color }) {
        let replied;
        let pic = nsfw.getAnalImage()
        if (message.type === 19) replied = await message.fetchReference()
        const user = message.mentions.members?.first() || replied?.author || message.guild?.members.cache
            .find(m => m.id === args[0] || m.displayName.startsWith(args[0]) || m.user.tag.startsWith(args[0]))
        if (user) {
            let embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(`**${message.member?.displayName}** le da por atrás a **${user.displayName}** nn`)
                .setImage(pic)
                .setTimestamp()
            if (user.id === client.user?.id)
                return message.reply(`${emojis.blush} Hey! No quiero gracias ><`)
            if (user.id === message.author.id)
                return message.reply(`${emojis.hmph} No puedes hacer eso`)
            return await message.reply({
                embeds: [embed]
            })
        } else {
            return message.reply(`${emojis.confused} Necesitas mencionar a alguien`)
        }
    }
})
