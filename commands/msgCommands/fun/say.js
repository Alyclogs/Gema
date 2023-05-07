const { Client, Message } = require('discord.js');
const { Permissions2 } = require('../../../utility/validation/Permissions');

module.exports = {
    name: 'say',
    description: 'Envía un mensaje con la bot',
    aliases: [],
    uso: `\`gema say <mensaje>\``,
    timeout: 0,
    memberperms: [],
    botperms: [Permissions2.verCanal, Permissions2.enviarMensajes],

    /**
     * @param {Client} client
     * @param {Message} message
     */
    async execute(client, message, args, prefix, emojis, color) {
        await message.delete()
        let saymessage = message.content.slice(prefix.length).trim().split(' ').slice(1).join(' ')
        if (!saymessage) return message.reply({ content: `${emojis.hmph} No tengo nada que decir`, allowedMentions: { repliedUser: false } })
        await message.channel.send(saymessage)
    }
}