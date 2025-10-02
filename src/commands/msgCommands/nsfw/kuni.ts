import { EmbedBuilder } from 'discord.js'
import { Permissions } from '../../../util/Permissions';
import nsfw from '../../../util/actions'
import { Command } from '../../../structures/Command';

export default new Command({
    name: 'kuni',
    description: 'Comando de roleplay',
    uso: '',
    aliases: [],
    timeout: 0,
    memberperms: [],
    botperms: [Permissions.verCanal, Permissions.enviarMensajes, Permissions.insertarEnlaces],

    async run({ client, message, args, prefix, emojis, color }) {
        if (message.channel.isDMBased() || message.channel.isThread()) {
            return message.reply(`${emojis.confused} Este comando no puede utilizarse en este tipo de canal`)
        }

        if (!message.channel.nsfw) {
            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(color)
                        .setTitle(`${emojis.sweat} Comando NSFW`)
                        .setDescription(`Para ejecutar este comando, el canal debe permitir contenido NSFW`)
                ],
                allowedMentions: { repliedUser: false }
            })
        }
        let replied;
        if (message.type === 19) replied = await message.fetchReference()
        const user = message.mentions.members?.first() || replied?.author || message.guild?.members.cache
            .find(m => m.id === args[0] || m.displayName.startsWith(args[0]) || m.user.tag.startsWith(args[0]))
        if (user) {
            let pic = nsfw.getKuniImage()
            let embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(`**${message.member?.displayName}** lame el coño de **${user.displayName}** u///u`)
                .setImage(pic)
                .setTimestamp()
            if (user.id === client.user?.id)
                return message.channel.send(`${emojis.blush} Hey! No quiero gracias ><`)
            if (user.id === message.author.id)
                return message.channel.send(`${emojis.hmph} No puedes hacer eso`)
            return await message.channel.send({
                embeds: [embed]
            })
        } else {
            return message.channel.send(`${emojis.confused} Necesitas mencionar a alguien`)
        }
    }
})