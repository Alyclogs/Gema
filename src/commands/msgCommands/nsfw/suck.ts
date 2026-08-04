import { EmbedBuilder } from 'discord.js'
import { Permissions } from '../../../lib/Permissions';
import nsfw from '../../../lib/actions'
import { Command } from '../../../structures/Command';

export default new Command({
    name: 'suck',
    description: 'Comando de roleplay',
    aliases: [],
    nsfw: true,
    uso: '',
    timeout: 0,
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ client, message, args, prefix, emojis, color }) {
        let replied;
        let pic = nsfw.getSuckImage()
        if (message.type === 19) replied = await message.fetchReference()
        const user = message.mentions.members?.first() || replied?.author || message.guild?.members.cache
            .find(m => m.id === args[0] || m.displayName.startsWith(args[0]) || m.user.tag.startsWith(args[0]))
        if (user) {
            let embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(`**${message.member?.displayName}** succiona el pene de **${user.displayName}** :3`)
                .setImage(pic)
                .setTimestamp()
            if (user.id === client.user?.id) {
                return message.reply(`${emojis.blush} Hey! No quiero gracias ><`)
            }
            if (user.id === message.author.id) {
                return message.reply(`${emojis.hmph} No puedes hacer eso`)
            }
            return await message.reply({
                embeds: [embed]
            })
        } else {
            return message.reply(`${emojis.confused} Necesitas mencionar a alguien`)
        }
    }
})
