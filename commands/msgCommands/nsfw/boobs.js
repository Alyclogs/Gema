const { Message, EmbedBuilder, Client } = require('discord.js')
const { Permissions2 } = require('../../../utility/validation/Permissions');
const { nsfw } = require('../../../utility/data/actions')

module.exports = {
    name: 'boobs',
    description: 'Muestra un gif aleatorio de pechos femeninos',
    uso: '',
    aliases: [],
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes, Permissions2.insertarEnlaces],

    /**
     * @param {Client} client
     * @param {Message} message 
     */
    async execute(client, message, args, prefix, emojis, color) {
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
        let pic = nsfw.getBoobsImage()
        let embed = new EmbedBuilder()
            .setColor(color)
            .setDescription(`Lindas boobies (●ˇ∀ˇ●)✨`)
            .setImage(pic)
            .setTimestamp()
        return await message.channel.send({
            embeds: [embed]
        })
    }
}