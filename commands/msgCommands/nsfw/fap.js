const { Message, EmbedBuilder, Client } = require('discord.js')
const { Permissions2 } = require('../../../utility/validation/Permissions');
const { nsfw } = require('../../../utility/data/actions')

module.exports = {
    name: 'fap',
    description: 'Date amor a tí mismo o a alguien más en roleplay',
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
        let replied;        
        if (message.type === 19) replied = await message.fetchReference()
        const user = message.mentions.members.first() || replied?.author || message.guild.members.cache
        .find(m => m.id === args[0] || m.displayName.startsWith(args[0]) || m.user.tag.startsWith(args[0]))
        if (user) {   
            let pic = nsfw.getFapSomeone() 
            let embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(`**${message.member.displayName}** masturba a **${user.displayName}** ^^`)
                .setImage(pic)
                .setTimestamp()
            if (user.id === client.user.id)
                return message.channel.send(`${emojis.blush} Hey! No quiero gracias ><`)
            if (user.id === message.author.id)
                return message.channel.send(`${emojis.hmph} No puedes hacer eso`)
            return await message.channel.send({
                embeds: [embed]
            })
        } else {
            let pic = nsfw.getFapImage() 
            let embed = new EmbedBuilder()
                .setColor(color)
                .setDescription(`**${message.member.displayName}** se da amor ^^`)
                .setImage(pic)
                .setTimestamp()
            return await message.channel.send({
                embeds: [embed]
            })
        }
    }
}